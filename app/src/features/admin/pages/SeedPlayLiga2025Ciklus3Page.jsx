/**
 * One-time seed page: Play Liga 2025 — Ciklus 3
 * Format: round_robin — 3 tiered groups (A=100%, B=75%, C=50%)
 * Promotion/relegation: top 2 promoted, bottom 2 relegated
 * Group A: 8 players — 18 played matches
 * Group B: 8 players — 14 played matches
 * Group C: 6 players —  3 played matches (6 real players + 1 bye slot, bye excluded)
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

const LEAGUE_NAME = 'Play Liga 2025 Ciklus 3'

// ─── Players ─────────────────────────────────────────────────────────────────
// Group A: 0–7 | Group B: 8–15 | Group C: 16–21

const PLAYERS = [
  // Group A
  { name: 'Aleksandar Jovanovic', existing: true  }, // 0  A
  { name: 'Vuk Sebek',            existing: true  }, // 1  VS
  { name: 'Marko Cvetkovski',     existing: true  }, // 2  MC
  { name: 'Ivan Obradovic',       existing: true  }, // 3  IO
  { name: 'Ivan Suvacarevic',     existing: true  }, // 4  IS
  { name: 'Muza',                 existing: true  }, // 5  M
  { name: 'Miljan Milenkovic',    existing: true  }, // 6  MM
  { name: 'Ivan Blagojevic',      existing: true  }, // 7  IB
  // Group B
  { name: 'Petar Blagojevic',     existing: true  }, // 8  PB
  { name: 'Marko Obrenovic',      existing: true  }, // 9  MO
  { name: 'Jovica Mijailovic',    existing: true  }, // 10 JM
  { name: 'D. Stamenovic',        existing: true  }, // 11 DS
  { name: 'Bojan Cicic',          existing: true  }, // 12 BC
  { name: 'Nenad',                existing: true  }, // 13 N
  { name: 'Milos Simovic',        existing: true  }, // 14 MS
  { name: 'Sasa Markovic',        existing: true  }, // 15 SM
  // Group C (6 players; bye slot excluded)
  { name: 'Pedja Standard',        existing: true  }, // 16 PS
  { name: 'Goran',                existing: true  }, // 17 G
  { name: 'Lazar Spasenic',       existing: true  }, // 18 LS
  { name: 'Nikola 3M',            existing: true  }, // 19 N3
  { name: 'Bojan Milinkovic',     existing: true  }, // 20 BM
  { name: 'M. Djelosevic',        existing: true  }, // 21 MD
]

// ─── Match data ───────────────────────────────────────────────────────────────
// p1/p2/winnerIdx = LOCAL indices within each group's playerIndices array.
// 3rd set = super tiebreak where applicable.

const GROUPS = [
  {
    name: 'Group A',
    position: 1,
    rankingMultiplier: 1.0,
    // Local: A=0 VS=1 MC=2 IO=3 IS=4 M=5 MM=6 IB=7
    playerIndices: [0, 1, 2, 3, 4, 5, 6, 7],
    matches: [
      // ── Round 1 ──────────────────────────────────────────────────────
      { p1:2, p2:3, winnerIdx:2, scheduledAt:null,               scores:[{player1:6,player2:4},{player1:6,player2:1}] },                              // MC def IO 6-4 6-1
      { p1:4, p2:5, winnerIdx:4, scheduledAt:null,               scores:[{player1:6,player2:2},{player1:6,player2:2}] },                              // IS def M  6-2 6-2
      { p1:6, p2:7, winnerIdx:7, scheduledAt:'2025-09-20T10:00', scores:[{player1:4,player2:6},{player1:4,player2:3}] },                              // IB def MM (IB won set 1 6-4; set 2 retired/walkover)
      // A vs VS not played
      // ── Round 2 ──────────────────────────────────────────────────────
      { p1:0, p2:2, winnerIdx:0, scheduledAt:null,               scores:[{player1:6,player2:2},{player1:6,player2:4}] },                              // A  def MC 6-2 6-4
      { p1:6, p2:3, winnerIdx:6, scheduledAt:'2025-09-25T16:00', scores:[{player1:3,player2:6},{player1:6,player2:4},{player1:10,player2:6}] },        // MM def IO 3-6 6-4 10-6 (ST)
      // VS vs M, IS vs IB not played
      // ── Round 3 ──────────────────────────────────────────────────────
      { p1:1, p2:2, winnerIdx:2, scheduledAt:null,               scores:[{player1:4,player2:6},{player1:1,player2:6}] },                              // MC def VS 6-4 6-1
      { p1:6, p2:5, winnerIdx:5, scheduledAt:'2025-09-04T17:00', scores:[{player1:3,player2:6},{player1:6,player2:3},{player1:9,player2:11}] },        // M  def MM 6-3 3-6 11-9 (ST)
      { p1:3, p2:7, winnerIdx:3, scheduledAt:'2025-09-16T17:00', scores:[{player1:6,player2:3},{player1:6,player2:3}] },                              // IO def IB 6-3 6-3
      // A vs IS not played
      // ── Round 4 ──────────────────────────────────────────────────────
      { p1:0, p2:6, winnerIdx:0, scheduledAt:'2025-09-24T16:30', scores:[{player1:7,player2:5},{player1:6,player2:1}] },                              // A  def MM 7-5 6-1
      { p1:2, p2:7, winnerIdx:2, scheduledAt:'2025-09-23T17:00', scores:[{player1:6,player2:3},{player1:6,player2:2}] },                              // MC def IB 6-3 6-2
      { p1:3, p2:5, winnerIdx:5, scheduledAt:'2025-09-02T18:00', scores:[{player1:1,player2:6},{player1:2,player2:6}] },                              // M  def IO 6-1 6-2
      // VS vs IS not played
      // ── Round 5 ──────────────────────────────────────────────────────
      { p1:0, p2:3, winnerIdx:0, scheduledAt:'2025-09-18T16:30', scores:[{player1:6,player2:3},{player1:6,player2:1}] },                              // A  def IO 6-3 6-1
      { p1:2, p2:4, winnerIdx:2, scheduledAt:'2025-09-17',       scores:[{player1:6,player2:4},{player1:6,player2:2}] },                              // MC def IS 6-4 6-2
      { p1:7, p2:5, winnerIdx:5, scheduledAt:'2025-08-27T17:00', scores:[{player1:0,player2:6},{player1:4,player2:6}] },                              // M  def IB 6-0 6-4
      // VS vs MM not played
      // ── Round 6 ──────────────────────────────────────────────────────
      { p1:2, p2:5, winnerIdx:2, scheduledAt:'2025-09-21T16:00', scores:[{player1:6,player2:4},{player1:6,player2:3}] },                              // MC def M  6-4 6-3
      { p1:4, p2:6, winnerIdx:4, scheduledAt:null,               scores:[{player1:6,player2:4},{player1:6,player2:4}] },                              // IS def MM 6-4 6-4
      // A vs IB, VS vs IO not played
      // ── Round 7 ──────────────────────────────────────────────────────
      { p1:0, p2:5, winnerIdx:0, scheduledAt:null,               scores:[{player1:6,player2:1},{player1:6,player2:1}] },                              // A  def M  6-1 6-1
      { p1:2, p2:6, winnerIdx:2, scheduledAt:null,               scores:[{player1:6,player2:3},{player1:6,player2:2}] },                              // MC def MM 6-3 6-2
      // VS vs IB, IS vs IO not played
    ],
  },
  {
    name: 'Group B',
    position: 2,
    rankingMultiplier: 0.75,
    // Local: PB=0 MO=1 JM=2 DS=3 BC=4 N=5 MS=6 SM=7
    playerIndices: [8, 9, 10, 11, 12, 13, 14, 15],
    matches: [
      // ── Round 1 ──────────────────────────────────────────────────────
      { p1:2, p2:6, winnerIdx:2, scheduledAt:'2025-09-22T17:00', scores:[{player1:6,player2:0},{player1:6,player2:1}] },                              // JM def MS 6-0 6-1
      { p1:4, p2:5, winnerIdx:4, scheduledAt:'2025-09-20T16:00', scores:[{player1:6,player2:2},{player1:6,player2:4}] },                              // BC def N  6-2 6-4
      // PB vs MO, DS vs SM not played
      // ── Round 2 ──────────────────────────────────────────────────────
      { p1:0, p2:2, winnerIdx:2, scheduledAt:null,               scores:[{player1:2,player2:6},{player1:1,player2:6}] },                              // JM def PB 6-2 6-1
      { p1:1, p2:7, winnerIdx:7, scheduledAt:null,               scores:[{player1:6,player2:0},{player1:2,player2:6},{player1:6,player2:10}] },        // SM def MO 6-0 2-6 10-6 (ST)
      { p1:3, p2:5, winnerIdx:3, scheduledAt:null,               scores:[{player1:6,player2:2},{player1:6,player2:1}] },                              // DS def N  6-2 6-1
      { p1:4, p2:6, winnerIdx:4, scheduledAt:null,               scores:[{player1:6,player2:0},{player1:6,player2:2}] },                              // BC def MS 6-0 6-2
      // ── Round 3 ──────────────────────────────────────────────────────
      { p1:1, p2:2, winnerIdx:2, scheduledAt:'2025-09-07T10:00', scores:[{player1:0,player2:6},{player1:2,player2:6}] },                              // JM def MO 6-0 6-2
      { p1:4, p2:7, winnerIdx:4, scheduledAt:null,               scores:[{player1:3,player2:6},{player1:6,player2:4},{player1:10,player2:8}] },        // BC def SM 3-6 6-4 10-8 (ST)
      { p1:6, p2:5, winnerIdx:5, scheduledAt:'2025-09-16',       scores:[{player1:6,player2:7},{player1:6,player2:7}] },                              // N  def MS 7-6 7-6
      // PB vs DS not played
      // ── Round 4 ──────────────────────────────────────────────────────
      { p1:6, p2:7, winnerIdx:7, scheduledAt:'2025-09-04T18:00', scores:[{player1:1,player2:6},{player1:2,player2:6}] },                              // SM def MS 6-1 6-2
      // PB vs BC, MO vs DS, JM vs N not played
      // ── Round 5 ──────────────────────────────────────────────────────
      // No matches played
      // ── Round 6 ──────────────────────────────────────────────────────
      { p1:2, p2:7, winnerIdx:2, scheduledAt:'2025-09-26T18:00', scores:[{player1:6,player2:4},{player1:6,player2:1}] },                              // JM def SM 6-4 6-1
      { p1:3, p2:4, winnerIdx:4, scheduledAt:null,               scores:[{player1:6,player2:3},{player1:6,player2:7},{player1:1,player2:10}] },        // BC def DS 6-3 6-7 10-1 (ST)
      // PB vs N, MO vs MS not played
      // ── Round 7 ──────────────────────────────────────────────────────
      { p1:2, p2:4, winnerIdx:2, scheduledAt:'2025-09-26T16:00', scores:[{player1:7,player2:5},{player1:6,player2:3}] },                              // JM def BC 7-5 6-3
      { p1:3, p2:6, winnerIdx:3, scheduledAt:'2025-09-26T19:30', scores:[{player1:7,player2:5},{player1:6,player2:4}] },                              // DS def MS 7-5 6-4
      // PB vs SM, MO vs N not played
    ],
  },
  {
    name: 'Group C',
    position: 3,
    rankingMultiplier: 0.5,
    // Local: PS=0 G=1 LS=2 N3=3 BM=4 MD=5  (bye slot excluded)
    playerIndices: [16, 17, 18, 19, 20, 21],
    matches: [
      // ── Round 2 ──────────────────────────────────────────────────────
      { p1:0, p2:2, winnerIdx:2, scheduledAt:null, scores:[{player1:6,player2:3},{player1:2,player2:6},{player1:5,player2:10}] }, // LS def PS 6-3 2-6 10-5 (ST)
      // ── Round 3 ──────────────────────────────────────────────────────
      { p1:1, p2:2, winnerIdx:1, scheduledAt:null, scores:[{player1:7,player2:6},{player1:6,player2:1}] }, // G  def LS 7-6 6-1
      // ── Round 6 ──────────────────────────────────────────────────────
      { p1:3, p2:4, winnerIdx:3, scheduledAt:null, scores:[{player1:6,player2:2},{player1:6,player2:2}] }, // N3 def BM 6-2 6-2
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

async function createGroupWithMatches({ lid, groupsRepo, rRepo, name, position, rankingMultiplier, groupPlayerDocs, matches, roundNumber }) {
  const group = await groupsRepo.create({
    competitionId: lid,
    competitionType: 'league',
    name,
    position,
    playerIds: groupPlayerDocs.map(p => p.id),
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
  if (existing.length === 0) { log('Nothing to delete.'); return }
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
    rules: 'Best of 3 sets. 3rd set = super tiebreak. Group A = 100%, B = 75%, C = 50% ranking points. Top 2 promoted, bottom 2 relegated.',
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
      groupPlayerDocs: g.playerIndices.map(i => playerDocs[i]),
      matches: g.matches,
      roundNumber: gi + 1,
    })
  }

  log('Calculating rankings...')
  const enrollments = playerDocs.map(p => ({ playerId: p.id, playerName: p.name }))
  await recalculateRankings('leagues', lid, enrollments)

  log('Done!')
  return lid
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function SeedPlayLiga2025Ciklus3Page() {
  const { user, isSuperadmin } = useAuthContext()
  const navigate = useNavigate()
  const [status, setStatus] = useState('idle')
  const [logs, setLogs] = useState([])
  const [leagueId, setLeagueId] = useState(null)

  function log(msg) { setLogs(prev => [...prev, msg]) }

  async function handleSeed() {
    setStatus('running'); setLogs([])
    try {
      const lid = await runSeed(user.uid, log)
      setLeagueId(lid); setStatus('done')
    } catch (err) {
      log(`Error: ${err.message}`); setStatus('error')
    }
  }

  async function handleCleanupAndSeed() {
    setStatus('running'); setLogs([])
    try {
      await runCleanup(log)
      const lid = await runSeed(user.uid, log)
      setLeagueId(lid); setStatus('done')
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
          title="Seed: Play Liga 2025 Ciklus 3"
          subtitle="3 tiered groups (A=100%, B=75%, C=50%). 8+8+6 players."
          eyebrow="Admin / One-time"
        />

        <div className="mt-8 max-w-lg space-y-4">
          <Card>
            <p className="mb-2 text-sm font-medium text-text">Šta će biti kreirano:</p>
            <ul className="space-y-1 text-sm text-text-light">
              <li>• Season: 2025 (reuse ili create)</li>
              <li>• Liga: Play Liga 2025 Ciklus 3 (Round Robin, 3 grupe, 3pts/1pt)</li>
              <li>• Grupa A (×1.0): A, VS, MC, IO, IS, M, MM, IB — 18 odigranih</li>
              <li>• Grupa B (×0.75): PB, MO, JM, DS, BC, N, MS, SM — 14 odigranih</li>
              <li>• Grupa C (×0.5): PS, G, LS, N3, BM, MD — 3 odigrana</li>
            </ul>
            <p className="mt-3 text-xs text-amber-600">Run only once.</p>
          </Card>

          {logs.length > 0 && (
            <Card className="font-mono text-xs max-h-72 overflow-y-auto">
              {logs.map((l, i) => (
                <div key={i} className={
                  l.startsWith('Error') ? 'text-rose-600' :
                  l.startsWith('Warning') ? 'text-amber-600' :
                  l.startsWith('Done') ? 'text-green-600' :
                  'text-text-light'
                }>
                  {l.startsWith('Done') ? '✓ ' : l.startsWith('Error') ? '✗ ' : '→ '}{l}
                </div>
              ))}
            </Card>
          )}

          <div className="flex flex-wrap gap-3">
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
                <Button variant="outline" onClick={() => navigate(`/leagues/${leagueId}`)}>Open League</Button>
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
