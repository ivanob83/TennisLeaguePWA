/**
 * Diagnostic tool: find matches referencing player IDs that no longer exist.
 * Happens when players are seeded, then merged/deleted, but match docs keep the old ID.
 * Superadmin only.
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { collectionGroup, getDocs, updateDoc } from 'firebase/firestore'
import { db } from '../../../infrastructure/firebase.js'
import { playersRepository } from '../../../infrastructure/firestore.js'
import AppLayout from '../../../layouts/AppLayout.jsx'
import { Container, SectionTitle, Button, Card, Alert, Badge } from '../../../ui/index.js'
import { useAuthContext } from '../../auth/context/AuthContext.jsx'

const ORPHAN_FIELDS = ['player1Id', 'player2Id', 'winnerId']

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

async function scanOrphanMatches(log) {
  log('Fetching all players...')
  const players = await playersRepository.getAll()
  const validIds = new Set(players.map(p => p.id))
  log(`Players loaded: ${players.length}`)

  log('Fetching enrollment names...')
  const enrollSnap = await getDocs(collectionGroup(db, 'enrollments'))
  const nameMap = {}
  for (const d of enrollSnap.docs) {
    const { playerId, playerName } = d.data()
    if (playerId && playerName && !nameMap[playerId]) nameMap[playerId] = playerName
  }
  log(`Enrollment name entries: ${Object.keys(nameMap).length}`)

  log('Scanning all matches...')
  const matchSnap = await getDocs(collectionGroup(db, 'matches'))
  log(`Matches scanned: ${matchSnap.size}`)

  const orphans = []
  for (const docSnap of matchSnap.docs) {
    const data = docSnap.data()
    const issues = []
    for (const field of ORPHAN_FIELDS) {
      if (data[field] && !validIds.has(data[field])) {
        issues.push({
          field,
          orphanId: data[field],
          orphanName: nameMap[data[field]] ?? null,
        })
      }
    }
    if (issues.length > 0) {
      const parsed = parseMatchPath(docSnap.ref.path)
      orphans.push({ ref: docSnap.ref, path: docSnap.ref.path, ...parsed, data, issues })
    }
  }

  log(`Orphan matches found: ${orphans.length}`)
  return { orphans, players }
}

function OrphanMatchCard({ match, players, onFixed }) {
  const sorted = [...players].sort((a, b) => a.name.localeCompare(b.name))
  const [fixes, setFixes] = useState(() =>
    Object.fromEntries(match.issues.map(i => [i.field, '']))
  )
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)

  const detailPath = `/${match.competitionType}/${match.competitionId}/rounds/${match.roundId}/matches/${match.matchId}`

  async function handleRepair(e) {
    e.preventDefault()
    setStatus('saving')
    setError(null)
    try {
      const updates = {}
      for (const { field } of match.issues) {
        const val = fixes[field]
        if (!val) throw new Error(`Odaberi igrača za ${field}`)
        updates[field] = val
      }
      await updateDoc(match.ref, updates)
      setStatus('done')
      onFixed(match.path)
    } catch (err) {
      setError(err.message)
      setStatus('idle')
    }
  }

  if (status === 'done') {
    return (
      <Card className="border-l-4 border-green-400">
        <p className="text-xs text-green-600 font-medium">Popravljen: {match.path}</p>
      </Card>
    )
  }

  return (
    <Card className="border-l-4 border-rose-300">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="font-mono text-xs text-text-light break-all">{match.path}</p>
          <div className="flex flex-wrap gap-1">
            <Badge variant="neutral" className="text-xs">{match.competitionType}</Badge>
            <Badge variant="neutral" className="text-xs">{match.data.status ?? 'no status'}</Badge>
          </div>
        </div>
        <Link to={detailPath} target="_blank" className="shrink-0">
          <Button size="sm" variant="ghost">Otvori meč</Button>
        </Link>
      </div>

      <form onSubmit={handleRepair} className="mt-3 space-y-3 border-t border-slate-100 pt-3">
        {match.issues.map(({ field, orphanId, orphanName }) => (
          <div key={field} className="space-y-1">
            <p className="text-xs font-medium text-text-light">{field}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-rose-600">
                {orphanName
                  ? <><span className="font-medium">{orphanName}</span> <span className="font-mono text-rose-400">({orphanId})</span></>
                  : <span className="font-mono">{orphanId}</span>
                }
                <span className="ml-1 text-text-light">— ne postoji</span>
              </span>
              <span className="text-text-light text-xs">→</span>
              <select
                className="flex-1 min-w-[180px] rounded border border-slate-200 px-2 py-1 text-sm text-text bg-white"
                value={fixes[field]}
                onChange={e => setFixes(prev => ({ ...prev, [field]: e.target.value }))}
              >
                <option value="">— odaberi igrača —</option>
                {sorted.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>
        ))}
        {error && <p className="text-xs text-rose-600">{error}</p>}
        <Button type="submit" size="sm" variant="success" disabled={status === 'saving'}
          loading={status === 'saving'} loadingLabel="Saving...">
          Popravi
        </Button>
      </form>
    </Card>
  )
}

export default function AdminOrphanMatchesPage() {
  const { isSuperadmin } = useAuthContext()
  const [scanStatus, setScanStatus] = useState('idle')
  const [logs, setLogs] = useState([])
  const [orphans, setOrphans] = useState(null)
  const [players, setPlayers] = useState([])
  const [fixedPaths, setFixedPaths] = useState(new Set())

  function log(msg) { setLogs(prev => [...prev, msg]) }

  async function handleScan() {
    setScanStatus('scanning')
    setLogs([])
    setOrphans(null)
    setFixedPaths(new Set())
    try {
      const result = await scanOrphanMatches(log)
      setOrphans(result.orphans)
      setPlayers(result.players)
      setScanStatus('done')
    } catch (err) {
      log(`Error: ${err.message}`)
      setScanStatus('error')
    }
  }

  function handleFixed(path) {
    setFixedPaths(prev => new Set([...prev, path]))
  }

  if (!isSuperadmin) {
    return (
      <AppLayout>
        <Container className="py-8">
          <Alert variant="error">Access denied — superadmin only.</Alert>
        </Container>
      </AppLayout>
    )
  }

  const visible = orphans ? orphans.filter(o => !fixedPaths.has(o.path)) : null

  return (
    <AppLayout>
      <Container className="py-8">
        <SectionTitle
          title="Orphan Matches"
          subtitle="Pronađi mečeve koji referenciraju player ID-eve koji više ne postoje."
          eyebrow="Admin / Utility"
        />

        <div className="mt-8 max-w-2xl space-y-4">
          <Card>
            <p className="text-sm text-text-light">
              Skenira sve mečeve i upoređuje <code>player1Id</code>, <code>player2Id</code> i{' '}
              <code>winnerId</code> sa postojećim igračima. Za svaki orphan ID prikazuje
              ime igrača iz enrollment podataka (ako postoji) i nudi select za zamenu.
            </p>
          </Card>

          <div className="flex gap-3">
            <Button onClick={handleScan} disabled={scanStatus === 'scanning'}
              loading={scanStatus === 'scanning'} loadingLabel="Scanning...">
              {scanStatus === 'idle' || scanStatus === 'error' ? 'Scan' : 'Re-scan'}
            </Button>
          </div>

          {logs.length > 0 && (
            <Card className="font-mono text-xs max-h-40 overflow-y-auto">
              {logs.map((l, i) => (
                <div key={i} className={
                  l.startsWith('Error') ? 'text-rose-600' :
                  l.includes('found: 0') ? 'text-green-600' :
                  l.includes('found:') ? 'text-amber-600' :
                  'text-text-light'
                }>{l}</div>
              ))}
            </Card>
          )}

          {visible !== null && visible.length === 0 && (
            <Alert variant="success">
              {fixedPaths.size > 0
                ? `Sve popravljeno! (${fixedPaths.size} mečeva)`
                : 'Nema orphan mečeva — baza je čista.'}
            </Alert>
          )}

          {visible !== null && visible.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-rose-600">
                {visible.length} orphan {visible.length === 1 ? 'meč' : 'mečeva'} pronađeno:
              </p>
              {visible.map(match => (
                <OrphanMatchCard
                  key={match.path}
                  match={match}
                  players={players}
                  onFixed={handleFixed}
                />
              ))}
            </div>
          )}
        </div>
      </Container>
    </AppLayout>
  )
}
