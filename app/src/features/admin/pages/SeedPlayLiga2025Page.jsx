/**
 * One-time seed page: PLAYOFF 2025
 * Format: round_robin_knockout — 2 groups of 4 + knockout (SF + Final)
 * Source: liga.tc-play.rs/tournaments/381
 * Superadmin only. Run once — button is disabled after success.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { where } from 'firebase/firestore'
import AppLayout from '../../../layouts/AppLayout.jsx'
import { Container, SectionTitle, Button, Card, Alert } from '../../../ui/index.js'
import { useAuthContext } from '../../auth/context/AuthContext.jsx'
import { deleteCompetition } from '../../enrollment/services/competitionDelete.js'
import {
  playersRepository,
  seasonsRepository,
  leaguesRepository,
  leagueEnrollmentRepository,
  leagueGroupsRepository,
  roundsRepository,
  matchesRepository,
} from '../../../infrastructure/firestore.js'
import { recalculateRankings } from '../../rankings/services/rankingService.js'

// ─── Seed data ──────────────────────────────────────────────────────────────
// Source: liga.tc-play.rs/tournaments/381
// Format: round_robin_knockout — 2 groups of 4, group phase only
// Scoring: best of 2 sets (3rd set = super tiebreak if needed)

const PLAYERS = [
  // Group A (indices 0–3)
  { name: 'Aleksandar Jovanovic', existing: true },
  { name: 'Vuk Sebek',            existing: false },
  { name: 'Ivan Suvacarevic',     existing: true },
  { name: 'Ivan Blagojevic',      existing: false },
  // Group B (indices 4–7)
  { name: 'Marko Cvetkovski',     existing: false },
  { name: 'Jovica Mijailovic',    existing: false },
  { name: 'Miljan Milenkovic',    existing: false },
  { name: 'Ivan Obradovic',       existing: true },
]

// Group A — 6 matches across 3 rounds
const GROUP_A_MATCHES = [
  // Round 1
  { p1: 0, p2: 1, scores: [{ player1: 6, player2: 3 }, { player1: 6, player2: 1 }], winnerIdx: 0 }, // Jovanovic vs Sebek
  { p1: 2, p2: 3, scores: [{ player1: 7, player2: 5 }, { player1: 6, player2: 1 }], winnerIdx: 2 }, // Suvacarevic vs Blagojevic
  // Round 2
  { p1: 0, p2: 2, scores: [{ player1: 6, player2: 2 }, { player1: 6, player2: 2 }], winnerIdx: 0 }, // Jovanovic vs Suvacarevic
  { p1: 1, p2: 3, scores: [{ player1: 6, player2: 3 }, { player1: 6, player2: 2 }], winnerIdx: 1 }, // Sebek vs Blagojevic
  // Round 3
  { p1: 0, p2: 3, scores: [{ player1: 7, player2: 5 }, { player1: 6, player2: 1 }], winnerIdx: 0 }, // Jovanovic vs Blagojevic
  { p1: 1, p2: 2, scores: [{ player1: 6, player2: 1 }, { player1: 6, player2: 3 }], winnerIdx: 1 }, // Sebek vs Suvacarevic
]
// Standings: Jovanovic 3W, Sebek 2W, Suvacarevic 1W, Blagojevic 0W

// Group B — 6 matches across 3 rounds
const GROUP_B_MATCHES = [
  // Round 1
  { p1: 4, p2: 5, scores: [{ player1: 6, player2: 2 }, { player1: 6, player2: 3 }], winnerIdx: 4 }, // Cvetkovski vs Mijailovic
  { p1: 6, p2: 7, scores: [{ player1: 6, player2: 3 }, { player1: 6, player2: 2 }], winnerIdx: 6 }, // Milenkovic vs Obradovic
  // Round 2
  { p1: 4, p2: 6, scores: [{ player1: 7, player2: 5 }, { player1: 7, player2: 5 }], winnerIdx: 4 }, // Cvetkovski vs Milenkovic
  { p1: 5, p2: 7, scores: [{ player1: 6, player2: 2 }, { player1: 6, player2: 0 }], winnerIdx: 5 }, // Mijailovic vs Obradovic
  // Round 3
  { p1: 4, p2: 7, scores: [{ player1: 6, player2: 1 }, { player1: 6, player2: 3 }], winnerIdx: 4 }, // Cvetkovski vs Obradovic
  { p1: 5, p2: 6, scores: [{ player1: 6, player2: 2 }, { player1: 4, player2: 6 }, { player1: 10, player2: 3 }], winnerIdx: 5 }, // Mijailovic vs Milenkovic (super tiebreak)
]
// Standings: Cvetkovski 3W, Mijailovic 2W, Milenkovic 1W, Obradovic 0W

// Knockout phase
const KNOCKOUT_MATCHES = [
  // SF1: Mijailovic vs Jovanovic → Jovanovic wins
  { label: 'SF1', p1: 5, p2: 0, scores: null, winnerIdx: 0, status: 'finished' },
  // SF2: Cvetkovski vs Sebek → Cvetkovski wins
  { label: 'SF2', p1: 4, p2: 1, scores: null, winnerIdx: 4, status: 'finished' },
  // Final: Jovanovic vs Cvetkovski → Jovanovic wins 6-0 6-0
  { label: 'Final', p1: 0, p2: 4, scores: [{ player1: 6, player2: 0 }, { player1: 6, player2: 0 }], winnerIdx: 0, status: 'finished' },
]

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Find existing player by full name, then by last name (and update if found),
 * or create a new player as a fallback.
 */
