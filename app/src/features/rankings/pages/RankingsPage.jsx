import { useState, useEffect, useRef } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { enrichPlayersWithUserNames } from '../../../infrastructure/enrichPlayers.js'
import AppLayout from '../../../layouts/AppLayout.jsx'
import {
  Container,
  SectionTitle,
  Card,
  Badge,
  Loader,
  Select,
  Button,
} from '../../../ui/index.js'
import { useFirestoreCollection } from '../../../hooks/useFirestore.js'
import Avatar from '../../../ui/Avatar.jsx'
import { useAuthContext } from '../../auth/context/AuthContext.jsx'
import { useToast } from '../../../context/ToastContext.jsx'
import { tournamentEnrollmentRepository, leagueEnrollmentRepository } from '../../../infrastructure/firestore.js'
import { recalculateRankings } from '../services/rankingService.js'
import { db } from '../../../infrastructure/firebase.js'
import TopPlayerCard from '../components/TopPlayerCard.jsx'
import { useAllTimeTopPlayer } from '../hooks/useAllTimeTopPlayer.js'

function RankingRows({ sorted, playersById }) {
  return sorted.map((entry, idx) => {
    const player = playersById?.[entry.playerId]
    const displayName = player?.name || entry.playerName
    return (
    <tr
      key={entry.playerId ?? entry.playerName}
      className="border-b border-slate-100 last:border-0 hover:bg-background-light"
    >
      <td className="py-2.5 pr-4">
        {idx === 0 ? (
          <span className="font-bold text-secondary">1</span>
        ) : (
          <span className="text-text-light">{idx + 1}</span>
        )}
      </td>
      <td className="py-2.5 pr-4">
        <div className="flex items-center gap-2">
          <Avatar
            urls={player?.avatarUrls || null}
            src={player?.avatarUrl || null}
            name={displayName}
            sizeHint={80}
            className="h-7 w-7 text-xs"
          />
          <span className="font-medium text-text">
            {displayName}
            {idx === 0 && entry.matchesPlayed > 0 && (
              <Badge variant="finished" className="ml-2">Leader</Badge>
            )}
          </span>
        </div>
      </td>
      <td className="py-2.5 pr-4 text-center text-text-light">{entry.matchesPlayed}</td>
      <td className="py-2.5 pr-4 text-center font-semibold text-primary">{entry.wins}</td>
      <td className="py-2.5 pr-4 text-center text-text-light">{entry.losses}</td>
      <td className="py-2.5 pr-4 text-center text-text-light">
        {entry.setsWon}/{entry.setsLost}
      </td>
      <td className="py-2.5 text-center font-bold text-secondary">{entry.points ?? 0}</td>
    </tr>
    )
  })
}

function mergeRankings(rankings) {
  // First pass: merge by playerId (duplicate Firestore docs for same player)
  const byId = {}
  for (const entry of rankings) {
    const pid = entry.playerId
    if (!pid) continue
    if (!byId[pid]) {
      byId[pid] = { ...entry }
    } else {
      byId[pid].points = (byId[pid].points ?? 0) + (entry.points ?? 0)
      byId[pid].wins = (byId[pid].wins ?? 0) + (entry.wins ?? 0)
      byId[pid].losses = (byId[pid].losses ?? 0) + (entry.losses ?? 0)
      byId[pid].matchesPlayed = (byId[pid].matchesPlayed ?? 0) + (entry.matchesPlayed ?? 0)
      byId[pid].setsWon = (byId[pid].setsWon ?? 0) + (entry.setsWon ?? 0)
      byId[pid].setsLost = (byId[pid].setsLost ?? 0) + (entry.setsLost ?? 0)
    }
  }

  // Second pass: merge by normalized playerName (same person enrolled with different playerIds)
  const byName = {}
  for (const entry of Object.values(byId)) {
    const key = (entry.playerName ?? '').trim().toLowerCase()
    if (!key) continue
    if (!byName[key]) {
      byName[key] = { ...entry }
    } else {
      byName[key].points = (byName[key].points ?? 0) + (entry.points ?? 0)
      byName[key].wins = (byName[key].wins ?? 0) + (entry.wins ?? 0)
      byName[key].losses = (byName[key].losses ?? 0) + (entry.losses ?? 0)
      byName[key].matchesPlayed = (byName[key].matchesPlayed ?? 0) + (entry.matchesPlayed ?? 0)
      byName[key].setsWon = (byName[key].setsWon ?? 0) + (entry.setsWon ?? 0)
      byName[key].setsLost = (byName[key].setsLost ?? 0) + (entry.setsLost ?? 0)
    }
  }

  return Object.values(byName).map(entry => ({
    ...entry,
    winRate: entry.matchesPlayed > 0 ? Math.round((entry.wins / entry.matchesPlayed) * 100) : 0,
  }))
}

