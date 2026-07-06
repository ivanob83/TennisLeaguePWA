/**
 * Admin page listing all matches with status === 'pending_approval' across all competitions.
 * Allows one-click approve per match (or approve all).
 * Editor + superadmin access.
 */
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { collectionGroup, getDocs } from 'firebase/firestore'
import { db } from '../../../infrastructure/firebase.js'
import AppLayout from '../../../layouts/AppLayout.jsx'
import { Container, SectionTitle, Button, Card, Alert, Badge } from '../../../ui/index.js'
import { useAuthContext } from '../../auth/context/AuthContext.jsx'
import { approveScores, rejectScores } from '../../matches/services/matchService.js'

function parseMatchPath(path) {
  const parts = path.split('/')
  // leagues/abc/rounds/def/matches/ghi
  return {
    competitionType: parts[0],
    competitionId: parts[1],
    roundId: parts[3],
    matchId: parts[5],
  }
}

function formatDate(ts) {
  if (!ts) return '—'
  const date = ts.toDate ? ts.toDate() : new Date(ts)
  return date.toLocaleDateString('sr-RS', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

async function scanPendingMatches(log) {
  log('Učitavanje enrollments...')
  const enrollSnap = await getDocs(collectionGroup(db, 'enrollments'))
  const enrollmentsByComp = {}
  const nameMap = {}
  for (const d of enrollSnap.docs) {
    const pathParts = d.ref.path.split('/')
    const compId = pathParts[1]
    const { playerId, playerName } = d.data()
    if (playerId && playerName) {
      if (!nameMap[playerId]) nameMap[playerId] = playerName
      if (!enrollmentsByComp[compId]) enrollmentsByComp[compId] = []
      enrollmentsByComp[compId].push({ playerId, playerName })
    }
  }
  log(`Enrollments učitani: ${enrollSnap.size}`)

  log('Skeniranje mečeva...')
  const matchSnap = await getDocs(collectionGroup(db, 'matches'))
  log(`Mečevi skenirani: ${matchSnap.size}`)

  const pending = []
  for (const docSnap of matchSnap.docs) {
    const data = docSnap.data()
    if (data.status !== 'pending_approval') continue
    const parsed = parseMatchPath(docSnap.ref.path)
    pending.push({
      path: docSnap.ref.path,
      ...parsed,
      data,
    })
  }

  log(`Na čekanju: ${pending.length}`)
  return { pending, nameMap, enrollmentsByComp }
}

function PendingMatchCard({ match, nameMap, enrollmentsByComp, onApproved }) {
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)

  const { competitionType, competitionId, roundId, matchId, data, path } = match
  const p1Name = nameMap[data.player1Id] ?? data.player1Id ?? '?'
  const p2Name = nameMap[data.player2Id] ?? data.player2Id ?? '?'
  const enrollments = enrollmentsByComp[competitionId] || []

  const detailPath = `/${competitionType}/${competitionId}/rounds/${roundId}/matches/${matchId}`

  async function handleApprove() {
    setStatus('approving')
    setError(null)
    try {
      await approveScores(
        competitionType,
        competitionId,
        roundId,
        { id: matchId, pendingSets: data.pendingSets, pendingWinnerId: data.pendingWinnerId },
        enrollments,
      )
      setStatus('done')
      onApproved(path)
    } catch (err) {
      setError(err.message)
      setStatus('idle')
    }
  }

  async function handleReject() {
    setStatus('rejecting')
    setError(null)
    try {
      await rejectScores(competitionType, competitionId, roundId, {
        id: matchId,
        scheduledAt: data.scheduledAt,
      })
      setStatus('rejected')
      onApproved(path)
    } catch (err) {
      setError(err.message)
      setStatus('idle')
    }
  }

  if (status === 'done') {
    return (
      <Card className="border-l-4 border-green-400">
        <p className="text-xs text-green-600 font-medium">Odobreno: {path}</p>
      </Card>
    )
  }

  if (status === 'rejected') {
    return (
      <Card className="border-l-4 border-slate-300">
        <p className="text-xs text-slate-500 font-medium">Odbijeno: {path}</p>
      </Card>
    )
  }

  const sets = data.pendingSets ?? []

  return (
    <Card className="border-l-4 border-amber-300">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="font-mono text-xs text-text-light break-all">{path}</p>
          <div className="flex flex-wrap gap-1">
            <Badge variant="neutral" className="text-xs">
              {competitionType}
            </Badge>
            <Badge variant="neutral" className="text-xs">
              pending_approval
            </Badge>
            {data.submittedAt && (
              <Badge variant="neutral" className="text-xs">
                {formatDate(data.submittedAt)}
              </Badge>
            )}
          </div>
        </div>
        <Link to={detailPath} target="_blank" className="shrink-0">
          <Button size="sm" variant="ghost">
            Otvori
          </Button>
        </Link>
      </div>

      <div className="mt-3 border-t border-slate-100 pt-3 space-y-2">
        <div className="flex items-center gap-4 flex-wrap">
          <span
            className={`text-sm ${data.pendingWinnerId === data.player1Id ? 'font-bold text-text' : 'text-text-light'}`}
          >
            {p1Name}
          </span>
          <span className="text-text-light text-xs">vs</span>
          <span
            className={`text-sm ${data.pendingWinnerId === data.player2Id ? 'font-bold text-text' : 'text-text-light'}`}
          >
            {p2Name}
          </span>
        </div>

        {sets.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {sets.map((s, i) => (
              <span key={i} className="text-sm font-mono bg-slate-100 px-2 py-0.5 rounded">
                {s.p1}:{s.p2}
              </span>
            ))}
          </div>
        )}

        {error && <p className="text-xs text-rose-600">{error}</p>}

        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            variant="success"
            onClick={handleApprove}
            disabled={status === 'approving' || status === 'rejecting'}
            loading={status === 'approving'}
            loadingLabel="Odobravam..."
          >
            Odobri
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleReject}
            disabled={status === 'approving' || status === 'rejecting'}
            loading={status === 'rejecting'}
            loadingLabel="Odbijam..."
          >
            Odbij
          </Button>
        </div>
      </div>
    </Card>
  )
}

