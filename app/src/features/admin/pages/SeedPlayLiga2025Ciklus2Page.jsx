/**
 * One-time seed page: Play Liga 2025 — Ciklus 2
 * Format: round_robin — 3 tiered groups (A=100%, B=75%, C=50%)
 * Promotion/relegation: top 2 promoted, bottom 2 relegated
 * Group A: 7 players — 14 played matches
 * Group B: 8 players — 14 played matches
 * Group C: 7 players —  2 played matches
 * Source: liga.tc-play.rs
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

const LEAGUE_NAME = 'Play Liga 2025 Ciklus 2'

// ─── Players ─────────────────────────────────────────────────────────────────
// Group A: 0–6 | Group B: 7–14 | Group C: 15–21

const PLAYERS = [
  // Group A
  { name: 'Aleksandar Jovanovic', existing: true }, // 0  A
  { name: 'Marko Cvetkovski', existing: true }, // 1  MC
  { name: 'Vuk Sebek', existing: true }, // 2  VS
  { name: 'Miljan Milenkovic', existing: true }, // 3  MM
  { name: 'Ivan Suvacarevic', existing: true }, // 4  IS
  { name: 'Petar Blagojevic', existing: true }, // 5  PB
  { name: 'Marko Obrenovic', existing: true }, // 6  MO
  // Group B
  { name: 'Jovica Mijailovic', existing: true }, // 7  JM
  { name: 'Ivan Blagojevic', existing: true }, // 8  IB
  { name: 'Bojan Cicic', existing: true }, // 9  BC
  { name: 'Ivan Obradovic', existing: true }, // 10 IO
  { name: 'D. Stamenovic', existing: false }, // 11 DS (first name unknown)
  { name: 'Milos Simovic', existing: true }, // 12 MS
  { name: 'Lazar Spasenic', existing: true }, // 13 LS
  { name: 'Goran', existing: true }, // 14 G  (surname unknown)
  // Group C
  { name: 'Nenad', existing: true }, // 15 N  (surname unknown)
  { name: 'Matija', existing: true }, // 16 M  (surname unknown)
  { name: 'Nikola 3M', existing: true }, // 17 N3 (nickname)
  { name: 'Blagoje Djukic', existing: true }, // 18 BD
  { name: 'Sasa Markovic', existing: true }, // 19 SM
  { name: 'Bojan Milinkovic', existing: true }, // 20 BM
  { name: 'M. Djelosevic', existing: false }, // 21 MD (first name unknown)
]

// ─── Match data ───────────────────────────────────────────────────────────────
// p1/p2/winnerIdx = LOCAL indices within each group's playerIndices array.
// 3rd set = super tiebreak where applicable.

const GROUPS = [
  {
    name: 'Group A',
    position: 1,
    rankingMultiplier: 1.0,
    // Local: A=0 MC=1 VS=2 MM=3 IS=4 PB=5 MO=6
    playerIndices: [0, 1, 2, 3, 4, 5, 6],
    matches: [
      // ── Round 1 ──────────────────────────────────────────────────────
      {
        p1: 0,
        p2: 1,
        winnerIdx: 0,
        scheduledAt: null,
        scores: [
          { player1: 7, player2: 5 },
          { player1: 6, player2: 1 },
        ],
      }, // A  def MC 7-5 6-1
      {
        p1: 2,
        p2: 3,
        winnerIdx: 2,
        scheduledAt: '2025-07-14T18:00',
        scores: [
          { player1: 7, player2: 6 },
          { player1: 5, player2: 7 },
          { player1: 10, player2: 3 },
        ],
      }, // VS def MM 7-6 5-7 10-3 (ST)
      // IS bye | PB vs MO not played
      // ── Round 2 ──────────────────────────────────────────────────────
      {
        p1: 0,
        p2: 2,
        winnerIdx: 0,
        scheduledAt: null,
        scores: [
          { player1: 6, player2: 0 },
          { player1: 6, player2: 2 },
        ],
      }, // A  def VS 6-0 6-2
      {
        p1: 5,
        p2: 3,
        winnerIdx: 3,
        scheduledAt: '2025-07-04T18:30',
        scores: [
          { player1: 5, player2: 7 },
          { player1: 4, player2: 6 },
        ],
      }, // MM def PB 7-5 6-4
      // MC bye | IS vs MO not played
      // ── Round 3 ──────────────────────────────────────────────────────
      {
        p1: 0,
        p2: 4,
        winnerIdx: 0,
        scheduledAt: null,
        scores: [
          { player1: 6, player2: 1 },
          { player1: 6, player2: 2 },
        ],
      }, // A  def IS 6-1 6-2
      {
        p1: 1,
        p2: 2,
        winnerIdx: 2,
        scheduledAt: null,
        scores: [
          { player1: 6, player2: 0 },
          { player1: 3, player2: 6 },
          { player1: 4, player2: 10 },
        ],
      }, // VS def MC 0-6 6-3 10-4 (ST)
      // PB bye | MM vs MO not played
      // ── Round 4 ──────────────────────────────────────────────────────
      {
        p1: 0,
        p2: 5,
        winnerIdx: 0,
        scheduledAt: '2025-07-09T18:00',
        scores: [
          { player1: 6, player2: 2 },
          { player1: 6, player2: 4 },
        ],
      }, // A  def PB 6-2 6-4
      // MC vs IS, VS vs MO not played | MM bye
      // ── Round 5 ──────────────────────────────────────────────────────
      {
        p1: 0,
        p2: 3,
        winnerIdx: 0,
        scheduledAt: null,
        scores: [
          { player1: 6, player2: 0 },
          { player1: 6, player2: 3 },
        ],
      }, // A  def MM 6-0 6-3
      {
        p1: 1,
        p2: 5,
        winnerIdx: 1,
        scheduledAt: '2025-07-21T19:00',
        scores: [
          { player1: 7, player2: 5 },
          { player1: 6, player2: 1 },
        ],
      }, // MC def PB 7-5 6-1
      {
        p1: 2,
        p2: 4,
        winnerIdx: 2,
        scheduledAt: '2025-08-14T18:00',
        scores: [
          { player1: 6, player2: 2 },
          { player1: 6, player2: 0 },
        ],
      }, // VS def IS 6-2 6-0
      // MO bye
      // ── Round 6 ──────────────────────────────────────────────────────
      {
        p1: 1,
        p2: 3,
        winnerIdx: 1,
        scheduledAt: null,
        scores: [
          { player1: 6, player2: 1 },
          { player1: 6, player2: 2 },
        ],
      }, // MC def MM 6-1 6-2
      {
        p1: 4,
        p2: 5,
        winnerIdx: 4,
        scheduledAt: null,
        scores: [
          { player1: 6, player2: 4 },
          { player1: 6, player2: 3 },
        ],
      }, // IS def PB 6-4 6-3
      // A vs MO not played | VS bye
      // ── Round 7 ──────────────────────────────────────────────────────
      {
        p1: 2,
        p2: 5,
        winnerIdx: 2,
        scheduledAt: '2025-08-14T18:00',
        scores: [
          { player1: 7, player2: 5 },
          { player1: 2, player2: 6 },
          { player1: 10, player2: 5 },
        ],
      }, // VS def PB 7-5 2-6 10-5 (ST)
      {
        p1: 4,
        p2: 3,
        winnerIdx: 4,
        scheduledAt: null,
        scores: [
          { player1: 6, player2: 4 },
          { player1: 7, player2: 6 },
        ],
      }, // IS def MM 6-4 7-6
      // A bye | MC vs MO not played
    ],
  },
  {
    name: 'Group B',
    position: 2,
    rankingMultiplier: 0.75,
    // Local: JM=0 IB=1 BC=2 IO=3 DS=4 MS=5 LS=6 G=7
    playerIndices: [7, 8, 9, 10, 11, 12, 13, 14],
    matches: [
      // ── Round 1 ──────────────────────────────────────────────────────
      {
        p1: 0,
        p2: 1,
        winnerIdx: 0,
        scheduledAt: null,
        scores: [
          { player1: 6, player2: 2 },
          { player1: 6, player2: 4 },
        ],
      }, // JM def IB 6-2 6-4
      {
        p1: 2,
        p2: 3,
        winnerIdx: 3,
        scheduledAt: '2025-08-19T20:30',
        scores: [
          { player1: 5, player2: 7 },
          { player1: 6, player2: 7 },
        ],
      }, // IO def BC 7-5 7-6
      {
        p1: 4,
        p2: 5,
        winnerIdx: 4,
        scheduledAt: null,
        scores: [
          { player1: 6, player2: 1 },
          { player1: 6, player2: 2 },
        ],
      }, // DS def MS 6-1 6-2
      // LS vs G not played
      // ── Round 2 ──────────────────────────────────────────────────────
      {
        p1: 0,
        p2: 2,
        winnerIdx: 0,
        scheduledAt: null,
        scores: [
          { player1: 6, player2: 3 },
          { player1: 6, player2: 0 },
        ],
      }, // JM def BC 6-3 6-0
      {
        p1: 1,
        p2: 5,
        winnerIdx: 1,
        scheduledAt: null,
        scores: [
          { player1: 7, player2: 6 },
          { player1: 6, player2: 2 },
        ],
      }, // IB def MS 7-6 6-2
      // DS vs G, LS vs IO not played
      // ── Round 3 ──────────────────────────────────────────────────────
      {
        p1: 1,
        p2: 2,
        winnerIdx: 1,
        scheduledAt: null,
        scores: [
          { player1: 6, player2: 4 },
          { player1: 4, player2: 6 },
          { player1: 10, player2: 2 },
        ],
      }, // IB def BC 6-4 4-6 10-2 (ST)
      {
        p1: 3,
        p2: 7,
        winnerIdx: 3,
        scheduledAt: null,
        scores: [
          { player1: 6, player2: 3 },
          { player1: 6, player2: 3 },
        ],
      }, // IO def G  6-3 6-3
      // JM vs DS, LS vs MS not played
      // ── Round 4 ──────────────────────────────────────────────────────
      {
        p1: 1,
        p2: 4,
        winnerIdx: 1,
        scheduledAt: null,
        scores: [
          { player1: 6, player2: 3 },
          { player1: 7, player2: 5 },
        ],
      }, // IB def DS 6-3 7-5
      {
        p1: 2,
        p2: 7,
        winnerIdx: 7,
        scheduledAt: '2025-07-10T18:00',
        scores: [
          { player1: 6, player2: 4 },
          { player1: 4, player2: 6 },
          { player1: 7, player2: 10 },
        ],
      }, // G  def BC 4-6 6-4 10-7 (ST)
      {
        p1: 3,
        p2: 5,
        winnerIdx: 3,
        scheduledAt: '2025-07-03T18:00',
        scores: [
          { player1: 6, player2: 3 },
          { player1: 6, player2: 4 },
        ],
      }, // IO def MS 6-3 6-4
      // JM vs LS not played
      // ── Round 5 ──────────────────────────────────────────────────────
      {
        p1: 0,
        p2: 3,
        winnerIdx: 0,
        scheduledAt: null,
        scores: [
          { player1: 6, player2: 1 },
          { player1: 6, player2: 4 },
        ],
      }, // JM def IO 6-1 6-4
      // IB vs LS, BC vs DS, G vs MS not played
      // ── Round 6 ──────────────────────────────────────────────────────
      {
        p1: 1,
        p2: 3,
        winnerIdx: 1,
        scheduledAt: null,
        scores: [
          { player1: 6, player2: 4 },
          { player1: 2, player2: 6 },
          { player1: 10, player2: 7 },
        ],
      }, // IB def IO 6-4 2-6 10-7 (ST)
      // JM vs G, BC vs MS, DS vs LS not played
      // ── Round 7 ──────────────────────────────────────────────────────
      {
        p1: 0,
        p2: 5,
        winnerIdx: 0,
        scheduledAt: null,
        scores: [
          { player1: 6, player2: 2 },
          { player1: 6, player2: 0 },
        ],
      }, // JM def MS 6-2 6-0
      {
        p1: 4,
        p2: 3,
        winnerIdx: 3,
        scheduledAt: null,
        scores: [
          { player1: 4, player2: 6 },
          { player1: 4, player2: 6 },
        ],
      }, // IO def DS 6-4 6-4
      // IB vs G, BC vs LS not played
    ],
  },
  {
    name: 'Group C',
    position: 3,
    rankingMultiplier: 0.5,
    // Local: N=0 M=1 N3=2 BD=3 SM=4 BM=5 MD=6
    playerIndices: [15, 16, 17, 18, 19, 20, 21],
    matches: [
      // ── Round 4 ──────────────────────────────────────────────────────
      {
        p1: 0,
        p2: 5,
        winnerIdx: 0,
        scheduledAt: null,
        scores: [
          { player1: 6, player2: 4 },
          { player1: 6, player2: 4 },
        ],
      }, // N  def BM 6-4 6-4
      // ── Round 5 ──────────────────────────────────────────────────────
      {
        p1: 2,
        p2: 4,
        winnerIdx: 4,
        scheduledAt: null,
        scores: [
          { player1: 4, player2: 6 },
          { player1: 6, player2: 7 },
        ],
      }, // SM def N3 6-4 7-6
      // All other matches not played
    ],
  },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function findOrCreatePlayer(fullName, isExisting, log) {
  let results = await playersRepository.query([where('name', '==', fullName)])
  if (results.length > 0) {
    log(`Found: ${fullName} (${results[0].id})`)
    return results[0]
  }
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
    log(`Warning: "${fullName}" not found — creating new`)
  } else {
    log(`Creating: ${fullName}`)
  }
  return await playersRepository.create({ name: fullName, email: null })
}

async function createGroupWithMatches({
  lid,
  groupsRepo,
  rRepo,
  name,
  position,
  rankingMultiplier,
  groupPlayerDocs,
  matches,
  roundNumber,
}) {
  const group = await groupsRepo.create({
    competitionId: lid,
    competitionType: 'league',
    name,
    position,
    playerIds: groupPlayerDocs.map((p) => p.id),
    rankingMultiplier,
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
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i]
    await mRepo.create({
      competitionId: lid,
      competitionType: 'league',
      competitionName: LEAGUE_NAME,
      roundId: round.id,
      groupId: group.id,
      player1Position: m.p1 + 1,
      player2Position: m.p2 + 1,
      player1Id: groupPlayerDocs[m.p1].id,
      player2Id: groupPlayerDocs[m.p2].id,
      player1Name: groupPlayerDocs[m.p1].name,
      player2Name: groupPlayerDocs[m.p2].name,
      groupName: name,
      status: 'finished',
      scores: m.scores,
      winnerId: groupPlayerDocs[m.winnerIdx].id,
      scheduledAt: m.scheduledAt,
      generated: true,
    })
  }
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

  log('Resolving season 2025...')
  const existingSeasons = await seasonsRepository.query([where('name', '==', '2025')])
  const season =
    existingSeasons.length > 0
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
    name: LEAGUE_NAME,
    format: 'round_robin',
    numGroups: 3,
    playersPerGroup: 8,
    pointsPerWin: 3,
    pointsPerLoss: 1,
    numPlayers: null,
    seededPlayerIds: null,
    tierMultipliers: [1.0, 0.75, 0.5],
    promotionCount: 2,
    relegationCount: 2,
    rules:
      'Best of 3 sets. 3rd set = super tiebreak. Group A = 100%, B = 75%, C = 50% ranking points. Top 2 promoted, bottom 2 relegated.',
    organizerId: userId,
    status: 'completed',
  })
  const lid = league.id

  log('Resolving players...')
  const playerDocs = []
  for (const p of PLAYERS) {
    const d = await findOrCreatePlayer(p.name, p.existing, log)
    playerDocs.push(d)
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

  const groupsRepo = leagueGroupsRepository(lid)
  const rRepo = roundsRepository('leagues', lid)

  for (let gi = 0; gi < GROUPS.length; gi++) {
    const g = GROUPS[gi]
    log(`Creating ${g.name} (${g.matches.length} matches)...`)
    await createGroupWithMatches({
      lid,
      groupsRepo,
      rRepo,
      name: g.name,
      position: g.position,
      rankingMultiplier: g.rankingMultiplier,
      groupPlayerDocs: g.playerIndices.map((i) => playerDocs[i]),
      matches: g.matches,
      roundNumber: gi + 1,
    })
  }

  log('Calculating rankings...')
  const enrollments = playerDocs.map((p) => ({ playerId: p.id, playerName: p.name }))
  await recalculateRankings('leagues', lid, enrollments)

  log('Done!')
  return lid
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function SeedPlayLiga2025Ciklus2Page() {
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
          title="Seed: Play Liga 2025 Ciklus 2"
          subtitle="3 tiered groups (A=100%, B=75%, C=50%). 7+8+7 players."
          eyebrow="Admin / One-time"
        />

        <div className="mt-8 max-w-lg space-y-4">
          <Card>
            <p className="mb-2 text-sm font-medium text-text">Šta će biti kreirano:</p>
            <ul className="space-y-1 text-sm text-text-light">
              <li>• Season: 2025 (reuse ili create)</li>
              <li>• Liga: Play Liga 2025 Ciklus 2 (Round Robin, 3 grupe, 3pts/1pt)</li>
              <li>• Grupa A (×1.0): A, MC, VS, MM, IS, PB, MO — 14 odigranih</li>
              <li>• Grupa B (×0.75): JM, IB, BC, IO, DS, MS, LS, G — 14 odigranih</li>
              <li>• Grupa C (×0.5): N, M, N3, BD, SM, BM, MD — 2 odigrana</li>
              <li className="text-amber-600">
                • Novi igrači: D. Stamenovic (DS), M. Djelosevic (MD)
              </li>
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
