import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { enrichPlayersWithUserNames } from '../../../infrastructure/enrichPlayers.js'
import AppLayout from '../../../layouts/AppLayout.jsx'
import Avatar from '../../../ui/Avatar.jsx'
import {
  SectionTitle,
  Container,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Alert,
  Badge,
  Loader,
  Input,
} from '../../../ui/index.js'
import { useFirestoreDoc } from '../../../hooks/useFirestore.js'
import { useFirestoreCollection } from '../../../hooks/useFirestore.js'
import { useAuthContext } from '../../auth/context/AuthContext.jsx'
import { useToast } from '../../../context/ToastContext.jsx'
import { playersRepository, matchesRepository } from '../../../infrastructure/firestore.js'
import { collectionGroup, query, where, getDocs } from 'firebase/firestore'
import { db } from '../../../infrastructure/firebase.js'
import {
  validateSets,
  scheduleMatch,
  submitScores,
  approveScores,
  rejectScores,
  editResult,
  setWalkover,
} from '../services/matchService.js'

const STATUS_LABEL = {
  not_scheduled: 'Not Scheduled',
  scheduled: 'Scheduled',
  in_progress: 'In Play',
  pending_approval: 'Pending Approval',
  finished: 'Finished',
  walkover: 'Finished',
}

const STATUS_BADGE_VARIANT = {
  not_scheduled: 'neutral',
  scheduled: 'scheduled',
  in_progress: 'in_progress',
  pending_approval: 'warning',
  finished: 'finished',
  walkover: 'finished',
}

function resolveDisplayStatus(status, scheduledAt) {
  if (status !== 'scheduled' || !scheduledAt) return status
  const t = scheduledAt?.toDate ? scheduledAt.toDate().getTime() : new Date(scheduledAt).getTime()
  if (isNaN(t)) return status
  const now = Date.now()
  if (now >= t && now <= t + 2 * 60 * 60 * 1000) return 'in_progress'
  return status
}

