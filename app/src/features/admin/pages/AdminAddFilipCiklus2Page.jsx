/**
 * One-time migration: add a new player "Filip" to Grupa 1 (Group A) of
 * "Play Liga 2026 Ciklus 2" (league ISqXpeuT13uGvKCltOm0).
 *
 * What it does:
 *  1. Creates Filip in `players` (new player, no linked auth).
 *  2. Enrolls Filip into the league.
 *  3. Appends Filip to Grupa 1 `playerIds` (or fills a free null slot).
 *  4. Generates ONLY the new pairings (Filip vs each existing Grupa 1 player)
 *     as `not_scheduled`. Existing draw + played results are left untouched.
 *  5. Recalculates rankings (Filip enters with 0).
 *
 * Idempotent: refuses to run again if a "Filip" enrollment already exists.
 * Superadmin only. Run once.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../../../layouts/AppLayout.jsx'
import { Container, SectionTitle, Button, Card, Alert } from '../../../ui/index.js'
import { useAuthContext } from '../../auth/context/AuthContext.jsx'
import {
  playersRepository,
  leagueEnrollmentRepository,
  leagueGroupsRepository,
  roundsRepository,
  matchesRepository,
} from '../../../infrastructure/firestore.js'
import { recalculateRankings } from '../../rankings/services/rankingService.js'

const LEAGUE_ID = 'ISqXpeuT13uGvKCltOm0'
const GROUP_POSITION = 1 // Grupa 1 = Group A
const PLAYER_NAME = 'Filip'

async function runMigration(userId, log) {
  const groupsRepo = leagueGroupsRepository(LEAGUE_ID)
  const enrollRepo = leagueEnrollmentRepository(LEAGUE_ID)

  // ── Idempotency guard ────────────────────────────────────────────────────
  const enrollments = await enrollRepo.getAll()
  if (enrollments.some((e) => (e.playerName || '').trim() === PLAYER_NAME)) {
    throw new Error(`"${PLAYER_NAME}" je već prijavljen u ovu ligu. Migracija se ne ponavlja.`)
  }

  // ── Resolve Grupa 1 + its round ──────────────────────────────────────────
  log('Učitavam grupe i runde...')
  const groups = await groupsRepo.getAll()
  const groupA =
    groups.find((g) => g.position === GROUP_POSITION) ||
    [...groups].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))[0]
  if (!groupA) throw new Error('Grupa 1 nije pronađena.')

  const rounds = await roundsRepository('leagues', LEAGUE_ID).getAll()
  const round = rounds.find((r) => r.groupId === groupA.id && r.type === 'round_robin')
  if (!round) throw new Error('Round-robin runda za Grupu 1 nije pronađena.')

  const currentCount = groupA.playerIds.filter((x) => x !== null).length
  log(`Grupa "${groupA.name}" — trenutno ${currentCount} igrača.`)

  // ── Create the new player ────────────────────────────────────────────────
  log(`Kreiram igrača "${PLAYER_NAME}"...`)
  const player = await playersRepository.create({
    name: PLAYER_NAME,
    avatarUrls: null,
    authUid: null,
    email: null,
    createdBy: userId,
  })
  const filipId = player.id
  log(`✓ Igrač kreiran (${filipId}).`)

  // ── Enroll into league ───────────────────────────────────────────────────
  await enrollRepo.create({
    playerId: filipId,
    playerName: PLAYER_NAME,
    playerEmail: null,
    status: 'active',
    enrolledAt: new Date().toISOString(),
    enrolledBy: userId,
  })
  log('✓ Prijavljen u ligu.')

  // ── Place into group: fill first free slot, else append ──────────────────
  const arr = [...groupA.playerIds]
  const nullIdx = arr.findIndex((x) => x === null)
  let position
  let mode
  if (nullIdx >= 0) {
    arr[nullIdx] = filipId
    position = nullIdx + 1
    mode = 'fill'
  } else {
    arr.push(filipId)
    position = arr.length
    mode = 'append'
  }
  await groupsRepo.update(groupA.id, { playerIds: arr })
  log(`✓ Dodat na poziciju ${position} (mode: ${mode}).`)

  // ── Match slots ──────────────────────────────────────────────────────────
  const mRepo = matchesRepository('leagues', LEAGUE_ID, round.id)

  if (mode === 'fill') {
    // A generated slot referencing this empty position already exists — just
    // stamp Filip's id onto it. Preserves everything else.
    const matches = await mRepo.getAll()
    let touched = 0
    for (const m of matches) {
      if (m.player1Position === position && m.player1Id == null) {
        await mRepo.update(m.id, { player1Id: filipId })
        touched++
      } else if (m.player2Position === position && m.player2Id == null) {
        await mRepo.update(m.id, { player2Id: filipId })
        touched++
      }
    }
    log(`✓ Popunjeno ${touched} postojećih slotova za poziciju ${position}.`)
  } else {
    // New position — create one slot per existing player. Existing 45 matches
    // (incl. odigrani rezultati) stay untouched.
    let created = 0
    for (let p = 1; p < position; p++) {
      const opponentId = arr[p - 1]
      if (opponentId == null) continue // skip empty slots, no opponent
      await mRepo.create({
        competitionId: LEAGUE_ID,
        competitionType: 'league',
        roundId: round.id,
        groupId: groupA.id,
        player1Position: p,
        player2Position: position,
        player1Id: opponentId,
        player2Id: filipId,
        status: 'not_scheduled',
        scheduledAt: null,
        generated: true,
      })
      created++
    }
    log(`✓ Kreirano ${created} novih mečeva (Filip vs postojeći igrači) — not scheduled.`)
  }

  // ── Rankings ─────────────────────────────────────────────────────────────
  log('Preračunavam rang listu...')
  const allEnrollments = await enrollRepo.getAll()
  await recalculateRankings('leagues', LEAGUE_ID, allEnrollments)
  log('Done!')

  return filipId
}

export default function AdminAddFilipCiklus2Page() {
  const { user, isSuperadmin } = useAuthContext()
  const navigate = useNavigate()
  const [status, setStatus] = useState('idle')
  const [logs, setLogs] = useState([])

  function log(msg) {
    setLogs((prev) => [...prev, msg])
  }

  async function handleRun() {
    setStatus('running')
    setLogs([])
    try {
      await runMigration(user.uid, log)
      setStatus('done')
    } catch (err) {
      log(`Error: ${err.message}`)
      setStatus('error')
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
          title="Migracija: Dodaj Filipa u Grupu 1"
          subtitle="Play Liga 2026 Ciklus 2 — novi igrač u Grupu A, žreb i rezultati ostaju."
          eyebrow="Admin / One-time"
        />

        <div className="mt-8 max-w-lg space-y-4">
          <Card>
            <p className="mb-2 text-sm font-medium text-text">Šta radi migracija:</p>
            <ul className="space-y-1 text-sm text-text-light">
              <li>• Kreira novog igrača „Filip“ (bez naloga)</li>
              <li>• Prijavljuje ga u ligu i dodaje u Grupu 1 (poz. 11)</li>
              <li>• Generiše samo nove mečeve: Filip vs svaki postojeći igrač (not scheduled)</li>
              <li className="text-amber-600">• Postojeći žreb i odigrani rezultati se NE diraju</li>
              <li>• Preračunava rang listu (Filip kreće sa 0)</li>
            </ul>
            <p className="mt-3 text-xs text-amber-600">Pokreni samo jednom.</p>
          </Card>

          {logs.length > 0 && (
            <Card className="max-h-72 overflow-y-auto font-mono text-xs">
              {logs.map((l, i) => (
                <div
                  key={i}
                  className={
                    l.startsWith('Error')
                      ? 'text-rose-600'
                      : l.startsWith('Done')
                        ? 'text-green-600'
                        : 'text-text-light'
                  }
                >
                  {l.startsWith('Done') ? '✓ ' : l.startsWith('Error') ? '✗ ' : '→ '}
                  {l}
                </div>
              ))}
            </Card>
          )}

          <div className="flex flex-wrap gap-3">
            {(status === 'idle' || status === 'error') && (
              <Button onClick={handleRun}>{status === 'error' ? 'Retry' : 'Run Migration'}</Button>
            )}
            {status === 'running' && (
              <Button disabled loading loadingLabel="Running...">
                Running...
              </Button>
            )}
            {status === 'done' && (
              <>
                <Button variant="outline" onClick={() => navigate(`/leagues/${LEAGUE_ID}`)}>
                  Open League
                </Button>
                <span className="self-center text-sm text-green-600">Migracija gotova</span>
              </>
            )}
            <Button variant="ghost" onClick={() => navigate(-1)}>
              Back
            </Button>
          </div>
        </div>
      </Container>
    </AppLayout>
  )
}