function sortRankings(rankings) {
  return [...rankings].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    if (b.wins !== a.wins) return b.wins - a.wins
    if (b.winRate !== a.winRate) return b.winRate - a.winRate
    return b.setsWon - a.setsWon
  })
}

function AllTimeRankingTable({ leagues, tournaments, listsLoading, playersById }) {
  const [rankings, setRankings] = useState([])
  const [loading, setLoading] = useState(true)

  const leagueIds = leagues.map(l => l.id).join(',')
  const tournamentIds = tournaments.map(t => t.id).join(',')

  useEffect(() => {
    if (listsLoading) return

    async function fetchAll() {
      setLoading(true)
      const allCompetitions = [
        ...leagues.map(c => ({ type: 'leagues', id: c.id })),
        ...tournaments.map(c => ({ type: 'tournaments', id: c.id })),
      ]

      const aggregated = {}

      for (const comp of allCompetitions) {
        const snapshot = await getDocs(collection(db, `${comp.type}/${comp.id}/rankings`))
        for (const docSnap of snapshot.docs) {
          const { playerId, playerName, points = 0, wins = 0, losses = 0, matchesPlayed = 0, setsWon = 0, setsLost = 0 } = docSnap.data()
          if (!playerId) continue
          if (!aggregated[playerId]) {
            aggregated[playerId] = { playerId, playerName, points: 0, wins: 0, losses: 0, matchesPlayed: 0, setsWon: 0, setsLost: 0 }
          }
          aggregated[playerId].points += points
          aggregated[playerId].wins += wins
          aggregated[playerId].losses += losses
          aggregated[playerId].matchesPlayed += matchesPlayed
          aggregated[playerId].setsWon += setsWon
          aggregated[playerId].setsLost += setsLost
        }
      }

      setRankings(Object.values(aggregated))
      setLoading(false)
    }

    fetchAll()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leagueIds, tournamentIds, listsLoading])

  if (loading) return <div className="flex justify-center py-8"><Loader /></div>

  if (!rankings.length) {
    return (
      <Card>
        <p className="text-sm text-text-light">No rankings yet. Rankings are calculated automatically when matches are approved.</p>
      </Card>
    )
  }

  const sorted = sortRankings(mergeRankings(rankings))

  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-text-light">
              <th className="py-2 pr-4">#</th>
              <th className="py-2 pr-4">Player</th>
              <th className="py-2 pr-4 text-center">MP</th>
              <th className="py-2 pr-4 text-center">W</th>
              <th className="py-2 pr-4 text-center">L</th>
              <th className="py-2 pr-4 text-center">SK</th>
              <th className="py-2 text-center">PTS</th>
            </tr>
          </thead>
          <tbody>
            <RankingRows sorted={sorted} playersById={playersById} />
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function RankingTable({ competitionType, competitionId, playersById }) {
  const rankingsPath = `${competitionType}/${competitionId}/rankings`
  const { data: rankings, loading } = useFirestoreCollection(rankingsPath)

  if (loading) return <div className="flex justify-center py-8"><Loader /></div>

  if (!rankings.length) {
    return (
      <Card>
        <p className="text-sm text-text-light">
          No rankings yet. Rankings are calculated automatically when matches are approved.
        </p>
      </Card>
    )
  }

  const sorted = sortRankings(mergeRankings(rankings))

  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-text-light">
              <th className="py-2 pr-4">#</th>
              <th className="py-2 pr-4">Player</th>
              <th className="py-2 pr-4 text-center">MP</th>
              <th className="py-2 pr-4 text-center">W</th>
              <th className="py-2 pr-4 text-center">L</th>
              <th className="py-2 pr-4 text-center">SK</th>
              <th className="py-2 text-center">PTS</th>
            </tr>
          </thead>
          <tbody>
            <RankingRows sorted={sorted} playersById={playersById} />
          </tbody>
        </table>
      </div>
    </Card>
  )
}

