import { where } from 'firebase/firestore'
import { Card, Loader } from '../../../ui/index.js'
import { useFirestoreCollectionOnce } from '../../../hooks/useFirestore.js'
import { useEnrichedEnrollments } from '../../../hooks/useEnrichedEnrollments.js'

// Some competitions have group.playerIds pointing to old (deleted/merged) player IDs.
// This resolves old IDs to current player IDs using enrollment playerName → players name match.
function resolvePlayerIds(playerIds, enrollments, players) {
  if (!players?.length) return playerIds
  const nameToPlayerId = {}
  for (const p of players) {
    const key = (p.name || '').trim().toLowerCase()
    if (key) nameToPlayerId[key] = p.id
  }
  const validIds = new Set(players.map((p) => p.id))
  return playerIds.map((oldId) => {
    if (!oldId || validIds.has(oldId)) return oldId
    const en = enrollments.find((e) => e.playerId === oldId)
    if (!en?.playerName) return oldId
    const resolved = nameToPlayerId[en.playerName.trim().toLowerCase()]
    return resolved || oldId
  })
}

function computeStandings(matches, playerIds, pointsPerWin = 3, pointsPerLoss = 1) {
  const stats = {}
  for (const pid of playerIds) {
    if (pid) stats[pid] = { playerId: pid, wins: 0, losses: 0, setsWon: 0, setsLost: 0 }
  }

  for (const m of matches) {
    if (m.status !== 'finished' && m.status !== 'walkover') continue
    if (!m.player1Id || !m.player2Id || !m.winnerId) continue

    const winner = m.winnerId
    const loser = winner === m.player1Id ? m.player2Id : m.player1Id

    if (stats[winner]) stats[winner].wins++
    if (stats[loser]) stats[loser].losses++

    for (const set of m.scores || []) {
      if (stats[m.player1Id]) {
        stats[m.player1Id].setsWon += set.player1
        stats[m.player1Id].setsLost += set.player2
      }
      if (stats[m.player2Id]) {
        stats[m.player2Id].setsWon += set.player2
        stats[m.player2Id].setsLost += set.player1
      }
    }
  }

  return Object.values(stats)
    .map((s) => {
      const setsTotal = s.setsWon + s.setsLost
      return {
        ...s,
        points: s.wins * pointsPerWin + s.losses * pointsPerLoss,
        setsDiff: s.setsWon - s.setsLost,
        setRatio: setsTotal > 0 ? s.setsWon / setsTotal : 0,
      }
    })
    .sort(
      (a, b) =>
        b.points - a.points || b.setRatio - a.setRatio || b.wins - a.wins || b.setsWon - a.setsWon,
    )
}

function GroupStandingCard({
  group,
  roundId,
  enrollments,
  players,
  pointsPerWin,
  pointsPerLoss,
  promotionCount,
  relegationCount,
  isFirstGroup,
  isLastGroup,
  competitionType,
  competitionId,
}) {
  const matchesPath = `${competitionType}/${competitionId}/rounds/${roundId}/matches`
  const { data: matches, loading } = useFirestoreCollectionOnce(matchesPath)

  function playerName(id) {
    const en = enrollments.find((e) => e.playerId === id)
    if (en?.playerName) return en.playerName
    const p = players?.find((p) => p.id === id)
    return p?.name || en?.playerEmail || id
  }

  const resolvedIds = loading ? [] : resolvePlayerIds(group.playerIds || [], enrollments, players)
  const standings = loading
    ? []
    : computeStandings(matches, resolvedIds, pointsPerWin, pointsPerLoss)
  const total = standings.length
  const promo = promotionCount ?? 0
  const relego = relegationCount ?? 0

  function rowIndicator(i) {
    if (!isFirstGroup && promo > 0 && i < promo)
      return <span className="text-green-500 font-bold mr-1">↑</span>
    if (!isLastGroup && relego > 0 && i >= total - relego)
      return <span className="text-rose-500 font-bold mr-1">↓</span>
    return null
  }

  const multiplierLabel =
    group.rankingMultiplier != null && group.rankingMultiplier !== 1
      ? `${Math.round(group.rankingMultiplier * 100)}% ranking`
      : null

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h4 className="font-heading text-sm font-semibold text-text">{group.name}</h4>
        {multiplierLabel && (
          <span className="text-xs text-text-light bg-slate-100 px-2 py-0.5 rounded-full">
            {multiplierLabel}
          </span>
        )}
      </div>
      {loading ? (
        <Loader />
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-xs text-text-light">
              <th className="pb-2 text-left w-6">#</th>
              <th className="pb-2 text-left">Player</th>
              <th className="pb-2 text-center w-8">W</th>
              <th className="pb-2 text-center w-8">L</th>
              <th className="pb-2 text-center w-14">Sets</th>
              <th className="pb-2 text-center w-10 font-semibold">Pts</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((s, i) => (
              <tr
                key={s.playerId}
                className={`border-b border-slate-50 last:border-0 ${i < 2 ? '' : 'text-text-light'}`}
              >
                <td className="py-2 pr-3 text-text-light">{i + 1}</td>
                <td className={`py-2 ${i < 2 ? 'font-medium text-text' : ''}`}>
                  {rowIndicator(i)}
                  {playerName(s.playerId)}
                </td>
                <td className="py-2 text-center">{s.wins}</td>
                <td className="py-2 text-center">{s.losses}</td>
                <td className="py-2 text-center text-xs">
                  {s.setsWon}:{s.setsLost}
                </td>
                <td className="py-2 text-center font-bold text-primary">{s.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  )
}

export default function GroupStandingsTab({ competitionType, competitionId, competition }) {
  const roundsPath = `${competitionType}/${competitionId}/rounds`
  const groupsPath = `${competitionType}/${competitionId}/groups`

  const { data: rounds, loading: roundsLoading } = useFirestoreCollectionOnce(roundsPath, [
    where('type', '==', 'round_robin'),
  ])
  const { data: groups, loading: groupsLoading } = useFirestoreCollectionOnce(groupsPath)
  const { data: enrollments } = useEnrichedEnrollments(competitionType, competitionId)
  const { data: players } = useFirestoreCollectionOnce('players')

  const pointsPerWin = competition?.pointsPerWin ?? 3
  const pointsPerLoss = competition?.pointsPerLoss ?? 1
  const promotionCount = competition?.promotionCount ?? 0
  const relegationCount = competition?.relegationCount ?? 0

  if (roundsLoading || groupsLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader />
      </div>
    )
  }

  if (!groups.length) {
    return (
      <Card>
        <p className="text-sm text-text-light">No groups found.</p>
      </Card>
    )
  }

  const sortedGroups = [...groups].sort((a, b) => (a.position || 0) - (b.position || 0))
  const firstPos = sortedGroups[0]?.position
  const lastPos = sortedGroups[sortedGroups.length - 1]?.position

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {sortedGroups.map((group) => {
        const round = rounds.find((r) => r.groupId === group.id)
        if (!round) return null
        return (
          <GroupStandingCard
            key={group.id}
            group={group}
            roundId={round.id}
            enrollments={enrollments}
            players={players}
            pointsPerWin={pointsPerWin}
            pointsPerLoss={pointsPerLoss}
            promotionCount={promotionCount}
            relegationCount={relegationCount}
            isFirstGroup={group.position === firstPos}
            isLastGroup={group.position === lastPos}
            competitionType={competitionType}
            competitionId={competitionId}
          />
        )
      })}
    </div>
  )
}