function formatDateTime(val) {
  if (!val) return '—'
  const d = val?.toDate ? val.toDate() : new Date(val)
  return d.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function toLocalDatetimeValue(val) {
  if (!val) return ''
  const d = val?.toDate ? val.toDate() : new Date(val)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function SetsTable({ sets, player1Name, player2Name, pending = false }) {
  return (
    <div className={pending ? 'opacity-80' : ''}>
      <div className="grid grid-cols-3 gap-3 text-xs font-bold uppercase tracking-wide text-text-light mb-1">
        <span>Set</span>
        <span>{player1Name}</span>
        <span>{player2Name}</span>
      </div>
      {sets.map((set, i) => (
        <div
          key={i}
          className="grid grid-cols-3 gap-3 border-b border-slate-100 py-1.5 text-sm last:border-0"
        >
          <span className="text-text-light">Set {i + 1}</span>
          <span className={`font-semibold ${set.p1 > set.p2 ? 'text-primary' : 'text-text'}`}>
            {set.p1}
          </span>
          <span className={`font-semibold ${set.p2 > set.p1 ? 'text-primary' : 'text-text'}`}>
            {set.p2}
          </span>
        </div>
      ))}
    </div>
  )
}

function matchResultSummary(match) {
  const isWalkover = match.walkover || match.status === 'walkover'
  if (isWalkover) return { sets: 'W/O', detail: null }
  const rawSets = match.sets?.length
    ? match.sets
    : match.scores?.map((s) => ({ p1: s.player1, p2: s.player2 })) || []
  if (!rawSets.length) return null
  let p1sets = 0,
    p2sets = 0
  const parts = rawSets.map((s) => {
    const p1 = Number(s.p1 ?? s.player1 ?? 0)
    const p2 = Number(s.p2 ?? s.player2 ?? 0)
    if (p1 > p2) p1sets++
    else if (p2 > p1) p2sets++
    return `${p1}:${p2}`
  })
  return { sets: `${p1sets}:${p2sets}`, detail: `(${parts.join('  ')})` }
}

function CompareBar({ v1, v2, label, format = (v) => v }) {
  const total = (v1 || 0) + (v2 || 0)
  const p1pct = total > 0 ? Math.round(((v1 || 0) / total) * 100) : 50
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="w-12 text-left font-semibold text-text">{format(v1 ?? 0)}</span>
        <span className="flex-1 text-center text-xs font-medium uppercase tracking-wide text-text-light">
          {label}
        </span>
        <span className="w-12 text-right font-semibold text-text">{format(v2 ?? 0)}</span>
      </div>
      <div className="flex h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className="bg-primary transition-all duration-500" style={{ width: `${p1pct}%` }} />
        <div
          className="bg-secondary transition-all duration-500"
          style={{ width: `${100 - p1pct}%` }}
        />
      </div>
    </div>
  )
}

export default function MatchDetailPage() {
  const { competitionType, competitionId, roundId, matchId } = useParams()
  const navigate = useNavigate()
  const { user, isEditor, isSuperadmin } = useAuthContext()
  const { showToast } = useToast()

  const matchPath = `${competitionType}/${competitionId}/rounds/${roundId}/matches`
  const enrollmentPath = `${competitionType}/${competitionId}/enrollments`

  const { data: match, loading: matchLoading } = useFirestoreDoc(matchPath, matchId)
  const { data: round } = useFirestoreDoc(`${competitionType}/${competitionId}/rounds`, roundId)
  const { data: group } = useFirestoreDoc(
    `${competitionType}/${competitionId}/groups`,
    round?.groupId,
  )
  const { data: enrollments } = useFirestoreCollection(enrollmentPath)

  const [matchPlayers, setMatchPlayers] = useState({})
  const [playerStats, setPlayerStats] = useState({})
  const [h2h, setH2h] = useState(null)
  const [scheduledAt, setScheduledAt] = useState('')
  const [scheduling, setScheduling] = useState(false)
  const [scheduleError, setScheduleError] = useState(null)
  const [sets, setSets] = useState([{ p1: '', p2: '' }])
  const [scoring, setScoring] = useState(false)
  const [scoreError, setScoreError] = useState(null)
  const [approving, setApproving] = useState(false)
  const [editingResult, setEditingResult] = useState(false)
  const [showWalkover, setShowWalkover] = useState(false)
  const [walkoverSaving, setWalkoverSaving] = useState(false)
  const [allPlayers, setAllPlayers] = useState([])
  const [repairP1, setRepairP1] = useState('')
  const [repairP2, setRepairP2] = useState('')
  const [repairWinner, setRepairWinner] = useState('')
  const [repairing, setRepairing] = useState(false)
  const [repairError, setRepairError] = useState(null)

  useEffect(() => {
    if (!match) return
    setScheduledAt(toLocalDatetimeValue(match.scheduledAt))
    // Pre-fill score form from pending, finished sets, or seeded scores
    const existingSets =
      match.pendingSets ||
      match.sets ||
      match.scores?.map((s) => ({ p1: s.player1, p2: s.player2 }))
    if (existingSets?.length)
      setSets(
        existingSets.map((s) => ({
          p1: String(s.p1 ?? s.player1 ?? ''),
          p2: String(s.p2 ?? s.player2 ?? ''),
        })),
      )
    async function loadPlayers() {
      const ids = [match.player1Id, match.player2Id].filter(Boolean)
      const results = await Promise.all(ids.map((id) => playersRepository.getById(id)))
      const enriched = await enrichPlayersWithUserNames(results.filter(Boolean))
      const map = {}
      ids.forEach((id, i) => {
        map[id] = enriched[id] ?? results[i]
      })
      setMatchPlayers(map)
      setRepairP1(match.player1Id ?? '')
      setRepairP2(match.player2Id ?? '')
      setRepairWinner(match.winnerId ?? '')
      const all = await playersRepository.getAll()
      setAllPlayers([...all].sort((a, b) => a.name.localeCompare(b.name)))
    }
    async function loadAllStats() {
      const p1 = match.player1Id
      const p2 = match.player2Id
      if (!p1 || !p2) return
      const PLAYED = new Set(['finished', 'walkover', 'completed'])
      async function fetchMatches(playerId) {
        const [asP1Snap, asP2Snap] = await Promise.all([
          getDocs(query(collectionGroup(db, 'matches'), where('player1Id', '==', playerId))),
          getDocs(query(collectionGroup(db, 'matches'), where('player2Id', '==', playerId))),
        ])
        return {
          asP1: asP1Snap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter((m) => PLAYED.has(m.status)),
          asP2: asP2Snap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter((m) => PLAYED.has(m.status)),
        }
      }
      function computeStats(playerId, { asP1, asP2 }) {
        let wins = 0,
          losses = 0
        for (const m of [...asP1, ...asP2]) {
          if (!m.winnerId) continue
          if (m.winnerId === playerId) wins++
          else losses++
        }
        const matchesPlayed = wins + losses
        return {
          wins,
          losses,
          matchesPlayed,
          winRate: matchesPlayed > 0 ? Math.round((wins / matchesPlayed) * 100) : 0,
        }
      }
      try {
        const [p1m, p2m] = await Promise.all([fetchMatches(p1), fetchMatches(p2)])
        const h2hMatches = [
          ...p1m.asP1.filter((m) => m.player2Id === p2),
          ...p1m.asP2.filter((m) => m.player1Id === p2),
        ]
        setPlayerStats({ [p1]: computeStats(p1, p1m), [p2]: computeStats(p2, p2m) })
        let p1wins = 0,
          p2wins = 0
        for (const m of h2hMatches) {
          if (m.winnerId === p1) p1wins++
          else if (m.winnerId === p2) p2wins++
        }
        setH2h({ p1wins, p2wins })
      } catch (e) {
        console.error('Failed to load player stats — check Firestore indexes:', e)
      }
    }
    loadPlayers()
    loadAllStats()
  }, [match?.id])

  function playerName(id) {
    if (!id) return 'BYE'
    const en = enrollments.find((e) => e.playerId === id)
    return matchPlayers[id]?.name || en?.playerName || en?.playerEmail || id
  }

  const isMatchedPlayer =
    user &&
    (matchPlayers[match?.player1Id]?.authUid === user.uid ||
      matchPlayers[match?.player2Id]?.authUid === user.uid)

  const canSchedule = isEditor && match?.status !== 'pending_approval'
  const canScore =
    (isEditor || isMatchedPlayer) &&
    match?.status !== 'finished' &&
    match?.status !== 'walkover' &&
    match?.status !== 'pending_approval'
  const isFinished = match?.status === 'finished' || match?.status === 'walkover'
  const isPendingApproval = match?.status === 'pending_approval'

  async function handleSetWalkover(winnerId) {
    setWalkoverSaving(true)
    try {
      await setWalkover(competitionType, competitionId, roundId, matchId, winnerId, enrollments)
      showToast({
        title: 'Walkover set',
        message: `${playerName(winnerId)} wins by WO.`,
        variant: 'success',
      })
      setShowWalkover(false)
      setEditingResult(false)
    } catch {
      showToast({ title: 'Error', message: 'Failed to set walkover.', variant: 'error' })
    } finally {
      setWalkoverSaving(false)
    }
  }

  async function handleSchedule(e) {
    e.preventDefault()
    if (!scheduledAt) {
      setScheduleError('Please select a date and time.')
      return
    }
    setScheduling(true)
    setScheduleError(null)
    try {
      await scheduleMatch(competitionType, competitionId, roundId, matchId, scheduledAt)
      showToast({ title: 'Match scheduled', message: 'Date and time saved.', variant: 'success' })
    } catch {
      setScheduleError('Failed to schedule match. Please try again.')
    } finally {
      setScheduling(false)
    }
  }

  async function handleScoreSubmit(e) {
    e.preventDefault()
    const { valid, error } = validateSets(sets)
    if (!valid) {
      setScoreError(error)
      return
    }
    setScoring(true)
    setScoreError(null)
    try {
      await submitScores(
        competitionType,
        competitionId,
        roundId,
        matchId,
        sets,
        match.player1Id,
        match.player2Id,
      )
      showToast({
        title: 'Result submitted',
        message: 'Waiting for admin approval.',
        variant: 'info',
      })
    } catch {
      setScoreError('Failed to submit scores. Please try again.')
    } finally {
      setScoring(false)
    }
  }

  async function handleApprove() {
    setApproving(true)
    try {
      await approveScores(competitionType, competitionId, roundId, match, enrollments)
      showToast({
        title: 'Result approved',
        message: 'Match marked as finished.',
        variant: 'success',
      })
    } catch {
      showToast({ title: 'Error', message: 'Failed to approve result.', variant: 'error' })
    } finally {
      setApproving(false)
    }
  }

  async function handleEditResult(e) {
    e.preventDefault()
    const { valid, error } = validateSets(sets)
    if (!valid) {
      setScoreError(error)
      return
    }
    setScoring(true)
    setScoreError(null)
    try {
      await editResult(
        competitionType,
        competitionId,
        roundId,
        matchId,
        sets,
        match.player1Id,
        match.player2Id,
        enrollments,
      )
      showToast({ title: 'Result updated', message: 'Match result saved.', variant: 'success' })
      setEditingResult(false)
    } catch {
      setScoreError('Failed to save result. Please try again.')
    } finally {
      setScoring(false)
    }
  }

  async function handleReject() {
    setApproving(true)
    try {
      await rejectScores(competitionType, competitionId, roundId, match)
      showToast({
        title: 'Result rejected',
        message: 'Scores cleared, match is open again.',
        variant: 'info',
      })
    } catch {
      showToast({ title: 'Error', message: 'Failed to reject result.', variant: 'error' })
    } finally {
      setApproving(false)
    }
  }

  function updateSet(index, field, value) {
    setSets((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)))
  }

  async function handleRepairPlayers(e) {
    e.preventDefault()
    setRepairing(true)
    setRepairError(null)
    try {
      const updates = { player1Id: repairP1, player2Id: repairP2 }
      if (repairWinner) updates.winnerId = repairWinner
      await matchesRepository(competitionType, competitionId, roundId).update(matchId, updates)
      showToast({ title: 'Match updated', message: 'Player IDs saved.', variant: 'success' })
    } catch (err) {
      setRepairError(err.message)
    } finally {
      setRepairing(false)
    }
  }

  if (matchLoading) {
    return (
      <AppLayout>
        <div className="flex justify-center py-24">
          <Loader />
        </div>
      </AppLayout>
    )
  }

  if (!match) {
    return (
      <AppLayout>
        <Container className="py-8">
          <p className="py-16 text-center text-text-light">Match not found.</p>
        </Container>
      </AppLayout>
    )
  }

  const p1Name = playerName(match.player1Id)
  const p2Name = playerName(match.player2Id)

  return (
    <AppLayout>
      <Container className="py-8">
        <div className="mb-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/${competitionType}/${competitionId}`)}
          >
            ← Back to competition
          </Button>
        </div>

        <SectionTitle
          title={`${p1Name} vs ${p2Name}`}
          subtitle={
            [group?.name, round?.roundNumber != null ? `Round ${round.roundNumber}` : null]
              .filter(Boolean)
              .join(' - ') || 'Match detail'
          }
        />

        {/* Player comparison */}
        <div className="mt-8">
          {(() => {
            const result = isFinished ? matchResultSummary(match) : null
            const p1won = isFinished && match.winnerId === match.player1Id
            const p2won = isFinished && match.winnerId === match.player2Id
            const displayStatus = resolveDisplayStatus(match.status, match.scheduledAt)
            return (
              <Card>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-4">
                  <div className="flex items-center gap-2">
                    <Badge variant={STATUS_BADGE_VARIANT[displayStatus] || 'neutral'}>
                      {STATUS_LABEL[displayStatus] || match.status}
                    </Badge>
                  </div>
                  {match.scheduledAt && (
                    <span className="text-sm text-text-light">
                      {formatDateTime(match.scheduledAt)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex flex-1 flex-col items-center text-center">
                    <Avatar
                      src={matchPlayers[match.player1Id]?.avatarUrl}
                      urls={matchPlayers[match.player1Id]?.avatarUrls}
                      sizeHint={100}
                      name={p1Name}
                      className="h-16 w-16 border border-slate-200"
                    />
                    <div className="mt-2 flex items-center gap-1">
                      <p className="text-sm font-semibold text-text">{p1Name}</p>
                      {p1won && (
                        <svg
                          className="h-4 w-4 shrink-0 text-secondary"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          strokeWidth="3"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-center gap-0.5">
                    {result ? (
                      <>
                        <span className="text-lg font-bold text-text">{result.sets}</span>
                        {result.detail && (
                          <span className="text-xs text-text-light">{result.detail}</span>
                        )}
                      </>
                    ) : (
                      <span className="text-xs font-bold tracking-widest text-text-light">VS</span>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col items-center text-center">
                    <Avatar
                      src={matchPlayers[match.player2Id]?.avatarUrl}
                      urls={matchPlayers[match.player2Id]?.avatarUrls}
                      sizeHint={100}
                      name={p2Name}
                      className="h-16 w-16 border border-slate-200"
                    />
                    <div className="mt-2 flex items-center gap-1">
                      {p2won && (
                        <svg
                          className="h-4 w-4 shrink-0 text-secondary"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          strokeWidth="3"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      <p className="text-sm font-semibold text-text">{p2Name}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-5 space-y-3 border-t border-slate-200 pt-4">
                  {h2h !== null && (
                    <CompareBar v1={h2h.p1wins} v2={h2h.p2wins} label="Head to Head" />
                  )}
                  <CompareBar
                    v1={playerStats[match.player1Id]?.matchesPlayed}
                    v2={playerStats[match.player2Id]?.matchesPlayed}
                    label="Matches played"
                  />
                  <CompareBar
                    v1={playerStats[match.player1Id]?.wins}
                    v2={playerStats[match.player2Id]?.wins}
                    label="Wins"
                  />
                  <CompareBar
                    v1={playerStats[match.player1Id]?.losses}
                    v2={playerStats[match.player2Id]?.losses}
                    label="Losses"
                  />
                  <CompareBar
                    v1={playerStats[match.player1Id]?.winRate}
                    v2={playerStats[match.player2Id]?.winRate}
                    label="Win rate"
                    format={(v) => `${v}%`}
                  />
                </div>
              </Card>
            )
          })()}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {canSchedule && (
            <div className="lg:col-span-1">
              <Card>
                <h4 className="mb-3 font-heading text-sm font-semibold text-text">
                  {match.scheduledAt ? 'Reschedule' : 'Schedule match'}
                </h4>
                {scheduleError && (
                  <Alert variant="error" className="mb-3">
                    {scheduleError}
                  </Alert>
                )}
                <form onSubmit={handleSchedule} className="space-y-3">
                  <Input
                    label="Date & time"
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                  />
                  <Button type="submit" size="sm" loading={scheduling} loadingLabel="Saving...">
                    Save schedule
                  </Button>
                </form>
              </Card>
            </div>
          )}

          {/* Main content: score entry / approval / result */}
          <div className={canSchedule ? 'lg:col-span-2' : 'lg:col-span-3'}>
            {/* Finished — show final result */}
            {isFinished && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Result</CardTitle>
                    {isEditor && !editingResult && (
                      <Button size="sm" variant="ghost" onClick={() => setEditingResult(true)}>
                        Edit result
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {!editingResult && (
                    <>
                      {match.winnerId && (
                        <p className="mb-4 text-sm font-semibold text-secondary">
                          Winner: {playerName(match.winnerId)}
                          {(match.walkover || match.status === 'walkover') && (
                            <span className="ml-2 text-xs font-normal text-text-light">
                              (walkover)
                            </span>
                          )}
                        </p>
                      )}
                      {match.sets?.length > 0 && (
                        <SetsTable sets={match.sets} player1Name={p1Name} player2Name={p2Name} />
                      )}
                      {!match.sets?.length && match.scores?.length > 0 && (
                        <SetsTable
                          sets={match.scores.map((s) => ({ p1: s.player1, p2: s.player2 }))}
                          player1Name={p1Name}
                          player2Name={p2Name}
                        />
                      )}
                    </>
                  )}

                  {editingResult && (
                    <>
                      {scoreError && (
                        <Alert variant="error" className="mb-4">
                          {scoreError}
                        </Alert>
                      )}
                      <form onSubmit={handleEditResult} className="space-y-4">
                        <div className="grid grid-cols-3 gap-3 text-xs font-bold uppercase tracking-wide text-text-light">
                          <span>Set</span>
                          <span>{p1Name}</span>
                          <span>{p2Name}</span>
                        </div>
                        {sets.map((set, i) => (
                          <div key={i} className="grid grid-cols-3 items-end gap-3">
                            <span className="pb-2 text-sm text-text-light">Set {i + 1}</span>
                            <Input
                              type="number"
                              min="0"
                              max="99"
                              value={set.p1}
                              onChange={(e) => updateSet(i, 'p1', e.target.value)}
                              placeholder="0"
                            />
                            <div className="flex gap-2">
                              <Input
                                type="number"
                                min="0"
                                max="99"
                                value={set.p2}
                                onChange={(e) => updateSet(i, 'p2', e.target.value)}
                                placeholder="0"
                              />
                              {sets.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSets((prev) => prev.filter((_, idx) => idx !== i))
                                  }
                                  className="shrink-0 text-xs text-rose-500 hover:text-rose-700"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setSets((prev) => [...prev, { p1: '', p2: '' }])}
                        >
                          + Add set
                        </Button>
                        <div className="flex gap-3 border-t border-slate-200 pt-4">
                          <Button type="submit" loading={scoring} loadingLabel="Saving...">
                            Save result
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                              setEditingResult(false)
                              setScoreError(null)
                              setShowWalkover(false)
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </form>
                      <div className="mt-4 border-t border-slate-200 pt-4">
                        {!showWalkover ? (
                          <Button variant="outline" size="sm" onClick={() => setShowWalkover(true)}>
                            Set as Walkover (WO)
                          </Button>
                        ) : (
                          <div className="space-y-2">
                            <p className="text-sm text-text-light">Who wins by walkover?</p>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                loading={walkoverSaving}
                                onClick={() => handleSetWalkover(match.player1Id)}
                              >
                                {p1Name} wins WO
                              </Button>
                              <Button
                                size="sm"
                                loading={walkoverSaving}
                                onClick={() => handleSetWalkover(match.player2Id)}
                              >
                                {p2Name} wins WO
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setShowWalkover(false)}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Pending approval — admin sees scores + approve/reject */}
            {isPendingApproval && isEditor && (
              <Card>
                <CardHeader>
                  <CardTitle>Approve result</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-4 text-sm text-text-light">
                    A result has been submitted. Review the scores and approve or reject.
                  </p>
                  {match.pendingSets?.length > 0 && (
                    <div className="mb-6">
                      <SetsTable
                        sets={match.pendingSets}
                        player1Name={p1Name}
                        player2Name={p2Name}
                        pending
                      />
                      {match.pendingWinnerId && (
                        <p className="mt-3 text-sm font-medium text-text">
                          Calculated winner:{' '}
                          <span className="text-secondary">
                            {playerName(match.pendingWinnerId)}
                          </span>
                        </p>
                      )}
                    </div>
                  )}
                  <div className="flex gap-3">
                    <Button onClick={handleApprove} loading={approving} loadingLabel="Approving...">
                      Approve
                    </Button>
                    <Button variant="outline" onClick={handleReject} disabled={approving}>
                      Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Pending approval — player sees waiting message */}
            {isPendingApproval && !isEditor && (
              <Card>
                <CardContent>
                  <Alert variant="info">Result submitted and waiting for admin approval.</Alert>
                </CardContent>
              </Card>
            )}

            {/* Score entry form */}
            {canScore && (
              <Card>
                <CardHeader>
                  <CardTitle>Enter scores</CardTitle>
                </CardHeader>
                <CardContent>
                  {scoreError && (
                    <Alert variant="error" className="mb-4">
                      {scoreError}
                    </Alert>
                  )}
                  <form onSubmit={handleScoreSubmit} className="space-y-4">
                    <div className="grid grid-cols-3 gap-3 text-xs font-bold uppercase tracking-wide text-text-light">
                      <span>Set</span>
                      <span>{p1Name}</span>
                      <span>{p2Name}</span>
                    </div>

                    {sets.map((set, i) => (
                      <div key={i} className="grid grid-cols-3 items-end gap-3">
                        <span className="pb-2 text-sm text-text-light">Set {i + 1}</span>
                        <Input
                          type="number"
                          min="0"
                          max="99"
                          value={set.p1}
                          onChange={(e) => updateSet(i, 'p1', e.target.value)}
                          placeholder="0"
                        />
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            min="0"
                            max="99"
                            value={set.p2}
                            onChange={(e) => updateSet(i, 'p2', e.target.value)}
                            placeholder="0"
                          />
                          {sets.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setSets((prev) => prev.filter((_, idx) => idx !== i))}
                              className="shrink-0 text-xs text-rose-500 hover:text-rose-700"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>
                    ))}

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSets((prev) => [...prev, { p1: '', p2: '' }])}
                    >
                      + Add set
                    </Button>

                    <div className="border-t border-slate-200 pt-4">
                      <Button type="submit" loading={scoring} loadingLabel="Submitting...">
                        Submit result
                      </Button>
                      <p className="mt-2 text-xs text-text-light">
                        Result will be reviewed by an admin before being confirmed.
                      </p>
                    </div>
                  </form>
                  {isEditor && (
                    <div className="mt-4 border-t border-slate-200 pt-4">
                      {!showWalkover ? (
                        <Button variant="outline" size="sm" onClick={() => setShowWalkover(true)}>
                          Set as Walkover (WO)
                        </Button>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-sm text-text-light">Who wins by walkover?</p>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              loading={walkoverSaving}
                              onClick={() => handleSetWalkover(match.player1Id)}
                            >
                              {p1Name} wins WO
                            </Button>
                            <Button
                              size="sm"
                              loading={walkoverSaving}
                              onClick={() => handleSetWalkover(match.player2Id)}
                            >
                              {p2Name} wins WO
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setShowWalkover(false)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Fallback — not a participant, not editor */}
            {!canScore && !isPendingApproval && match.status !== 'finished' && (
              <Card>
                <p className="text-sm text-text-light">
                  Scores will be entered by the organizer or one of the matched players.
                </p>
              </Card>
            )}
          </div>
        </div>

        {isSuperadmin && allPlayers.length > 0 && (
          <div className="mt-8 border-t border-slate-200 pt-6">
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-text-light">
              Superadmin — Repair Player IDs
            </p>
            <div className="max-w-lg">
              <Card className="border-amber-200 bg-amber-50">
                <form onSubmit={handleRepairPlayers} className="space-y-3">
                  {[
                    { label: 'Player 1', value: repairP1, set: setRepairP1 },
                    { label: 'Player 2', value: repairP2, set: setRepairP2 },
                    { label: 'Winner', value: repairWinner, set: setRepairWinner },
                  ].map(({ label, value, set }) => (
                    <div key={label} className="flex items-center gap-3">
                      <label className="w-20 shrink-0 text-xs font-medium text-text-light">
                        {label}
                      </label>
                      <select
                        className="flex-1 rounded border border-slate-200 bg-white px-2 py-1.5 text-sm text-text"
                        value={value}
                        onChange={(e) => set(e.target.value)}
                      >
                        <option value="">— none —</option>
                        {allPlayers.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                  {repairError && <p className="text-xs text-rose-600">{repairError}</p>}
                  <Button
                    type="submit"
                    size="sm"
                    variant="outline"
                    loading={repairing}
                    loadingLabel="Saving..."
                  >
                    Save player IDs
                  </Button>
                </form>
              </Card>
            </div>
          </div>
        )}
      </Container>
    </AppLayout>
  )
}
