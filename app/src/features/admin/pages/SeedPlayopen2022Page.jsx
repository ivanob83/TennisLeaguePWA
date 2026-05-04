/**
 * One-time seed page: PLAYOPEN Jun 2022
 * Format: round_robin_knockout — 2 groups of 4 (RR phase), then top 2 per group → knockout
 *
 * Data transcribed from the paper bracket image (competition-resources/PLAYOPEN Jun 2022.jpg).
 * Superadmin only. Run once — button is disabled after success.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../../../layouts/AppLayout.jsx'
import { Container, SectionTitle, Button, Card, Alert } from '../../../ui/index.js'
import { useAuthContext } from '../../auth/context/AuthContext.jsx'
import { deleteCompetition } from '../../enrollment/services/competitionDelete.js'
import { where, collectionGroup, getDocs } from 'firebase/firestore'
import { db } from '../../../infrastructure/firebase.js'
import {
  playersRepository,
  seasonsRepository,
  tournamentsRepository,
  tournamentEnrollmentRepository,
  tournamentGroupsRepository,
  roundsRepository,
  matchesRepository,
} from '../../../infrastructure/firestore.js'
import { recalculateRankings } from '../../rankings/services/rankingService.js'

// ─── Seed data ─────────────────────────────────────────────────────────────────
// Source: PLAYOPEN Jun 2022-grupe.jpg
// Format: round_robin_knockout — 4 groups of 4, top 2 per group → knockout (8 players)
// Scoring: single set per match

const PLAYERS = [
  // Group A (indices 0–3)
  { name: 'Cabric' },
  { name: 'Profa' },
  { name: 'Nikola A.' },
  { name: 'Saja' },
  // Group B (indices 4–7)
  { name: 'Dejan' },
  { name: 'Suvacarevic' },
  { name: 'Aleksa' },
  { name: 'Lazar' },
  // Group C (indices 8–11)
  { name: 'Stefan' },
  { name: 'Nikola Lazarevic' },
  { name: 'Aleksandar Jovanovic' },
  { name: 'Dule' },
  // Group D (indices 12–15)
  { name: 'Cvele' },
  { name: 'Andric' },
  { name: 'Skotski' },
  { name: 'Bojan Milinkovic' },
]

// winnerIdx = index into PLAYERS array
// scores = [{ player1: X, player2: Y }] — one set

const GROUP_A_MATCHES = [
  { p1: 0,  p2: 1,  scores: [{ player1: 3, player2: 6 }], winnerIdx: 1  }, // Cabric vs Profa
  { p1: 2,  p2: 3,  scores: [{ player1: 1, player2: 6 }], winnerIdx: 3  }, // Nikola A. vs Saja
  { p1: 0,  p2: 2,  scores: [{ player1: 6, player2: 0 }], winnerIdx: 0  }, // Cabric vs Nikola A.
  { p1: 1,  p2: 3,  scores: [{ player1: 3, player2: 6 }], winnerIdx: 3  }, // Profa vs Saja
  { p1: 0,  p2: 3,  scores: [{ player1: 6, player2: 2 }], winnerIdx: 0  }, // Cabric vs Saja
  { p1: 1,  p2: 2,  scores: [{ player1: 6, player2: 0 }], winnerIdx: 1  }, // Profa vs Nikola A.
]
// Standings: Cabric 2W (net +7), Profa 2W (net +6), Saja 2W (net +4), Nikola A. 0W
// Advancing: Cabric (1st), Profa (2nd)

const GROUP_B_MATCHES = [
  { p1: 4,  p2: 5,  scores: [{ player1: 0, player2: 6 }], winnerIdx: 5  }, // Dejan vs Suvacarevic
  { p1: 6,  p2: 7,  scores: [{ player1: 6, player2: 5 }], winnerIdx: 6  }, // Aleksa vs Lazar
  { p1: 4,  p2: 6,  scores: [{ player1: 7, player2: 6 }], winnerIdx: 4  }, // Dejan vs Aleksa
  { p1: 5,  p2: 7,  scores: [{ player1: 6, player2: 0 }], winnerIdx: 5  }, // Suvacarevic vs Lazar
  { p1: 4,  p2: 7,  scores: [{ player1: 2, player2: 6 }], winnerIdx: 7  }, // Dejan vs Lazar
  { p1: 5,  p2: 6,  scores: [{ player1: 6, player2: 1 }], winnerIdx: 5  }, // Suvacarevic vs Aleksa
]
// Standings: Suvacarevic 3W, Lazar 1W (net +3 in trio), Aleksa 1W, Dejan 1W (net -3)
// Advancing: Suvacarevic (1st), Lazar (2nd)

const GROUP_C_MATCHES = [
  { p1: 8,  p2: 9,  scores: [{ player1: 6, player2: 4 }], winnerIdx: 8  }, // Stefan vs Nikola L.
  { p1: 10, p2: 11, scores: [{ player1: 0, player2: 6 }], winnerIdx: 11 }, // Aleksandar J. vs Dule
  { p1: 8,  p2: 10, scores: [{ player1: 4, player2: 6 }], winnerIdx: 10 }, // Stefan vs Aleksandar J.
  { p1: 9,  p2: 11, scores: [{ player1: 3, player2: 6 }], winnerIdx: 11 }, // Nikola L. vs Dule
  { p1: 8,  p2: 11, scores: [{ player1: 1, player2: 6 }], winnerIdx: 11 }, // Stefan vs Dule
  { p1: 9,  p2: 10, scores: [{ player1: 0, player2: 6 }], winnerIdx: 10 }, // Nikola L. vs Aleksandar J.
]
// Standings: Dule 3W, Aleksandar J. 2W, Stefan 1W, Nikola L. 0W
// Advancing: Dule (1st), Aleksandar Jovanovic (2nd)

const GROUP_D_MATCHES = [
  { p1: 12, p2: 13, scores: [{ player1: 0, player2: 6 }], winnerIdx: 13 }, // Cvele vs Andric
  { p1: 14, p2: 15, scores: [{ player1: 6, player2: 0 }], winnerIdx: 14 }, // Skotski vs Bojan
  { p1: 12, p2: 14, scores: [{ player1: 5, player2: 7 }], winnerIdx: 14 }, // Cvele vs Skotski
  { p1: 13, p2: 15, scores: [{ player1: 6, player2: 3 }], winnerIdx: 13 }, // Andric vs Bojan
  { p1: 12, p2: 15, scores: [{ player1: 4, player2: 6 }], winnerIdx: 15 }, // Cvele vs Bojan
  { p1: 13, p2: 14, scores: [{ player1: 6, player2: 3 }], winnerIdx: 13 }, // Andric vs Skotski
]
// Standings: Andric 3W, Skotski 2W, Bojan 1W, Cvele 0W
// Advancing: Andric (1st), Skotski (2nd)

// Knockout — SF and Final confirmed
const KNOCKOUT_MATCHES = [
  // SF1: Cabric vs Dule — two sets, Dule wins
  { label: 'SF1', p1Name: 'Cabric', p2Name: 'Dule', status: 'finished', scores: [{ player1: 0, player2: 6 }, { player1: 1, player2: 6 }], winnerName: 'Dule' },
  // SF2: Suvacarevic vs Andric — walkover, Suvacarevic wins
  { label: 'SF2', p1Name: 'Suvacarevic', p2Name: 'Andric', status: 'walkover', scores: null, winnerName: 'Suvacarevic' },
  // Final: Dule vs Suvacarevic — two sets, Dule wins
  { label: 'Final', p1Name: 'Dule', p2Name: 'Suvacarevic', status: 'finished', scores: [{ player1: 6, player2: 2 }, { player1: 7, player2: 6 }], winnerName: 'Dule' },
]

// ─── Duplicate cleanup ─────────────────────────────────────────────────────────
async function removeDuplicatePlayers(log) {
  log('Fetching all players...')
  const allPlayers = await playersRepository.getAll()

  // Group by name
  const byName = {}
  for (const p of allPlayers) {
    const key = p.name?.trim().toLowerCase() || '__unnamed__'
    if (!byName[key]) byName[key] = []
    byName[key].push(p)
  }

  const duplicateGroups = Object.values(byName).filter(g => g.length > 1)
  if (duplicateGroups.length === 0) {
    log('No duplicate players found.')
    return 0
  }
  log(`Found ${duplicateGroups.length} name(s) with duplicates.`)

  log('Fetching all enrollments...')
  const enrollSnap = await getDocs(collectionGroup(db, 'enrollments'))
  const enrolledIds = new Set(enrollSnap.docs.map(d => d.data().playerId).filter(Boolean))
  log(`${enrolledIds.size} enrolled player IDs found.`)

  let deleted = 0
  for (const group of duplicateGroups) {
    const enrolled = group.filter(p => enrolledIds.has(p.id))
    const notEnrolled = group.filter(p => !enrolledIds.has(p.id))

    // Keep: enrolled ones (or if none enrolled, keep the first by creation order)
    const toDelete = enrolled.length > 0 ? notEnrolled : notEnrolled.slice(1)

    for (const p of toDelete) {
      log(`Deleting duplicate: "${p.name}" (${p.id})`)
      await playersRepository.delete(p.id)
      deleted++
    }
  }

  log(`Done. Deleted ${deleted} duplicate player(s).`)
  return deleted
}

// ─── Seeder ────────────────────────────────────────────────────────────────────
async function createGroupWithMatches({ tid, groupsRepo, rRepo, name, position, playerDocs, playerSlice, groupMatches, roundNumber, groupName }) {
  const group = await groupsRepo.create({
    competitionId: tid,
    competitionType: 'tournament',
    name,
    position,
    playerIds: playerSlice.map(p => p.id),
  })
  const round = await rRepo.create({
    competitionId: tid,
    competitionType: 'tournament',
    roundNumber,
    name: `${name} Round Robin`,
    type: 'round_robin',
    groupId: group.id,
    status: 'completed',
  })
  const mRepo = matchesRepository('tournaments', tid, round.id)
  for (let i = 0; i < groupMatches.length; i++) {
    const m = groupMatches[i]
    await mRepo.create({
      competitionId: tid,
      competitionType: 'tournament',
      competitionName: 'PLAYOPEN Jun 2022',
      roundId: round.id,
      groupId: group.id,
      player1Position: i + 1,
      player2Position: i + 1,
      player1Id: playerDocs[m.p1].id,
      player2Id: playerDocs[m.p2].id,
      player1Name: playerDocs[m.p1].name,
      player2Name: playerDocs[m.p2].name,
      groupName: groupName || name,
      status: 'finished',
      scores: m.scores,
      winnerId: playerDocs[m.winnerIdx].id,
      scheduledAt: null,
      generated: true,
    })
  }
}

async function runCleanup(log) {
  log('Looking for existing tournament...')
  const existing = await tournamentsRepository.query([where('name', '==', 'PLAYOPEN Jun 2022')])
  if (existing.length === 0) {
    log('Nothing to delete.')
  } else {
    for (const t of existing) {
      log(`Deleting tournament ${t.id}...`)
      await deleteCompetition(t.id, 'tournaments')
    }
  }

  log('Deleting seeded players...')
  for (const p of PLAYERS) {
    const found = await playersRepository.query([where('name', '==', p.name)])
    for (const player of found) {
      await playersRepository.delete(player.id)
    }
  }

  log('Cleanup done.')
}

async function runSeed(userId, log) {
  log('Checking for existing data...')
  const existingTournaments = await tournamentsRepository.query([where('name', '==', 'PLAYOPEN Jun 2022')])
  if (existingTournaments.length > 0) {
    throw new Error('Tournament "PLAYOPEN Jun 2022" already exists. Delete it first before re-seeding.')
  }

  log('Creating season...')
  const existingSeasons = await seasonsRepository.query([where('name', '==', '2022')])
  const season = existingSeasons.length > 0
    ? existingSeasons[0]
    : await seasonsRepository.create({
    name: '2022',
    startDate: '2022-01-01',
    endDate: '2022-12-31',
    status: 'completed',
    organizerId: userId,
  })

  log('Creating tournament...')
  const tournament = await tournamentsRepository.create({
    seasonId: season.id,
    name: 'PLAYOPEN Jun 2022',
    format: 'round_robin_knockout',
    numGroups: 4,
    playersPerGroup: 4,
    pointsPerWin: 2,
    pointsPerLoss: 0,
    numPlayers: null,
    seededPlayerIds: null,
    startDate: '2022-06-01',
    endDate: '2022-06-30',
    rules: 'Single set per match. Top 2 from each group advance to knockout.',
    organizerId: userId,
    status: 'completed',
  })
  const tid = tournament.id

  log('Creating players...')
  const playerDocs = []
  for (const p of PLAYERS) {
    const existing = await playersRepository.query([where('name', '==', p.name)])
    const doc = existing.length > 0
      ? existing[0]
      : await playersRepository.create({ name: p.name, email: null })
    playerDocs.push(doc)
  }

  log('Enrolling players...')
  const enrollRepo = tournamentEnrollmentRepository(tid)
  for (const p of playerDocs) {
    await enrollRepo.create({
      playerId: p.id,
      playerName: p.name,
      playerEmail: null,
      status: 'active',
      enrolledAt: new Date().toISOString(),
      enrolledBy: userId,
    })
  }

  log('Creating Group A matches...')
  const groupsRepo = tournamentGroupsRepository(tid)
  const rRepo = roundsRepository('tournaments', tid)
  await createGroupWithMatches({ tid, groupsRepo, rRepo, name: 'Group A', groupName: 'Group A', position: 1, playerDocs, playerSlice: playerDocs.slice(0, 4),  groupMatches: GROUP_A_MATCHES, roundNumber: 1 })

  log('Creating Group B matches...')
  await createGroupWithMatches({ tid, groupsRepo, rRepo, name: 'Group B', groupName: 'Group B', position: 2, playerDocs, playerSlice: playerDocs.slice(4, 8),  groupMatches: GROUP_B_MATCHES, roundNumber: 2 })

  log('Creating Group C matches...')
  await createGroupWithMatches({ tid, groupsRepo, rRepo, name: 'Group C', groupName: 'Group C', position: 3, playerDocs, playerSlice: playerDocs.slice(8, 12), groupMatches: GROUP_C_MATCHES, roundNumber: 3 })

  log('Creating Group D matches...')
  await createGroupWithMatches({ tid, groupsRepo, rRepo, name: 'Group D', groupName: 'Group D', position: 4, playerDocs, playerSlice: playerDocs.slice(12, 16), groupMatches: GROUP_D_MATCHES, roundNumber: 4 })

  log('Creating knockout phase slots...')
  const roundKO = await rRepo.create({
    competitionId: tid,
    competitionType: 'tournament',
    roundNumber: 5,
    name: 'Knockout Phase',
    type: 'knockout',
    groupId: null,
    status: 'scheduled',
  })
  const mRepoKO = matchesRepository('tournaments', tid, roundKO.id)
  for (let i = 0; i < KNOCKOUT_MATCHES.length; i++) {
    const m = KNOCKOUT_MATCHES[i]
    const p1 = m.p1Name ? playerDocs.find(p => p.name === m.p1Name) : null
    const p2 = m.p2Name ? playerDocs.find(p => p.name === m.p2Name) : null
    const winner = m.winnerName ? playerDocs.find(p => p.name === m.winnerName) : null
    await mRepoKO.create({
      competitionId: tid,
      competitionType: 'tournament',
      competitionName: 'PLAYOPEN Jun 2022',
      roundId: roundKO.id,
      groupId: null,
      label: m.label,
      player1Position: i + 1,
      player2Position: i + 1,
      player1Id: p1?.id || null,
      player2Id: p2?.id || null,
      player1Name: p1?.name || null,
      player2Name: p2?.name || null,
      status: m.status,
      scores: m.scores,
      winnerId: winner?.id || null,
      scheduledAt: null,
      generated: true,
    })
  }

  log('Calculating rankings...')
  const enrollments = playerDocs.map(p => ({ playerId: p.id, playerName: p.name }))
  await recalculateRankings('tournaments', tid, enrollments)

  log('Done!')
  return tid
}

// ─── Component ─────────────────────────────────────────────────────────────────
export default function SeedPlayopen2022Page() {
  const { user, isSuperadmin } = useAuthContext()
  const navigate = useNavigate()
  const [status, setStatus] = useState('idle') // idle | running | done | error
  const [logs, setLogs] = useState([])
  const [tournamentId, setTournamentId] = useState(null)
  const [cleanupStatus, setCleanupStatus] = useState('idle') // idle | running | done | error

  function log(msg) {
    setLogs(prev => [...prev, msg])
  }

  async function handleSeed() {
    setStatus('running')
    setLogs([])
    try {
      const tid = await runSeed(user.uid, log)
      setTournamentId(tid)
      setStatus('done')
    } catch (err) {
      log(`Error: ${err.message}`)
      setStatus('error')
    }
  }

  async function handleCleanupAndSeed() {
    setStatus('running')
    setLogs([])
    try {
      await runCleanup(log)
      const tid = await runSeed(user.uid, log)
      setTournamentId(tid)
      setStatus('done')
    } catch (err) {
      log(`Error: ${err.message}`)
      setStatus('error')
    }
  }

  async function handleRemoveDuplicates() {
    setCleanupStatus('running')
    setLogs([])
    try {
      await removeDuplicatePlayers(log)
      setCleanupStatus('done')
    } catch (err) {
      log(`Error: ${err.message}`)
      setCleanupStatus('error')
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
          title="Seed: PLAYOPEN Jun 2022"
          subtitle="Creates season, tournament, 8 players, groups, RR matches and knockout slots"
          eyebrow="Admin / One-time"
        />

        <div className="mt-8 max-w-lg space-y-4">
          <Card>
            <p className="mb-1 text-sm font-medium text-text">What will be created:</p>
            <ul className="space-y-1 text-sm text-text-light">
              <li>• Season: Summer 2022</li>
              <li>• Tournament: PLAYOPEN Jun 2022 (Round Robin + Knockout)</li>
              <li>• 16 players across 4 groups (4 players per group)</li>
              <li>• Group A: Cabric, Profa, Nikola A., Saja</li>
              <li>• Group B: Dejan, Suvacarevic, Aleksa, Lazar</li>
              <li>• Group C: Stefan, Nikola Lazarevic, Aleksandar Jovanovic, Dule</li>
              <li>• Group D: Cvele, Andric, Skotski, Bojan Milinkovic</li>
              <li>• 24 RR match results (all filled from image)</li>
              <li>• SF1: Cabric vs Dule → 0:6, 1:6 — Dule pobedio</li>
              <li>• SF2: Suvacarevic vs Andric → W/O — Suvacarevic</li>
              <li>• Final: Dule vs Suvacarevic → 6:2, 7:6 — Dule pobedio</li>
            </ul>
            <p className="mt-3 text-xs text-amber-600">
              Run only once.
            </p>
          </Card>

          <Card>
            <p className="mb-1 text-sm font-medium text-text">Cleanup duplicate players</p>
            <p className="mb-3 text-sm text-text-light">
              Removes players with the same name that are not enrolled in any competition.
              Keeps enrolled players; if none are enrolled, keeps the oldest.
            </p>
            <Button
              size="sm"
              variant="outline"
              loading={cleanupStatus === 'running'}
              loadingLabel="Running..."
              onClick={handleRemoveDuplicates}
            >
              Remove duplicate players
            </Button>
            {cleanupStatus === 'done' && (
              <span className="ml-3 text-sm text-green-600">Done</span>
            )}
            {cleanupStatus === 'error' && (
              <span className="ml-3 text-sm text-rose-600">Error — see log below</span>
            )}
          </Card>

          {logs.length > 0 && (
            <Card className="font-mono text-xs">
              {logs.map((l, i) => (
                <div key={i} className={l.startsWith('Error') ? 'text-rose-600' : 'text-text-light'}>
                  {l.startsWith('Done') ? '✓ ' : '→ '}{l}
                </div>
              ))}
            </Card>
          )}

          <div className="flex gap-3">
            {status === 'idle' && (
              <>
                <Button onClick={handleSeed}>Run Seed</Button>
                <Button variant="outline" onClick={handleCleanupAndSeed}>Reset & Continue</Button>
              </>
            )}
            {status === 'running' && (
              <Button disabled loading loadingLabel="Running...">Running...</Button>
            )}
            {status === 'done' && (
              <>
                <Button variant="outline" onClick={() => navigate(`/tournaments/${tournamentId}`)}>
                  Open Tournament
                </Button>
                <Button variant="ghost" onClick={() => { setStatus('idle'); setLogs([]) }}>Re-seed</Button>
                <span className="self-center text-sm text-green-600">Seeded successfully</span>
              </>
            )}
            {status === 'error' && (
              <>
                <Button onClick={handleSeed}>Retry</Button>
                <Button variant="outline" onClick={handleCleanupAndSeed}>Reset & Continue</Button>
              </>
            )}
            <Button variant="ghost" onClick={() => navigate(-1)}>Back</Button>
          </div>
        </div>
      </Container>
    </AppLayout>
  )
}
