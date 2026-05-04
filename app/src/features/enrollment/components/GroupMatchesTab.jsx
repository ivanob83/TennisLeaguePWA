import { useState } from 'react'
import { where } from 'firebase/firestore'
import { Alert, Button, Card, Input, Loader, MatchCard } from '../../../ui/index.js'
import { useFirestoreCollectionOnce } from '../../../hooks/useFirestore.js'
import { useEnrichedEnrollments } from '../../../hooks/useEnrichedEnrollments.js'
import { useAuthContext } from '../../auth/context/AuthContext.jsx'
import { scheduleMatch } from '../../matches/services/matchService.js'

function toLocalDatetimeValue(val) {
  if (!val) return ''
  const d = val?.toDate ? val.toDate() : new Date(val)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function formatScheduledAt(val) {
  if (!val) return null
  const d = val?.toDate ? val.toDate() : new Date(val)
  if (isNaN(d)) return null
  const weekday = d.toLocaleDateString('en-GB', { weekday: 'long' })
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${weekday} ${day}.${month}.${d.getFullYear()} ${hours}:${minutes}`
}

function buildCardMatch(match, enrollments, players, groupName, competitionName) {
  function playerName(id) {
    if (!id) return 'BYE'
    const en = enrollments.find(e => e.playerId === id)
    if (en?.playerName) return en.playerName
    const p = players?.find(p => p.id === id)
    return p?.name || en?.playerEmail || id
  }
  function playerAvatar(id) {
    if (!id) return {}
    const p = players?.find(p => p.id === id)
    return { avatar: p?.avatarUrl || null, avatarUrls: p?.avatarUrls || null }
  }
  const isWalkover = match.walkover || match.status === 'walkover'
  const scores = match.scores || match.sets?.map(s => ({ player1: s.p1, player2: s.p2 })) || []
  const p1Won = Boolean(match.winnerId) && match.winnerId === match.player1Id
  const p2Won = Boolean(match.winnerId) && match.winnerId === match.player2Id
  return {
    status: match.status,
    walkover: isWalkover,
    label: groupName || match.label || undefined,
    subtitle: competitionName || match.competitionName || undefined,
    scheduledAt: formatScheduledAt(match.scheduledAt),
    scheduledTimestamp: match.scheduledAt ? (match.scheduledAt?.toDate ? match.scheduledAt.toDate().getTime() : new Date(match.scheduledAt).getTime() || null) : null,
    entrants: isWalkover
      ? [
          { name: playerName(match.player1Id), isWinner: p1Won, sets: [p1Won ? 'WO' : '-'], ...playerAvatar(match.player1Id) },
          { name: playerName(match.player2Id), isWinner: p2Won, sets: [p2Won ? 'WO' : '-'], ...playerAvatar(match.player2Id) },
        ]
      : [
          { name: playerName(match.player1Id), isWinner: p1Won, sets: scores.map(s => s.player1), ...playerAvatar(match.player1Id) },
          { name: playerName(match.player2Id), isWinner: p2Won, sets: scores.map(s => s.player2), ...playerAvatar(match.player2Id) },
        ],
  }
}

// Greedy: group matches into rounds where no player appears twice.
// Uses player1Position/player2Position as player identity (stable even before draw).
function groupIntoRounds(matches) {
  const rounds = []
  for (const match of matches) {
    const p1 = match.player1Position ?? null
    const p2 = match.player2Position ?? null
    let placed = false
    for (const round of rounds) {
      const used = new Set(
        round.flatMap(m => [m.player1Position, m.player2Position]).filter(p => p != null)
      )
      if ((p1 == null || !used.has(p1)) && (p2 == null || !used.has(p2))) {
        round.push(match)
        placed = true
        break
      }
    }
    if (!placed) rounds.push([match])
  }
  return rounds
}

function MatchRow({ match, enrollments, players, competitionType, competitionId, roundId, isEditor, groupName, competitionName }) {
  const [showSchedule, setShowSchedule] = useState(false)
  const [scheduledAt, setScheduledAt] = useState(toLocalDatetimeValue(match.scheduledAt))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const isFinished = match.status === 'finished' || match.status === 'walkover' || match.walkover
  const canSchedule = isEditor && !isFinished
  const detailHref = `/${competitionType}/${competitionId}/rounds/${roundId}/matches/${match.id}`
  const cardMatch = buildCardMatch(match, enrollments, players, groupName, competitionName)

  async function handleSchedule(e) {
    e.preventDefault()
    if (!scheduledAt) { setError('Select a date and time.'); return }
    setSaving(true)
    setError(null)
    try {
      await scheduleMatch(competitionType, competitionId, roundId, match.id, scheduledAt)
      setShowSchedule(false)
    } catch {
      setError('Failed to save schedule.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-2">
      <MatchCard
        match={cardMatch}
        onAction={canSchedule ? () => setShowSchedule(s => !s) : undefined}
        actionLabel={canSchedule ? (showSchedule ? 'Cancel' : match.scheduledAt ? 'Reschedule' : 'Schedule') : undefined}
        detailHref={detailHref}
      />
      {showSchedule && (
        <form onSubmit={handleSchedule} className="flex items-end gap-2 rounded border border-slate-200 bg-background-light px-3 py-2">
          {error && <Alert variant="error" className="mb-1 text-xs">{error}</Alert>}
          <div className="flex-1">
            <Input
              type="datetime-local"
              value={scheduledAt}
              onChange={e => setScheduledAt(e.target.value)}
            />
          </div>
          <Button type="submit" size="sm" loading={saving} loadingLabel="Saving...">
            Save
          </Button>
        </form>
      )}
    </div>
  )
}

function GroupRoundView({ competitionType, competitionId, roundId, enrollments, players, isEditor, groupName, competitionName }) {
  const matchesPath = `${competitionType}/${competitionId}/rounds/${roundId}/matches`
  const { data: matches, loading } = useFirestoreCollectionOnce(matchesPath)

  if (loading) return <p className="py-2 text-sm text-text-light">Loading matches...</p>
  if (!matches.length) return <p className="py-2 text-sm text-text-light">No match slots yet.</p>

  const displayRounds = groupIntoRounds(matches)

  return (
    <div className="space-y-8">
      {displayRounds.map((roundMatches, i) => (
        <div key={i}>
          <h4 className="mb-3 font-heading text-sm font-semibold text-text">Round {i + 1}</h4>
          <div className="grid gap-4 lg:grid-cols-2">
            {roundMatches.map(match => (
              <MatchRow
                key={match.id}
                match={match}
                enrollments={enrollments}
                players={players}
                competitionType={competitionType}
                competitionId={competitionId}
                roundId={roundId}
                isEditor={isEditor}
                groupName={groupName}
                competitionName={competitionName}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function GroupMatchesTab({ competitionType, competitionId, competitionName }) {
  const { isEditor } = useAuthContext()
  const roundsPath = `${competitionType}/${competitionId}/rounds`
  const groupsPath = `${competitionType}/${competitionId}/groups`
  const { data: rounds, loading: roundsLoading } = useFirestoreCollectionOnce(roundsPath, [
    where('type', '==', 'round_robin'),
  ])
  const { data: groups, loading: groupsLoading } = useFirestoreCollectionOnce(groupsPath)
  const { data: enrollments } = useEnrichedEnrollments(competitionType, competitionId)
  const { data: players } = useFirestoreCollectionOnce('players')
  const [activeGroupIdx, setActiveGroupIdx] = useState(0)

  if (roundsLoading || groupsLoading) {
    return <div className="flex justify-center py-10"><Loader /></div>
  }

  if (!rounds.length) {
    return (
      <Card>
        <p className="text-sm text-text-light">
          No group match slots found. Match slots are created automatically when a competition is set up.
        </p>
      </Card>
    )
  }

  // Group rounds by groupId
  const groupMap = new Map()
  ;[...rounds]
    .sort((a, b) => (a.roundNumber || 0) - (b.roundNumber || 0))
    .forEach(r => {
      const key = r.groupId || '__ungrouped__'
      if (!groupMap.has(key)) groupMap.set(key, [])
      groupMap.get(key).push(r)
    })

  const groupEntries = [...groupMap.entries()]
  const showTabs = groupEntries.length > 1
  const activeIdx = Math.min(activeGroupIdx, groupEntries.length - 1)
  const [activeGroupId, activeRounds] = groupEntries[activeIdx]

  function tabLabel(groupId, idx) {
    if (groupId === '__ungrouped__') return `Group ${String.fromCharCode(65 + idx)}`
    const g = groups.find(g => g.id === groupId)
    return g?.name || `Group ${String.fromCharCode(65 + idx)}`
  }

  return (
    <div>
      {showTabs && (
        <div className="mb-6 border-b border-slate-200">
          <div className="flex flex-wrap gap-1">
            {groupEntries.map(([groupId], idx) => (
              <button
                key={groupId}
                type="button"
                onClick={() => setActiveGroupIdx(idx)}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeIdx === idx
                    ? 'border-b-2 border-secondary text-secondary'
                    : 'text-text-light hover:text-text'
                }`}
              >
                {tabLabel(groupId, idx)}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="space-y-8">
        {activeRounds.map(round => (
          <GroupRoundView
            key={round.id}
            competitionType={competitionType}
            competitionId={competitionId}
            roundId={round.id}
            enrollments={enrollments}
            players={players}
            isEditor={isEditor}
            groupName={tabLabel(activeGroupId, activeIdx)}
            competitionName={competitionName}
          />
        ))}
      </div>
    </div>
  )
}