async function findOrCreatePlayer(fullName, isExisting, log) {
  // Always check exact name first — prevents duplicates on re-seed
  let results = await playersRepository.query([where('name', '==', fullName)])
  if (results.length > 0) {
    log(`Found player: ${fullName} (${results[0].id})`)
    return results[0]
  }

  // For known existing players also try last-name-only match (legacy short names)
  if (isExisting) {
    const lastName = fullName.split(' ').slice(1).join(' ')
    if (lastName) {
      results = await playersRepository.query([where('name', '==', lastName)])
      if (results.length > 0) {
        log(`Updating "${lastName}" → "${fullName}" (${results[0].id})`)
        await playersRepository.update(results[0].id, { name: fullName })
        return { ...results[0], name: fullName }
      }
    }
    log(`Warning: "${fullName}" not found — creating new player`)
  } else {
    log(`Creating player: ${fullName}`)
  }

  return await playersRepository.create({ name: fullName, email: null })
}

async function createGroupWithMatches({ lid, groupsRepo, rRepo, name, position, playerDocs, playerSlice, groupMatches, roundNumber }) {
  const group = await groupsRepo.create({
    competitionId: lid,
    competitionType: 'league',
    name,
    position,
    playerIds: playerSlice.map(p => p.id),
  })
  const round = await rRepo.create({
    competitionId: lid,
    competitionType: 'league',
    roundNumber,
    name: `${name} Round Robin`,
    type: 'round_robin',
    groupId: group.id,
    status: 'completed',
  })
  const mRepo = matchesRepository('leagues', lid, round.id)
  for (let i = 0; i < groupMatches.length; i++) {
    const m = groupMatches[i]
    await mRepo.create({
      competitionId: lid,
      competitionType: 'league',
      competitionName: 'PLAYOFF 2025',
      roundId: round.id,
      groupId: group.id,
      player1Position: i + 1,
      player2Position: i + 1,
      player1Id: playerDocs[m.p1].id,
      player2Id: playerDocs[m.p2].id,
      player1Name: playerDocs[m.p1].name,
      player2Name: playerDocs[m.p2].name,
      groupName: name,
      status: 'finished',
      scores: m.scores,
      winnerId: playerDocs[m.winnerIdx].id,
      scheduledAt: null,
      generated: true,
    })
  }
}

// ─── Seed / Cleanup ─────────────────────────────────────────────────────────

async function runCleanup(log) {
  log('Looking for existing league...')
  const existing = await leaguesRepository.query([where('name', '==', 'PLAYOFF 2025')])
  if (existing.length === 0) {
    log('Nothing to delete.')
    return
  }
  for (const t of existing) {
    log(`Deleting league ${t.id}...`)
    await deleteCompetition(t.id, 'leagues')
  }
  log('Cleanup done.')
}

