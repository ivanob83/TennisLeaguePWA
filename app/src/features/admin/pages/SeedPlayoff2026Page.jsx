/**
 * One-time seed page: Playoff 2026
 *
 * Builds a 16-player single-elimination knockout tournament from the combined
 * "Playoff Race 2026" ranking (Play Liga 2026 Ciklus 1 + Ciklus 2).
 *
 * Selection: aggregate rankings across both leagues (by playerId, then by
 * normalized name), sort (points → set ratio → wins → setsWon), EXCLUDE
 * "Ivan Obradovic", then take the top 16 (so the 17th is promoted in).
 *
 * Bracket: Osmina finala (R16, 8 matches) → Četvrtfinale (QF, 4) → Polufinale
 * (SF, 2) → Finale (1). R16 seeded best-vs-worst using standard bracket order
 * (1v16, 8v9, 5v12, 4v13, 3v14, 6v11, 7v10, 2v15) so seeds 1 and 2 can only
 * meet in the final. Later rounds are empty slots to be filled as winners advance.
 *
 * Superadmin only. Run once — button is disabled after success.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../../../layouts/AppLayout.jsx'
import { Container, SectionTitle, Button, Card, Alert } from '../../../ui/index.js'
import { useAuthContext } from '../../auth/context/AuthContext.jsx'
import { deleteCompetition } from '../../enrollment/services/competitionDelete.js'
import { where, collection, getDocs } from 'firebase/firestore'
import { db } from '../../../infrastructure/firebase.js'
import {
  seasonsRepository,
  leaguesRepository,
  tournamentsRepository,
  tournamentEnrollmentRepository,
  roundsRepository,
  matchesRepository,
} from '../../../infrastructure/firestore.js'
import { recalculateRankings } from '../../rankings/services/rankingService.js'

const TOURNAMENT_NAME = 'Playoff 2026'
const SOURCE_LEAGUES = ['Play Liga 2026 Ciklus 1', 'Play Liga 2026 Ciklus 2']
const EXCLUDE_NAMES = ['ivan obradovic'] // normalized (lowercase, trimmed)

// Standard 16-player bracket seed order (1-based seed ranks).
// Pairs best vs worst; seeds 1 & 2 land in opposite halves.
const R16_SEED_PAIRS = [
  [1, 16],
  [8, 9],
  [5, 12],
  [4, 13],
  [3, 14],
  [6, 11],
  [7, 10],
  [2, 15],
]

const norm = (s) => (s ?? '').trim().toLowerCase()

function setRatio(e) {
  const total = (e.setsWon ?? 0) + (e.setsLost ?? 0)
  return total > 0 ? (e.setsWon ?? 0) / total : 0
}

// ─── Ranking aggregation (mirrors RankingsPage playoff2026 view) ────────────────
async function computeTop16(log) {
  const leagues = []
  for (const name of SOURCE_LEAGUES) {
    const found = await leaguesRepository.query([where('name', '==', name)])
    if (found.length === 0) throw new Error(`Liga "${name}" nije pronađena.`)
    leagues.push(found[0])
  }

  // First pass: aggregate by playerId
  const byId = {}
  for (const lg of leagues) {
    const snap = await getDocs(collection(db, `leagues/${lg.id}/rankings`))
    for (const d of snap.docs) {
      const {
        playerId,
        playerName,
        points = 0,
        wins = 0,
        losses = 0,
        matchesPlayed = 0,
        setsWon = 0,
        setsLost = 0,
      } = d.data()
      if (!playerId) continue
      if (!byId[playerId]) {
        byId[playerId] = {
          playerId,
          playerName,
          points: 0,
          wins: 0,
          losses: 0,
          matchesPlayed: 0,
          setsWon: 0,
          setsLost: 0,
        }
      }
      const a = byId[playerId]
      a.points += points
      a.wins += wins
      a.losses += losses
      a.matchesPlayed += matchesPlayed
      a.setsWon += setsWon
      a.setsLost += setsLost
    }
  }

  // Second pass: merge by normalized name (same person, different playerIds)
  const byName = {}
  for (const e of Object.values(byId)) {
    const key = norm(e.playerName)
    if (!key) continue
    if (!byName[key]) {
      byName[key] = { ...e }
    } else {
      const b = byName[key]
      b.points += e.points
      b.wins += e.wins
      b.losses += e.losses
      b.matchesPlayed += e.matchesPlayed
      b.setsWon += e.setsWon
      b.setsLost += e.setsLost
    }
  }

  const sorted = Object.values(byName).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    const r = setRatio(b) - setRatio(a)
    if (r !== 0) return r
    if (b.wins !== a.wins) return b.wins - a.wins
    return (b.setsWon ?? 0) - (a.setsWon ?? 0)
  })

  const filtered = sorted.filter((e) => !EXCLUDE_NAMES.includes(norm(e.playerName)))
  const top16 = filtered.slice(0, 16)
  if (top16.length < 16) {
    throw new Error(`Samo ${top16.length} igrača dostupno (posle izuzimanja), treba 16.`)
  }

  log('Odabrano top 16 (seed → igrač → poeni):')
  top16.forEach((p, i) => log(`  ${i + 1}. ${p.playerName} — ${p.points} pts`))

  return { top16, seasonId: leagues[0].seasonId }
}

// ─── Knockout round builders ────────────────────────────────────────────────────
async function createR16Round(tid, rRepo, top16) {
  const round = await rRepo.create({
    competitionId: tid,
    competitionType: 'tournament',
    roundNumber: 1,
    name: 'Osmina finala',
    type: 'knockout',
    groupId: null,
    status: 'scheduled',
  })
  const mRepo = matchesRepository('tournaments', tid, round.id)
  for (let i = 0; i < R16_SEED_PAIRS.length; i++) {
    const [s1, s2] = R16_SEED_PAIRS[i]
    const p1 = top16[s1 - 1]
    const p2 = top16[s2 - 1]
    await mRepo.create({
      competitionId: tid,
      competitionType: 'tournament',
      competitionName: TOURNAMENT_NAME,
      roundId: round.id,
      groupId: null,
      label: `R16-${i + 1}`,
      player1Position: s1,
      player2Position: s2,
      player1Id: p1.playerId,
      player2Id: p2.playerId,
      player1Name: p1.playerName,
      player2Name: p2.playerName,
      status: 'not_scheduled',
      scores: null,
      winnerId: null,
      scheduledAt: null,
      generated: true,
    })
  }
}

async function createEmptyRound(tid, rRepo, { roundNumber, name, count, labels }) {
  const round = await rRepo.create({
    competitionId: tid,
    competitionType: 'tournament',
    roundNumber,
    name,
    type: 'knockout',
    groupId: null,
    status: 'scheduled',
  })
  const mRepo = matchesRepository('tournaments', tid, round.id)
  for (let i = 0; i < count; i++) {
    await mRepo.create({
      competitionId: tid,
      competitionType: 'tournament',
      competitionName: TOURNAMENT_NAME,
      roundId: round.id,
      groupId: null,
      label: labels[i],
      player1Position: null,
      player2Position: null,
      player1Id: null,
      player2Id: null,
      player1Name: null,
      player2Name: null,
      status: 'not_scheduled',
      scores: null,
      winnerId: null,
      scheduledAt: null,
      generated: true,
    })
  }
}

// ─── Cleanup ────────────────────────────────────────────────────────────────────
async function runCleanup(log) {
  log('Tražim postojeći turnir...')
  const existing = await tournamentsRepository.query([where('name', '==', TOURNAMENT_NAME)])
  if (existing.length === 0) {
    log('Nema šta da se briše.')
    return
  }
  for (const t of existing) {
    log(`Brišem turnir ${t.id}...`)
    await deleteCompetition(t.id, 'tournaments')
  }
  log('Cleanup gotov.')
}

// ─── Seeder ─────────────────────────────────────────────────────────────────────
async function runSeed(userId, log) {
  log('Provera postojećih podataka...')
  const existing = await tournamentsRepository.query([where('name', '==', TOURNAMENT_NAME)])
  if (existing.length > 0) {
    throw new Error(`Turnir "${TOURNAMENT_NAME}" već postoji. Obriši ga pre ponovnog seed-a.`)
  }

  log('Računam kombinovani ranking (Ciklus 1 + Ciklus 2)...')
  const { top16, seasonId } = await computeTop16(log)

  log('Učitavam sezonu...')
  const season = seasonId ? await seasonsRepository.getById(seasonId) : null
  const startDate = season?.startDate || '2026-01-01'
  const endDate = season?.endDate || '2026-12-31'

  log('Kreiram turnir...')
  const tournament = await tournamentsRepository.create({
    seasonId: season?.id || null,
    name: TOURNAMENT_NAME,
    format: 'knockout',
    numGroups: null,
    playersPerGroup: null,
    pointsPerWin: null,
    pointsPerLoss: null,
    numPlayers: 16,
    seededPlayerIds: top16.map((p) => p.playerId),
    startDate,
    endDate,
    rules: 'Single elimination. 16 igrača iz Playoff Race 2026 (bez Ivana Obradovica).',
    organizerId: userId,
    status: 'draft',
  })
  const tid = tournament.id

  log('Prijavljujem 16 igrača...')
  const enrollRepo = tournamentEnrollmentRepository(tid)
  for (const p of top16) {
    await enrollRepo.create({
      playerId: p.playerId,
      playerName: p.playerName,
      playerEmail: null,
      status: 'active',
      enrolledAt: new Date().toISOString(),
      enrolledBy: userId,
    })
  }

  const rRepo = roundsRepository('tournaments', tid)

  log('Kreiram Osminu finala (žreb 1v16 ...)...')
  await createR16Round(tid, rRepo, top16)

  log('Kreiram Četvrtfinale...')
  await createEmptyRound(tid, rRepo, {
    roundNumber: 2,
    name: 'Četvrtfinale',
    count: 4,
    labels: ['QF1', 'QF2', 'QF3', 'QF4'],
  })

  log('Kreiram Polufinale...')
  await createEmptyRound(tid, rRepo, {
    roundNumber: 3,
    name: 'Polufinale',
    count: 2,
    labels: ['SF1', 'SF2'],
  })

  log('Kreiram Finale...')
  await createEmptyRound(tid, rRepo, {
    roundNumber: 4,
    name: 'Finale',
    count: 1,
    labels: ['Final'],
  })

  log('Inicijalizujem rankings...')
  const enrollments = top16.map((p) => ({ playerId: p.playerId, playerName: p.playerName }))
  await recalculateRankings('tournaments', tid, enrollments)

  log('Gotovo!')
  return tid
}

// ─── Component ──────────────────────────────────────────────────────────────────
export default function SeedPlayoff2026Page() {
  const { user, isSuperadmin } = useAuthContext()
  const navigate = useNavigate()
  const [status, setStatus] = useState('idle') // idle | running | done | error
  const [logs, setLogs] = useState([])
  const [tid, setTid] = useState(null)

  const addLog = (msg) => setLogs((prev) => [...prev, msg])

  if (!isSuperadmin) {
    return (
      <AppLayout>
        <Container className="py-8">
          <Alert variant="error">Samo superadmin može pokrenuti seed.</Alert>
        </Container>
      </AppLayout>
    )
  }

  async function handleSeed() {
    setStatus('running')
    setLogs([])
    try {
      const id = await runSeed(user.uid, addLog)
      setTid(id)
      setStatus('done')
    } catch (err) {
      addLog(`GREŠKA: ${err.message}`)
      setStatus('error')
    }
  }

  async function handleCleanup() {
    setStatus('running')
    setLogs([])
    try {
      await runCleanup(addLog)
      setStatus('idle')
    } catch (err) {
      addLog(`GREŠKA: ${err.message}`)
      setStatus('error')
    }
  }

  return (
    <AppLayout>
      <Container className="py-8">
        <SectionTitle
          title="Seed: Playoff 2026"
          subtitle="16 najboljih iz Playoff Race 2026 (bez Ivana Obradovica) → knockout bracket"
        />

        <div className="mt-8 max-w-2xl space-y-6">
          <Card>
            <h3 className="mb-2 font-semibold text-text">Šta pravi</h3>
            <ul className="space-y-1 text-sm text-text-light">
              <li>• Kombinuje ranking iz {SOURCE_LEAGUES.join(' + ')}</li>
              <li>• Izuzima Ivana Obradovica, uzima top 16 (17. ulazi)</li>
              <li>• Turnir „{TOURNAMENT_NAME}“ — format knockout, 16 igrača</li>
              <li>• Osmina (8) → Četvrt (4) → Polu (2) → Finale (1)</li>
              <li>• Žreb: 1v16, 8v9, 5v12, 4v13, 3v14, 6v11, 7v10, 2v15</li>
            </ul>
          </Card>

          <div className="flex gap-3">
            <Button onClick={handleSeed} loading={status === 'running'} disabled={status === 'done'}>
              Pokreni seed
            </Button>
            <Button variant="ghost" onClick={handleCleanup} disabled={status === 'running'}>
              Obriši „{TOURNAMENT_NAME}“
            </Button>
            {status === 'done' && tid && (
              <Button variant="secondary" onClick={() => navigate(`/tournaments/${tid}`)}>
                Otvori turnir →
              </Button>
            )}
          </div>

          {status === 'done' && <Alert variant="success">Turnir uspešno kreiran.</Alert>}
          {status === 'error' && <Alert variant="error">Seed nije uspeo. Vidi log.</Alert>}

          {logs.length > 0 && (
            <Card>
              <pre className="max-h-96 overflow-auto whitespace-pre-wrap text-xs text-text-light">
                {logs.join('\n')}
              </pre>
            </Card>
          )}
        </div>
      </Container>
    </AppLayout>
  )
}
