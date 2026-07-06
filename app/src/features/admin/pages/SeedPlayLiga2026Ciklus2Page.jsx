/**
 * One-time seed page: Play Liga 2026 — Ciklus 2
 * Format: round_robin — 2 tiered groups (Grupa 1 = 100%, Grupa 2 = 75%)
 * Fresh empty schedule: all pairings generated as `not_scheduled` (no results).
 * Roster derived from Play Liga 2026 Ciklus 1 standing (see
 *   agents/next-features/05-play-liga-2026-ciklus1-plan.md).
 * Season reused: "2026". Nothing from Ciklus 1 is deleted.
 * Superadmin only. Run once.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { where } from 'firebase/firestore'
import AppLayout from '../../../layouts/AppLayout.jsx'
import { Container, SectionTitle, Button, Card, Alert } from '../../../ui/index.js'
import { useAuthContext } from '../../auth/context/AuthContext.jsx'
import { deleteCompetition } from '../../enrollment/services/competitionDelete.js'
import {
  seasonsRepository,
  leaguesRepository,
  leagueEnrollmentRepository,
  leagueGroupsRepository,
  roundsRepository,
  matchesRepository,
} from '../../../infrastructure/firestore.js'
import { recalculateRankings } from '../../rankings/services/rankingService.js'

const LEAGUE_NAME = 'Play Liga 2026 Ciklus 2'
const SEASON_NAME = '2026'

// ─── Groups & players ─────────────────────────────────────────────────────────
// Fixed playerIds resolved from Play Liga 2026 Ciklus 1 enrollments (exact docs,
// avoids name-collision duplicates e.g. "Milos" ≠ "Milos Simovic").

const GROUPS = [
  {
    name: 'Grupa 1',
    position: 1,
    rankingMultiplier: 1.0,
    players: [
      { id: 'FR9RnBVN9FliMm2ywXur', name: 'Nikola Samardzic' },
      { id: 'Gwcdg4DLl8sCKAn6RkoT', name: 'Mirko' },
      { id: '4RJzlWzKnPKOIZvOBnqm', name: 'D. Stamenovic' },
      { id: 'KMPrusa87U284STYagTD', name: 'Nenad Jankovic' },
      { id: 'kLuWn0EVhUWdnVxvEI7B', name: 'Aleksandar Jovanovic' },
      { id: 'x4tNVA8u6jFYwUhfvCG7', name: 'Ivan Blagojevic' },
      { id: 'Q8IgAeD4dkR9HaCbkULy', name: 'Marko Obrenovic' },
      { id: 'h0scnxUrtl22QeYpMTvu', name: 'Ivan Suvacarevic' },
      { id: 'oBjx7lXRCv8YIECbJoMW', name: 'Miljan Milenkovic' },
      { id: 'hYKxIwmIHVaB6stuDy45', name: 'Muza' }, // novi
    ],
  },
  {
    name: 'Grupa 2',
    position: 2,
    rankingMultiplier: 0.75,
    players: [
      { id: '1sIvZYl1tczofWp5igce', name: 'Janko Djuric' },
      { id: 'bYIHDVJ4CgNXvQg4wwJr', name: 'Nikola Jeremic' },
      { id: '1Xi1uBSzpltrhxDmzgMA', name: 'Milos' },
      { id: '5kg6EcbbTnardvCjfUbq', name: 'Goran' },
      { id: '5LTni4zBRoYxDZk0ZUUn', name: 'Bojan Cicic' },
      { id: 'icbHAJ9i6PEoCisTJuKd', name: 'Ivan Obradovic' },
      { id: 'SmU5pMbp0Y7T7VH3D7rz', name: 'Mihajlo Jeremic' },
      { id: '7Z7uxQKYZwghcBHL4qjM', name: 'Pedja Standard' },
      { id: 'l5NnnC9BBwcF0WF8tOz8', name: 'Miroslav Simovic' },
      { id: 'p3JAGPO6vuPf80g61T7z', name: 'Bojan Milinkovic' },
    ],
  },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

// All unordered pairs (round-robin, each pair once). Positions are 1-based.
function roundRobinPairs(n) {
  const pairs = []
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      pairs.push({ p1: i, p2: j })
    }
  }
  return pairs
}

async function createGroupWithEmptySchedule({ lid, groupsRepo, rRepo, group, roundNumber }) {
  const { name, position, rankingMultiplier, players } = group
  const groupDoc = await groupsRepo.create({
    competitionId: lid,
    competitionType: 'league',
    name,
    position,
    playerIds: players.map((p) => p.id),
    rankingMultiplier,
  })

  const round = await rRepo.create({
    competitionId: lid,
    competitionType: 'league',
    roundNumber,
    name: `${name} Round Robin`,
    type: 'round_robin',
    groupId: groupDoc.id,
    status: 'scheduled',
  })

  const mRepo = matchesRepository('leagues', lid, round.id)
  const pairs = roundRobinPairs(players.length)
  for (const { p1, p2 } of pairs) {
    await mRepo.create({
      competitionId: lid,
      competitionType: 'league',
      roundId: round.id,
      groupId: groupDoc.id,
      player1Position: p1 + 1,
      player2Position: p2 + 1,
      player1Id: players[p1].id,
      player2Id: players[p2].id,
      status: 'not_scheduled',
      scheduledAt: null,
      generated: true,
    })
  }
  return pairs.length
}

// ─── Cleanup & Seed ──────────────────────────────────────────────────────────

async function runCleanup(log) {
  log('Looking for existing league...')
  const existing = await leaguesRepository.query([where('name', '==', LEAGUE_NAME)])
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
  const existingLeagues = await leaguesRepository.query([where('name', '==', LEAGUE_NAME)])
  if (existingLeagues.length > 0) {
    throw new Error(`League "${LEAGUE_NAME}" already exists. Delete it first before re-seeding.`)
  }

  log(`Resolving season ${SEASON_NAME}...`)
  const existingSeasons = await seasonsRepository.query([where('name', '==', SEASON_NAME)])
  if (existingSeasons.length === 0) {
    throw new Error(`Season "${SEASON_NAME}" not found — create it first.`)
  }
  const season = existingSeasons[0]

  log('Creating league...')
  const league = await leaguesRepository.create({
    seasonId: season.id,
    name: LEAGUE_NAME,
    format: 'round_robin',
    numGroups: 2,
    playersPerGroup: 10,
    pointsPerWin: 3,
    pointsPerLoss: 1,
    numPlayers: null,
    seededPlayerIds: null,
    tierMultipliers: [1.0, 0.75],
    promotionCount: 2,
    relegationCount: 2,
    rules:
      'Best of 3 sets. 3rd set = super tiebreak. Grupa 1 = 100%, Grupa 2 = 75% ranking points. Top 2 promoted, bottom 2 relegated.',
    organizerId: userId,
    status: 'active',
  })
  const lid = league.id

  log('Enrolling players...')
  const enrollRepo = leagueEnrollmentRepository(lid)
  for (const g of GROUPS) {
    for (const p of g.players) {
      await enrollRepo.create({
        playerId: p.id,
        playerName: p.name,
        playerEmail: null,
        status: 'active',
        enrolledAt: new Date().toISOString(),
        enrolledBy: userId,
      })
    }
  }

  const groupsRepo = leagueGroupsRepository(lid)
  const rRepo = roundsRepository('leagues', lid)

  for (let gi = 0; gi < GROUPS.length; gi++) {
    const g = GROUPS[gi]
    const count = await createGroupWithEmptySchedule({
      lid,
      groupsRepo,
      rRepo,
      group: g,
      roundNumber: gi + 1,
    })
    log(`Created ${g.name}: ${g.players.length} players, ${count} matches (not scheduled).`)
  }

  log('Initialising rankings (all zero)...')
  const enrollments = GROUPS.flatMap((g) =>
    g.players.map((p) => ({ playerId: p.id, playerName: p.name })),
  )
  await recalculateRankings('leagues', lid, enrollments)

  log('Done!')
  return lid
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function SeedPlayLiga2026Ciklus2Page() {
  const { user, isSuperadmin } = useAuthContext()
  const navigate = useNavigate()
  const [status, setStatus] = useState('idle')
  const [logs, setLogs] = useState([])
  const [leagueId, setLeagueId] = useState(null)

  function log(msg) {
    setLogs((prev) => [...prev, msg])
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
          title="Seed: Play Liga 2026 Ciklus 2"
          subtitle="2 tiered groups (Grupa 1=100%, Grupa 2=75%). 10+10 players. Prazan raspored."
          eyebrow="Admin / One-time"
        />

        <div className="mt-8 max-w-lg space-y-4">
          <Card>
            <p className="mb-2 text-sm font-medium text-text">Šta će biti kreirano:</p>
            <ul className="space-y-1 text-sm text-text-light">
              <li>• Season: 2026 (reuse postojeće)</li>
              <li>• Liga: Play Liga 2026 Ciklus 2 (Round Robin, 2 grupe, status active)</li>
              <li>• Grupa 1 (×1.0): 10 igrača, 45 mečeva — not scheduled</li>
              <li>• Grupa 2 (×0.75): 10 igrača, 45 mečeva — not scheduled</li>
              <li className="text-amber-600">• Ciklus 1 se NE briše — samo izvor rostera.</li>
            </ul>
            <p className="mt-3 text-xs text-amber-600">Run only once.</p>
          </Card>

          {logs.length > 0 && (
            <Card className="font-mono text-xs max-h-72 overflow-y-auto">
              {logs.map((l, i) => (
                <div
                  key={i}
                  className={
                    l.startsWith('Error')
                      ? 'text-rose-600'
                      : l.startsWith('Warning')
                        ? 'text-amber-600'
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
            {status === 'idle' && (
              <>
                <Button onClick={handleSeed}>Run Seed</Button>
                <Button variant="outline" onClick={handleCleanupAndSeed}>
                  Reset & Continue
                </Button>
              </>
            )}
            {status === 'running' && (
              <Button disabled loading loadingLabel="Running...">
                Running...
              </Button>
            )}
            {status === 'done' && (
              <>
                <Button variant="outline" onClick={() => navigate(`/leagues/${leagueId}`)}>
                  Open League
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setStatus('idle')
                    setLogs([])
                  }}
                >
                  Re-seed
                </Button>
                <span className="self-center text-sm text-green-600">Seeded successfully</span>
              </>
            )}
            {status === 'error' && (
              <>
                <Button onClick={handleSeed}>Retry</Button>
                <Button variant="outline" onClick={handleCleanupAndSeed}>
                  Reset & Continue
                </Button>
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
