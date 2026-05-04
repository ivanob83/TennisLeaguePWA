/**
 * One-time utility: remove duplicate players from the `players` collection.
 * Duplicates are grouped by exact name match.
 * For each group the oldest document (earliest createdAt) is kept;
 * the rest are deleted.
 * Superadmin only.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { collectionGroup, query, where, getDocs, updateDoc, deleteDoc } from 'firebase/firestore'
import { db } from '../../../infrastructure/firebase.js'
import AppLayout from '../../../layouts/AppLayout.jsx'
import { Container, SectionTitle, Button, Card, Alert } from '../../../ui/index.js'
import { useAuthContext } from '../../auth/context/AuthContext.jsx'
import { playersRepository } from '../../../infrastructure/firestore.js'

function toMs(val) {
  if (!val) return Infinity
  if (val?.toDate) return val.toDate().getTime()
  return new Date(val).getTime()
}

async function findDuplicates(log) {
  log('Fetching all players...')
  const all = await playersRepository.getAll()
  log(`Total players: ${all.length}`)

  const byName = {}
  for (const p of all) {
    const key = (p.name || '').trim()
    if (!byName[key]) byName[key] = []
    byName[key].push(p)
  }

  const dupeGroups = Object.entries(byName)
    .filter(([, group]) => group.length > 1)
    .map(([name, group]) => ({ name, players: group }))

  return dupeGroups
}

async function mergeAndUpdateRefs(log) {
  const dupeGroups = await findDuplicates(log)
  if (!dupeGroups.length) { log('No duplicates found.'); return 0 }

  let totalUpdated = 0

  for (const { name, players } of dupeGroups) {
    const sorted = [...players].sort((a, b) => {
      if (a.authUid && !b.authUid) return -1
      if (!a.authUid && b.authUid) return 1
      return toMs(a.createdAt) - toMs(b.createdAt)
    })
    const [keep, ...extras] = sorted

    for (const old of extras) {
      log(`Merging "${name}": ${old.id} → ${keep.id}`)

      // Update matches where old is player1
      const asP1 = await getDocs(query(collectionGroup(db, 'matches'), where('player1Id', '==', old.id)))
      log(`  ${asP1.size} matches as player1`)
      for (const snap of asP1.docs) {
        const updates = { player1Id: keep.id }
        if (snap.data().winnerId === old.id) updates.winnerId = keep.id
        await updateDoc(snap.ref, updates)
        totalUpdated++
      }

      // Update matches where old is player2
      const asP2 = await getDocs(query(collectionGroup(db, 'matches'), where('player2Id', '==', old.id)))
      log(`  ${asP2.size} matches as player2`)
      for (const snap of asP2.docs) {
        const updates = { player2Id: keep.id }
        if (snap.data().winnerId === old.id) updates.winnerId = keep.id
        await updateDoc(snap.ref, updates)
        totalUpdated++
      }

      // Update enrollments
      try {
        const enrollSnap = await getDocs(query(collectionGroup(db, 'enrollments'), where('playerId', '==', old.id)))
        log(`  ${enrollSnap.size} enrollments`)
        for (const snap of enrollSnap.docs) {
          await updateDoc(snap.ref, { playerId: keep.id })
          totalUpdated++
        }
      } catch { log('  (enrollments index missing — skipped)') }

      // Delete old rankings docs
      try {
        const rankSnap = await getDocs(query(collectionGroup(db, 'rankings'), where('playerId', '==', old.id)))
        for (const snap of rankSnap.docs) await deleteDoc(snap.ref)
        log(`  ${rankSnap.size} stale rankings deleted`)
      } catch { log('  (rankings index missing — skipped)') }

      // Delete old player doc
      await playersRepository.delete(old.id)
      log(`  Player ${old.id} deleted ✓`)
    }
  }

  return totalUpdated
}

async function manualMergeById(oldId, keepId, log) {
  oldId = oldId.trim(); keepId = keepId.trim()
  if (!oldId || !keepId || oldId === keepId) throw new Error('Nevažeći ID-evi')
  log(`Manual merge: ${oldId} → ${keepId}`)
  let total = 0

  const asP1 = await getDocs(query(collectionGroup(db, 'matches'), where('player1Id', '==', oldId)))
  log(`  ${asP1.size} matches as player1`)
  for (const snap of asP1.docs) {
    const updates = { player1Id: keepId }
    if (snap.data().winnerId === oldId) updates.winnerId = keepId
    await updateDoc(snap.ref, updates); total++
  }

  const asP2 = await getDocs(query(collectionGroup(db, 'matches'), where('player2Id', '==', oldId)))
  log(`  ${asP2.size} matches as player2`)
  for (const snap of asP2.docs) {
    const updates = { player2Id: keepId }
    if (snap.data().winnerId === oldId) updates.winnerId = keepId
    await updateDoc(snap.ref, updates); total++
  }

  try {
    const enrollSnap = await getDocs(query(collectionGroup(db, 'enrollments'), where('playerId', '==', oldId)))
    log(`  ${enrollSnap.size} enrollments`)
    for (const snap of enrollSnap.docs) { await updateDoc(snap.ref, { playerId: keepId }); total++ }
  } catch { log('  (enrollments index missing — skipped)') }

  try {
    const rankSnap = await getDocs(query(collectionGroup(db, 'rankings'), where('playerId', '==', oldId)))
    for (const snap of rankSnap.docs) await deleteDoc(snap.ref)
    log(`  ${rankSnap.size} stale rankings deleted`)
  } catch { log('  (rankings index missing — skipped)') }

  await playersRepository.delete(oldId)
  log(`  Player ${oldId} deleted ✓`)
  return total
}

async function deleteDuplicates(log) {
  const dupeGroups = await findDuplicates(log)

  if (dupeGroups.length === 0) {
    log('No duplicates found.')
    return []
  }

  const deleted = []
  for (const { name, players } of dupeGroups) {
    // Sort: prefer player with authUid, then oldest createdAt
    const sorted = [...players].sort((a, b) => {
      if (a.authUid && !b.authUid) return -1
      if (!a.authUid && b.authUid) return 1
      return toMs(a.createdAt) - toMs(b.createdAt)
    })
    const [keep, ...extras] = sorted
    log(`"${name}" — keeping ${keep.id}, deleting ${extras.map(e => e.id).join(', ')}`)
    for (const p of extras) {
      await playersRepository.delete(p.id)
      deleted.push({ name, id: p.id })
    }
  }
  return deleted
}

export default function AdminDedupePlayersPage() {
  const { isSuperadmin } = useAuthContext()
  const navigate = useNavigate()
  const [status, setStatus] = useState('idle')
  const [logs, setLogs] = useState([])
  const [dupeGroups, setDupeGroups] = useState(null)
  const [deletedCount, setDeletedCount] = useState(0)
  const [updatedCount, setUpdatedCount] = useState(0)
  const [manualOldId, setManualOldId] = useState('')
  const [manualKeepId, setManualKeepId] = useState('')
  const [manualStatus, setManualStatus] = useState('idle')
  const [manualLogs, setManualLogs] = useState([])

  function log(msg) { setLogs(prev => [...prev, msg]) }

  async function handlePreview() {
    setStatus('scanning'); setLogs([]); setDupeGroups(null)
    try {
      const groups = await findDuplicates(log)
      setDupeGroups(groups)
      if (groups.length === 0) log('No duplicates found — baza je čista.')
      else log(`Pronađeno ${groups.length} duplikata.`)
      setStatus('previewed')
    } catch (err) {
      log(`Error: ${err.message}`); setStatus('error')
    }
  }

  async function handleDelete() {
    setStatus('deleting'); setLogs([])
    try {
      const deleted = await deleteDuplicates(log)
      setDeletedCount(deleted.length)
      log(`Done — obrisano ${deleted.length} duplikata.`)
      setStatus('done')
    } catch (err) {
      log(`Error: ${err.message}`); setStatus('error')
    }
  }

  async function handleManualMerge(e) {
    e.preventDefault()
    setManualStatus('merging'); setManualLogs([])
    const mlog = msg => setManualLogs(prev => [...prev, msg])
    try {
      const updated = await manualMergeById(manualOldId, manualKeepId, mlog)
      mlog(`Done — ažurirano ${updated} dokumenata.`)
      setManualStatus('done')
    } catch (err) {
      mlog(`Error: ${err.message}`); setManualStatus('error')
    }
  }

  async function handleMerge() {
    setStatus('merging'); setLogs([])
    try {
      const updated = await mergeAndUpdateRefs(log)
      setUpdatedCount(updated)
      log(`Done — ažurirano ${updated} dokumenata.`)
      setStatus('merged')
    } catch (err) {
      log(`Error: ${err.message}`); setStatus('error')
    }
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

  return (
    <AppLayout>
      <Container className="py-8">
        <SectionTitle
          title="Dedupe Players"
          subtitle="Pronađi i obriši duplirane igrače iz baze. Čuva se najstariji dokument (ili onaj sa authUid)."
          eyebrow="Admin / Utility"
        />

        <div className="mt-8 max-w-lg space-y-4">
          <Card>
            <p className="text-sm text-text-light">
              Za svaki duplikat (isti tačan naziv): čuva se najstariji zapis (ili onaj
              koji ima vezan korisnički nalog), svi ostali se brišu iz <code>players</code> kolekcije.
            </p>
            <p className="mt-2 text-xs text-amber-600">
              Napomena: enrollment/match dokumenti koji referenciraju obrisane ID-jeve
              ostaju netaknuti — pokretanje seed-a ponovo će ih ispravno popuniti.
            </p>
          </Card>

          {dupeGroups !== null && dupeGroups.length > 0 && status === 'previewed' && (
            <Card>
              <p className="mb-2 text-sm font-medium text-text">Duplikati ({dupeGroups.length}):</p>
              <div className="space-y-2">
                {dupeGroups.map(({ name, players }) => (
                  <div key={name} className="rounded border border-slate-100 p-2 text-xs">
                    <p className="font-medium text-text">"{name}" — {players.length}×</p>
                    {players.map(p => (
                      <p key={p.id} className="text-text-light ml-2">
                        {p.id}{p.authUid ? ' ★ (linked)' : ''}
                        {p.createdAt ? ` — ${new Date(p.createdAt?.toDate ? p.createdAt.toDate() : p.createdAt).toLocaleDateString('sr')}` : ''}
                      </p>
                    ))}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {logs.length > 0 && (
            <Card className="font-mono text-xs max-h-64 overflow-y-auto">
              {logs.map((l, i) => (
                <div key={i} className={
                  l.startsWith('Error') ? 'text-rose-600' :
                  l.startsWith('Done') ? 'text-green-600' :
                  l.startsWith('No dup') ? 'text-green-600' :
                  'text-text-light'
                }>
                  {l}
                </div>
              ))}
            </Card>
          )}

          <div className="flex flex-wrap gap-3">
            {(status === 'idle' || status === 'error') && (
              <Button onClick={handlePreview}>Scan za duplikate</Button>
            )}
            {status === 'scanning' && (
              <Button disabled loading loadingLabel="Scanning...">Scanning...</Button>
            )}
            {status === 'previewed' && (
              <>
                <Button onClick={handlePreview} variant="outline">Re-scan</Button>
                {dupeGroups?.length > 0 && (
                  <>
                    <Button onClick={handleMerge} variant="success">
                      Merge + update refs ({dupeGroups.reduce((acc, g) => acc + g.players.length - 1, 0)})
                    </Button>
                    <Button onClick={handleDelete} variant="outline" className="border-rose-300 text-rose-600 hover:bg-rose-50">
                      Samo obriši (bez update refs)
                    </Button>
                  </>
                )}
              </>
            )}
            {(status === 'deleting' || status === 'merging') && (
              <Button disabled loading loadingLabel="Processing...">Processing...</Button>
            )}
            {status === 'done' && (
              <>
                <Button onClick={handlePreview}>Scan ponovo</Button>
                <span className="self-center text-sm text-green-600">Obrisano {deletedCount} duplikata</span>
              </>
            )}
            {status === 'merged' && (
              <>
                <Button onClick={handlePreview}>Scan ponovo</Button>
                <span className="self-center text-sm text-green-600">Merge završen — ažurirano {updatedCount} dok.</span>
              </>
            )}
            <Button variant="ghost" onClick={() => navigate('/admin/seeds')}>Nazad</Button>
          </div>

          {/* Manual merge by ID */}
          <Card>
            <p className="mb-3 text-sm font-semibold text-text">Manual merge po ID</p>
            <p className="mb-3 text-xs text-text-light">Koristi kad duplikati imaju različita imena. "Stari" ID će biti obrisan, sve reference ažurirane na "Zadrži" ID.</p>
            <form onSubmit={handleManualMerge} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-text-light">Stari ID (obriši)</label>
                <input
                  className="w-full rounded border border-slate-200 px-3 py-2 font-mono text-xs"
                  value={manualOldId}
                  onChange={e => setManualOldId(e.target.value)}
                  placeholder="JbuL093STeu49G9dkNzp"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-text-light">Zadrži ID (linked)</label>
                <input
                  className="w-full rounded border border-slate-200 px-3 py-2 font-mono text-xs"
                  value={manualKeepId}
                  onChange={e => setManualKeepId(e.target.value)}
                  placeholder="icbHAJ9i6PEoCisTJuKd"
                />
              </div>
              <Button type="submit" variant="success" size="sm" disabled={manualStatus === 'merging'} loading={manualStatus === 'merging'} loadingLabel="Merging...">
                Merge
              </Button>
            </form>
            {manualLogs.length > 0 && (
              <div className="mt-3 max-h-40 overflow-y-auto rounded border border-slate-100 p-2 font-mono text-xs">
                {manualLogs.map((l, i) => (
                  <div key={i} className={l.startsWith('Error') ? 'text-rose-600' : l.startsWith('Done') ? 'text-green-600' : 'text-text-light'}>{l}</div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </Container>
    </AppLayout>
  )
}