export default function RankingsPage() {
  const [view, setView] = useState('leagues')
  const [selectedId, setSelectedId] = useState('')
  const [recalculating, setRecalculating] = useState(false)
  const { isEditor } = useAuthContext()
  const { showToast } = useToast()

  const { data: leagues, loading: leaguesLoading } = useFirestoreCollection('leagues')
  const { data: tournaments, loading: tournamentsLoading } = useFirestoreCollection('tournaments')
  const { data: seasons, loading: seasonsLoading } = useFirestoreCollection('seasons')

  useEffect(() => {
    if (leaguesLoading || seasonsLoading || !leagues.length || selectedId) return
    const seasonStartById = Object.fromEntries(
      seasons.map(s => [s.id, s.startDate ? new Date(s.startDate) : new Date(0)])
    )
    const best = [...leagues].sort((a, b) => {
      const ta = seasonStartById[a.seasonId] ?? new Date(0)
      const tb = seasonStartById[b.seasonId] ?? new Date(0)
      if (tb - ta !== 0) return tb - ta
      const ca = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0)
      const cb = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0)
      return cb - ca
    })[0]
    if (best) setSelectedId(best.id)
  }, [leaguesLoading, seasonsLoading, leagues, seasons, selectedId])
  const { data: players } = useFirestoreCollection('players')
  const { topEntry: alltimeTop, topPlayer: alltimeTopPlayer } = useAllTimeTopPlayer()

  const [playersById, setPlayersById] = useState({})
  const enrichedKeyRef = useRef('')
  useEffect(() => {
    if (!players.length) return
    const key = players.map(p => p.id).sort().join(',')
    if (key === enrichedKeyRef.current) return
    enrichedKeyRef.current = key
    enrichPlayersWithUserNames(players).then(setPlayersById)
  }, [players])

  const rankingsPath = view !== 'alltime' && selectedId ? `${view}/${selectedId}/rankings` : ''
  const { data: competitionRankings } = useFirestoreCollection(rankingsPath)

  const competitionTop = rankingsPath
    ? sortRankings(mergeRankings(competitionRankings))[0] ?? null
    : null
  const competitionTopPlayer = competitionTop
    ? playersById[competitionTop.playerId] ?? null
    : null

  const topEntry = view === 'alltime' ? alltimeTop : competitionTop
  const topPlayer = view === 'alltime' ? alltimeTopPlayer : competitionTopPlayer

  async function handleRecalculate() {
    setRecalculating(true)
    try {
      const enrollRepo = view === 'tournaments'
        ? tournamentEnrollmentRepository(selectedId)
        : leagueEnrollmentRepository(selectedId)
      const enrollments = await enrollRepo.getAll()
      await recalculateRankings(view, selectedId, enrollments)
      showToast({ title: 'Rankings updated', message: 'Recalculated successfully.', variant: 'success' })
    } catch (err) {
      showToast({ title: 'Failed', message: err.message, variant: 'error' })
    } finally {
      setRecalculating(false)
    }
  }

  const typeOptions = [
    { value: 'alltime', label: 'All Time' },
    { value: 'leagues', label: 'Leagues' },
    { value: 'tournaments', label: 'Tournaments' },
  ]

  const competitions = view === 'leagues' ? leagues : tournaments
  const competitionsLoading = view === 'leagues' ? leaguesLoading : tournamentsLoading
  const competitionOptions = competitions.map(c => ({ value: c.id, label: c.name }))
  const topLabel = view === 'alltime'
    ? 'All-time ranking'
    : competitions.find(c => c.id === selectedId)?.name ?? 'Competition ranking'

  function handleViewChange(e) {
    setView(e.target.value)
    setSelectedId('')
  }

  const listsLoading = leaguesLoading || tournamentsLoading

  return (
    <AppLayout>
      <Container className="py-8">
        <SectionTitle
          title="Rankings"
          subtitle="Current standings per competition"
        />

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <div className="w-44">
            <Select
              options={typeOptions}
              value={view}
              onChange={handleViewChange}
            />
          </div>
          {view !== 'alltime' && (
            <div className="w-64">
              {competitionsLoading ? (
                <p className="text-sm text-text-light">Loading...</p>
              ) : (
                <Select
                  placeholder="Select competition"
                  options={competitionOptions}
                  value={selectedId}
                  onChange={e => setSelectedId(e.target.value)}
                />
              )}
            </div>
          )}
          {isEditor && view !== 'alltime' && selectedId && (
            <Button
              size="sm"
              variant="ghost"
              loading={recalculating}
              loadingLabel="Recalculating..."
              onClick={handleRecalculate}
            >
              Recalculate Rankings
            </Button>
          )}
        </div>

        {topEntry && (
          <div className="mt-8">
            <TopPlayerCard entry={topEntry} player={topPlayer} rank={1} label={topLabel} />
          </div>
        )}

        <div className="mt-6">
          {view === 'alltime' ? (
            <AllTimeRankingTable leagues={leagues} tournaments={tournaments} listsLoading={listsLoading} playersById={playersById} />
          ) : !selectedId ? (
            <Card>
              <p className="text-sm text-text-light">Select a competition to view rankings.</p>
            </Card>
          ) : (
            <RankingTable competitionType={view} competitionId={selectedId} playersById={playersById} />
          )}
        </div>
      </Container>
    </AppLayout>
  )
}