export default function AdminPendingApprovalsPage() {
  const { isEditor } = useAuthContext()
  const [scanStatus, setScanStatus] = useState('idle')
  const [logs, setLogs] = useState([])
  const [pending, setPending] = useState(null)
  const [nameMap, setNameMap] = useState({})
  const [enrollmentsByComp, setEnrollmentsByComp] = useState({})
  const [approvedPaths, setApprovedPaths] = useState(new Set())
  const [approvingAll, setApprovingAll] = useState(false)

  function log(msg) {
    setLogs((prev) => [...prev, msg])
  }

  async function handleScan() {
    setScanStatus('scanning')
    setLogs([])
    setPending(null)
    setApprovedPaths(new Set())
    try {
      const result = await scanPendingMatches(log)
      setPending(result.pending)
      setNameMap(result.nameMap)
      setEnrollmentsByComp(result.enrollmentsByComp)
      setScanStatus('done')
    } catch (err) {
      log(`Greška: ${err.message}`)
      setScanStatus('error')
    }
  }

  useEffect(() => {
    handleScan()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleApproved(path) {
    setApprovedPaths((prev) => new Set([...prev, path]))
  }

  const visible = pending ? pending.filter((m) => !approvedPaths.has(m.path)) : null

  async function handleApproveAll() {
    if (!visible || visible.length === 0) return
    setApprovingAll(true)
    for (const match of visible) {
      try {
        await approveScores(
          match.competitionType,
          match.competitionId,
          match.roundId,
          {
            id: match.matchId,
            pendingSets: match.data.pendingSets,
            pendingWinnerId: match.data.pendingWinnerId,
          },
          enrollmentsByComp[match.competitionId] || [],
        )
        handleApproved(match.path)
      } catch (err) {
        log(`Greška za ${match.path}: ${err.message}`)
      }
    }
    setApprovingAll(false)
  }

  if (!isEditor) {
    return (
      <AppLayout>
        <Container className="py-8">
          <Alert variant="error">Pristup odbijen — potreban editor nalog.</Alert>
        </Container>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <Container className="py-8">
        <SectionTitle
          title="Čekaju odobrenje"
          subtitle="Svi mečevi sa statusom pending_approval iz svih takmičenja."
          eyebrow="Admin / Mečevi"
        />

        <div className="mt-8 max-w-2xl space-y-4">
          <Card>
            <p className="text-sm text-text-light">
              Skenira sve mečeve i pronalazi one sa <code>status = pending_approval</code>. Jedan
              klik za odobravanje — rezultati se finalizuju i rang lista se osvežava automatski.
            </p>
          </Card>

          <div className="flex gap-3 flex-wrap">
            <Button
              onClick={handleScan}
              disabled={scanStatus === 'scanning'}
              loading={scanStatus === 'scanning'}
              loadingLabel="Skeniranje..."
            >
              {scanStatus === 'idle' || scanStatus === 'error' ? 'Skeniraj' : 'Osveži'}
            </Button>
            {visible !== null && visible.length > 1 && (
              <Button
                variant="success"
                onClick={handleApproveAll}
                disabled={approvingAll || scanStatus === 'scanning'}
                loading={approvingAll}
                loadingLabel="Odobravam sve..."
              >
                Odobri sve ({visible.length})
              </Button>
            )}
          </div>

          {logs.length > 0 && (
            <Card className="font-mono text-xs max-h-40 overflow-y-auto">
              {logs.map((l, i) => (
                <div
                  key={i}
                  className={
                    l.startsWith('Greška')
                      ? 'text-rose-600'
                      : l.includes('Na čekanju: 0')
                        ? 'text-green-600'
                        : l.includes('Na čekanju:')
                          ? 'text-amber-600'
                          : 'text-text-light'
                  }
                >
                  {l}
                </div>
              ))}
            </Card>
          )}

          {visible !== null && visible.length === 0 && (
            <Alert variant="success">
              {approvedPaths.size > 0
                ? `Sve odobreno! (${approvedPaths.size} mečeva)`
                : 'Nema mečeva na čekanju.'}
            </Alert>
          )}

          {visible !== null && visible.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-amber-600">
                {visible.length} {visible.length === 1 ? 'meč čeka' : 'mečeva čeka'} odobrenje:
              </p>
              {visible.map((match) => (
                <PendingMatchCard
                  key={match.path}
                  match={match}
                  nameMap={nameMap}
                  enrollmentsByComp={enrollmentsByComp}
                  onApproved={handleApproved}
                />
              ))}
            </div>
          )}
        </div>
      </Container>
    </AppLayout>
  )
}