async function runSeed(userId, log) {
  log('Checking for existing data...')
  const existingLeagues = await leaguesRepository.query([where('name', '==', 'PLAYOFF 2025')])
  if (existingLeagues.length > 0) {
    throw new Error('League "PLAYOFF 2025" already exists. Delete it first before re-seeding.')
  }

  log('Resolving season 2025...')
  const existingSeasons = await seasonsRepository.query([where('name', '==', '2025')])
  const season = existingSeasons.length > 0
    ? existingSeasons[0]
    : await seasonsRepository.create({
        name: '2025',
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        status: 'active',
        organizerId: userId,
      })

  log('Creating league...')
  const league = await leaguesRepository.create({
    seasonId: season.id,
    name: 'PLAYOFF 2025',
    format: 'round_robin_knockout',
    numGroups: 2,
    playersPerGroup: 4,
    pointsPerWin: 2,
    pointsPerLoss: 0,
    displayOrder: 0,
    numPlayers: null,
    seededPlayerIds: null,
    startDate: '2025-10-01',
    endDate: '2025-12-31',
    rules: 'Best of 2 sets. 3rd set = super tiebreak. Top 2 from each group advance to knockout.',
    organizerId: userId,
    status: 'active',
  })
  const lid = league.id

  log('Resolving players...')
  const playerDocs = []
  for (const p of PLAYERS) {
    const doc = await findOrCreatePlayer(p.name, p.existing, log)
    playerDocs.push(doc)
  }

  log('Enrolling players...')
  const enrollRepo = leagueEnrollmentRepository(lid)
  for (const p of playerDocs) {
    await enrollRepo.create({
      playerId: p.id,
      playerName: p.name,
      playerEmail: p.email || null,
      status: 'active',
      enrolledAt: new Date().toISOString(),
      enrolledBy: userId,
    })
  }

  log('Creating Group A...')
  const groupsRepo = leagueGroupsRepository(lid)
  const rRepo = roundsRepository('leagues', lid)
  await createGroupWithMatches({ lid, groupsRepo, rRepo, name: 'Group A', position: 1, playerDocs, playerSlice: playerDocs.slice(0, 4), groupMatches: GROUP_A_MATCHES, roundNumber: 1 })

  log('Creating Group B...')
  await createGroupWithMatches({ lid, groupsRepo, rRepo, name: 'Group B', position: 2, playerDocs, playerSlice: playerDocs.slice(4, 8), groupMatches: GROUP_B_MATCHES, roundNumber: 2 })

  log('Creating knockout phase...')
  const roundKO = await rRepo.create({
    competitionId: lid,
    competitionType: 'league',
    roundNumber: 3,
    name: 'Knockout Phase',
    type: 'knockout',
    groupId: null,
    status: 'completed',
  })
  const mRepoKO = matchesRepository('leagues', lid, roundKO.id)
  for (let i = 0; i < KNOCKOUT_MATCHES.length; i++) {
    const m = KNOCKOUT_MATCHES[i]
    await mRepoKO.create({
      competitionId: lid,
      competitionType: 'league',
      competitionName: 'PLAYOFF 2025',
      roundId: roundKO.id,
      groupId: null,
      label: m.label,
      player1Position: i + 1,
      player2Position: i + 1,
      player1Id: playerDocs[m.p1].id,
      player2Id: playerDocs[m.p2].id,
      player1Name: playerDocs[m.p1].name,
      player2Name: playerDocs[m.p2].name,
      status: m.status,
      scores: m.scores,
      winnerId: playerDocs[m.winnerIdx].id,
      scheduledAt: null,
      generated: true,
    })
  }

  log('Calculating rankings...')
  const enrollments = playerDocs.map(p => ({ playerId: p.id, playerName: p.name }))
  await recalculateRankings('leagues', lid, enrollments)

  log('Done!')
  return lid
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function SeedPlayLiga2025Page() {
  const { user, isSuperadmin } = useAuthContext()
  const navigate = useNavigate()
  const [status, setStatus] = useState('idle')
  const [logs, setLogs] = useState([])
  const [leagueId, setLeagueId] = useState(null)

  function log(msg) {
    setLogs(prev => [...prev, msg])
  }

  async function handleSeed() {
    setStatus('running')
    setLogs([])
    try {
      const lid = await runSeed(user.uid, log)
      setLeagueId(lid)
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
      const lid = await runSeed(user.uid, log)
      setLeagueId(lid)
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
          title="Seed: PLAYOFF 2025"
          subtitle="Creates tournament, resolves/creates 8 players, group phase results"
          eyebrow="Admin / One-time"
        />

        <div className="mt-8 max-w-lg space-y-4">
          <Card>
            <p className="mb-1 text-sm font-medium text-text">Šta će biti kreirano:</p>
            <ul className="space-y-1 text-sm text-text-light">
              <li>• Season: 2025 (kreira ako ne postoji)</li>
              <li>• Tournament: PLAYOFF 2025 (Round Robin + Knockout)</li>
              <li>• Group A: Aleksandar Jovanovic, Vuk Sebek, Ivan Suvacarevic, Ivan Blagojevic</li>
              <li>• Group B: Marko Cvetkovski, Jovica Mijailovic, Miljan Milenkovic, Ivan Obradovic</li>
              <li>• 12 mečeva grupne faze (sve završeno)</li>
              <li>• SF1: Mijailovic vs Jovanovic → Jovanovic</li>
              <li>• SF2: Cvetkovski vs Sebek → Cvetkovski</li>
              <li>• Final: Jovanovic vs Cvetkovski → 6:0, 6:0 → Jovanovic</li>
              <li className="text-amber-600">• Postojeći igrači se traže po imenu — novi se kreiraju</li>
            </ul>
            <p className="mt-3 text-xs text-amber-600">Run only once.</p>
          </Card>

          {logs.length > 0 && (
            <Card className="font-mono text-xs">
              {logs.map((l, i) => (
                <div key={i} className={l.startsWith('Error') ? 'text-rose-600' : l.startsWith('Warning') ? 'text-amber-600' : 'text-text-light'}>
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
                <Button variant="outline" onClick={() => navigate(`/leagues/${leagueId}`)}>
                  Open League
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
