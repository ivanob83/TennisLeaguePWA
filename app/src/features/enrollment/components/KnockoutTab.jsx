import { useState } from 'react'
import { Link } from 'react-router-dom'
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

function buildCardMatch(match, enrollments) {
  function playerName(id) {
    if (!id) return 'BYE'
    const en = enrollments.find(e => e.playerId === id)
    return en?.playerName || en?.playerEmail || id
  }
  const isWalkover = match.walkover || match.status === 'walkover'
  const scores = match.scores || match.sets?.map(s => ({ player1: s.p1, player2: s.p2 })) || []
  const p1Won = Boolean(match.winnerId) && match.winnerId === match.player1Id
  const p2Won = Boolean(match.winnerId) && match.winnerId === match.player2Id
  return {
    status: match.status,
    walkover: isWalkover,
    label: match.label || undefined,
    groupName: match.groupName || undefined,
    scheduledAt: formatScheduledAt(match.scheduledAt),
    scheduledTimestamp: match.scheduledAt ? (match.scheduledAt?.toDate ? match.scheduledAt.toDate().getTime() : new Date(match.scheduledAt).getTime() || null) : null,
    entrants: isWalkover
      ? [
          { name: playerName(match.player1Id), isWinner: p1Won, sets: [p1Won ? 'WO' : '-'] },
          { name: playerName(match.player2Id), isWinner: p2Won, sets: [p2Won ? 'WO' : '-'] },
        ]
      : [
          { name: playerName(match.player1Id), isWinner: p1Won, sets: scores.map(s => s.player1) },
          { name: playerName(match.player2Id), isWinner: p2Won, sets: scores.map(s => s.player2) },
        ],
  }
}

function MatchRow({ match, enrollments, competitionType, competitionId, roundId, isEditor }) {
  const [showSchedule, setShowSchedule] = useState(false)
  const [scheduledAt, setScheduledAt] = useState(toLocalDatetimeValue(match.scheduledAt))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const isFinished = match.status === 'finished' || match.status === 'walkover' || match.walkover
  const canSchedule = isEditor && !isFinished
  const detailHref = `/${competitionType}/${competitionId}/rounds/${roundId}/matches/${match.id}`
  const cardMatch = buildCardMatch(match, enrollments)

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
      />
      <div className="text-right">
        <Link to={detailHref} className="text-xs text-primary hover:underline">
          View details →
        </Link>
      </div>
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

function RoundMatchesList({ competitionType, competitionId, roundId, enrollments, isEditor }) {
  const matchesPath = `${competitionType}/${competitionId}/rounds/${roundId}/matches`
  const { data: matches, loading } = useFirestoreCollectionOnce(matchesPath)
  if (loading) return <p className="py-2 text-sm text-text-light">Loading matches...</p>
  if (!matches.length) return <p className="py-2 text-sm text-text-light">No match slots yet.</p>
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {matches.map(match => (
        <MatchRow
          key={match.id}
          match={match}
          enrollments={enrollments}
          competitionType={competitionType}
          competitionId={competitionId}
          roundId={roundId}
          isEditor={isEditor}
        />
      ))}
    </div>
  )
}

/**
 * Shows auto-generated knockout bracket rounds and their match slots.
 * Editors can schedule matches inline. All matches link to the detail page.
 */
export default function KnockoutTab({ competitionType, competitionId }) {
  const { isEditor } = useAuthContext()
  const roundsPath = `${competitionType}/${competitionId}/rounds`
  const { data: rounds, loading: roundsLoading } = useFirestoreCollectionOnce(roundsPath, [
    where('type', '==', 'knockout'),
  ])
  const { data: enrollments } = useEnrichedEnrollments(competitionType, competitionId)

  if (roundsLoading) {
    return <div className="flex justify-center py-10"><Loader /></div>
  }

  if (!rounds.length) {
    return (
      <Card>
        <p className="text-sm text-text-light">
          No knockout bracket found. Match slots are created automatically when a competition is set up.
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-8">
      {[...rounds]
        .sort((a, b) => (a.roundNumber || 0) - (b.roundNumber || 0))
        .map(round => (
          <div key={round.id}>
            <h4 className="mb-3 font-heading text-sm font-semibold text-text">{round.name}</h4>
            <RoundMatchesList
              competitionType={competitionType}
              competitionId={competitionId}
              roundId={round.id}
              enrollments={enrollments}
              isEditor={isEditor}
            />
          </div>
        ))}
    </div>
  )
}
