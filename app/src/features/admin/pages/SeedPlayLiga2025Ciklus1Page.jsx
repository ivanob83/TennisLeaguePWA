/**
 * One-time seed page: Play Liga 2025 — Ciklus 1
 * Format: round_robin — 3 tiered groups
 *   Group A = 100% ranking points (x1.0)
 *   Group B = 75%  ranking points (x0.75)
 *   Group C = 50%  ranking points (x0.5)
 * Promotion: top 2 per group | Relegation: bottom 2 per group
 * Players: 7 in Group A, 8 in B, 8 in C (23 total)
 * Source: liga.tc-play.rs
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
  playersRepository,
  seasonsRepository,
  leaguesRepository,
  leagueEnrollmentRepository,
  leagueGroupsRepository,
  roundsRepository,
  matchesRepository,
} from '../../../infrastructure/firestore.js'
import { recalculateRankings } from '../../rankings/services/rankingService.js'

const LEAGUE_NAME = 'Play Liga 2025 Ciklus 1'

// ─── Players ────────────────────────────────────────────────────────────────
// Global indices — Group A: 0–6, Group B: 7–14, Group C: 15–22

const PLAYERS = [
  // Group A
  { name: 'Jovica Mijailovic', existing: true }, // 0  JM
  { name: 'Petar Blagojevic', existing: false }, // 1  PB
  { name: 'Marko Cvetkovski', existing: true }, // 2  MC
  { name: 'Ivan Suvacarevic', existing: true }, // 3  IS
  { name: 'Aleksandar Jovanovic', existing: true }, // 4  A
  { name: 'Ivan Blagojevic', existing: true }, // 5  IB
  { name: 'Vuk Sebek', existing: true }, // 6  VS
  // Group B
  { name: 'Ivan Obradovic', existing: true }, // 7  IO
  { name: 'Blagoje Djukic', existing: false }, // 8  BD
  { name: 'Veljko', existing: false }, // 9  V  (surname unknown)
  { name: 'Miljan Milenkovic', existing: true }, // 10 MM
  { name: 'Bojan Cicic', existing: false }, // 11 BC
  { name: 'Marko Obrenovic', existing: false }, // 12 MO
  { name: 'Pedja Standard', existing: false }, // 13 PS
  { name: 'Lazar Spasenic', existing: false }, // 14 LS
  // Group C
  { name: 'N. Stanisic', existing: false }, // 15 NS (first name unknown)
  { name: 'Goran', existing: false }, // 16 G  (surname unknown)
  { name: 'Matija', existing: false }, // 17 M  (surname unknown)
  { name: 'Bojan Milinkovic', existing: true }, // 18 BM
  { name: 'Nikola 3M', existing: false }, // 19 N3 (nickname)
  { name: 'Milos Simovic', existing: false }, // 20 MS
  { name: 'Sasa Markovic', existing: false }, // 21 SM
  { name: 'Nenad', existing: false }, // 22 N  (surname unknown)
]

// ─── Match data ──────────────────────────────────────────────────────────────
// p1/p2/winnerIdx are LOCAL indices within each group's playerIndices array.
// scores use {player1, player2} legacy format (rankingService handles both formats).
// 3rd set = super tiebreak where applicable.

const GROUPS = [
  {
    name: 'Group A',
    position: 1,
    rankingMultiplier: 1.0,
    // Local: JM=0, PB=1, MC=2, IS=3, A=4, IB=5, VS=6
    playerIndices: [0, 1, 2, 3, 4, 5, 6],
    matches: [
      // ── Round 1 ──────────────────────────────────────────────────────
      {
        p1: 0,
        p2: 1,
        winnerIdx: 0,
        scheduledAt: null,
        scores: [
          { player1: 6, player2: 0 },
          { player1: 6, player2: 3 },
        ],
      }, // JM def PB 6-0 6-3
      {
        p1: 2,
        p2: 3,
        winnerIdx: 2,
        scheduledAt: null,
        scores: [
          { player1: 5, player2: 7 },
          { player1: 6, player2: 3 },
          { player1: 7, player2: 6 },
        ],
      }, // MC def IS 5-7 6-3 7-6
      {
        p1: 5,
        p2: 6,
        winnerIdx: 6,
        scheduledAt: '2025-05-22T17:00',
        scores: [
          { player1: 1, player2: 6 },
          { player1: 4, player2: 6 },
        ],
      }, // VS def IB 6-1 6-4
      // A bye in R1
      // ── Round 2 ──────────────────────────────────────────────────────
      {
        p1: 0,
        p2: 2,
        winnerIdx: 2,
        scheduledAt: '2025-05-19T16:00',
        scores: [
          { player1: 0, player2: 6 },
          { player1: 0, player2: 6 },
        ],
      }, // MC def JM 6-0 6-0
      {
        p1: 4,
        p2: 6,
        winnerIdx: 4,
        scheduledAt: '2025-05-26T17:00',
        scores: [
          { player1: 6, player2: 4 },
          { player1: 6, player2: 3 },
        ],
      }, // A  def VS 6-4 6-3
      {
        p1: 5,
        p2: 3,
        winnerIdx: 3,
        scheduledAt: '2025-06-05T18:00',
        scores: [
          { player1: 1, player2: 6 },
          { player1: 3, player2: 6 },
        ],
      }, // IS def IB 6-1 6-3
      // PB bye in R2
      // ── Round 3 ──────────────────────────────────────────────────────
      {
        p1: 0,
        p2: 4,
        winnerIdx: 4,
        scheduledAt: null,
        scores: [
          { player1: 3, player2: 6 },
          { player1: 1, player2: 6 },
        ],
      }, // A  def JM 6-3 6-1
      {
        p1: 1,
        p2: 2,
        winnerIdx: 2,
        scheduledAt: '2025-06-10T18:00',
        scores: [
          { player1: 3, player2: 6 },
          { player1: 4, player2: 6 },
        ],
      }, // MC def PB 6-3 6-4
      {
        p1: 3,
        p2: 6,
        winnerIdx: 6,
        scheduledAt: null,
        scores: [
          { player1: 3, player2: 6 },
          { player1: 7, player2: 5 },
          { player1: 6, player2: 10 },
        ],
      }, // VS def IS 6-3 5-7 10-6 (ST)
      // IB bye in R3
      // ── Round 4 ──────────────────────────────────────────────────────
      {
        p1: 0,
        p2: 5,
        winnerIdx: 0,
        scheduledAt: null,
        scores: [
          { player1: 6, player2: 1 },
          { player1: 6, player2: 4 },
        ],
      }, // JM def IB 6-1 6-4
      {
        p1: 1,
        p2: 4,
        winnerIdx: 4,
        scheduledAt: '2025-05-22T17:00',
        scores: [
          { player1: 1, player2: 6 },
          { player1: 2, player2: 6 },
        ],
      }, // A  def PB 6-1 6-2
      {
        p1: 2,
        p2: 6,
        winnerIdx: 2,
        scheduledAt: '2025-06-02T17:00',
        scores: [
          { player1: 6, player2: 3 },
          { player1: 7, player2: 5 },
        ],
      }, // MC def VS 6-3 7-5
      // IS bye in R4
      // ── Round 5 ──────────────────────────────────────────────────────
      {
        p1: 0,
        p2: 3,
        winnerIdx: 0,
        scheduledAt: null,
        scores: [
          { player1: 6, player2: 0 },
          { player1: 6, player2: 4 },
        ],
      }, // JM def IS 6-0 6-4
      {
        p1: 1,
        p2: 5,
        winnerIdx: 5,
        scheduledAt: '2025-05-26T16:00',
        scores: [
          { player1: 7, player2: 6 },
          { player1: 6, player2: 7 },
          { player1: 8, player2: 10 },
        ],
      }, // IB def PB 6-7 7-6 10-8 (ST)
      {
        p1: 2,
        p2: 4,
        winnerIdx: 4,
        scheduledAt: null,
        scores: [
          { player1: 6, player2: 7 },
          { player1: 3, player2: 6 },
        ],
      }, // A  def MC 7-6 6-3
      // VS bye in R5
      // ── Round 6 ──────────────────────────────────────────────────────
      {
        p1: 0,
        p2: 6,
        winnerIdx: 6,
        scheduledAt: '2025-05-12T10:00',
        scores: [
          { player1: 6, player2: 4 },
          { player1: 0, player2: 6 },
          { player1: 10, player2: 12 },
        ],
      }, // VS def JM 4-6 6-0 12-10 (ST)
      {
        p1: 1,
        p2: 3,
        winnerIdx: 3,
        scheduledAt: '2025-05-15T16:00',
        scores: [
          { player1: 0, player2: 6 },
          { player1: 6, player2: 3 },
          { player1: 8, player2: 10 },
        ],
      }, // IS def PB 6-0 3-6 10-8 (ST)
      {
        p1: 4,
        p2: 5,
        winnerIdx: 4,
        scheduledAt: '2025-05-13T16:00',
        scores: [
          { player1: 6, player2: 2 },
          { player1: 6, player2: 0 },
        ],
      }, // A  def IB 6-2 6-0
      // MC bye in R6
      // ── Round 7 ──────────────────────────────────────────────────────
      {
        p1: 1,
        p2: 6,
        winnerIdx: 1,
        scheduledAt: '2025-06-06T17:00',
        scores: [
          { player1: 6, player2: 4 },
          { player1: 2, player2: 6 },
          { player1: 10, player2: 8 },
        ],
      }, // PB def VS 6-4 2-6 10-8 (ST)
      {
        p1: 2,
        p2: 5,
        winnerIdx: 2,
        scheduledAt: '2025-06-07T18:00',
        scores: [
          { player1: 6, player2: 3 },
          { player1: 6, player2: 2 },
        ],
      }, // MC def IB 6-3 6-2
      {
        p1: 4,
        p2: 3,
        winnerIdx: 4,
        scheduledAt: '2025-06-03T18:00',
        scores: [
          { player1: 6, player2: 1 },
          { player1: 6, player2: 1 },
        ],
      }, // A  def IS 6-1 6-1
      // JM bye in R7
    ],
  },
  {
    name: 'Group B',
    position: 2,
    rankingMultiplier: 0.75,
    // Local: IO=0, BD=1, V=2, MM=3, BC=4, MO=5, PS=6, LS=7
    playerIndices: [7, 8, 9, 10, 11, 12, 13, 14],
    matches: [
      // ── Round 1 ──────────────────────────────────────────────────────
      {
        p1: 4,
        p2: 5,
        winnerIdx: 5,
        scheduledAt: null,
        scores: [
          { player1: 6, player2: 7 },
          { player1: 6, player2: 3 },
          { player1: 20, player2: 22 },
        ],
      }, // MO def BC 7-6 3-6 22-20 (ST)
      // ── Round 2 ──────────────────────────────────────────────────────
      {
        p1: 4,
        p2: 7,
        winnerIdx: 4,
        scheduledAt: '2025-05-29T18:00',
        scores: [
          { player1: 3, player2: 6 },
          { player1: 7, player2: 6 },
          { player1: 10, player2: 6 },
        ],
      }, // BC def LS 3-6 7-6 10-6 (ST)
      // ── Round 3 ──────────────────────────────────────────────────────
      {
        p1: 0,
        p2: 4,
        winnerIdx: 4,
        scheduledAt: '2025-05-13T17:00',
        scores: [
          { player1: 4, player2: 6 },
          { player1: 4, player2: 6 },
        ],
      }, // BC def IO 6-4 6-4
      {
        p1: 3,
        p2: 7,
        winnerIdx: 7,
        scheduledAt: '2025-05-24T12:00',
        scores: [
          { player1: 1, player2: 6 },
          { player1: 6, player2: 4 },
          { player1: 9, player2: 11 },
        ],
      }, // LS def MM 6-1 4-6 11-9 (ST)
      // ── Round 4 ──────────────────────────────────────────────────────
      {
        p1: 1,
        p2: 4,
        winnerIdx: 1,
        scheduledAt: '2025-05-20T17:00',
        scores: [
          { player1: 2, player2: 6 },
          { player1: 7, player2: 5 },
          { player1: 10, player2: 7 },
        ],
      }, // BD def BC 2-6 7-5 10-7 (ST)
      {
        p1: 3,
        p2: 5,
        winnerIdx: 3,
        scheduledAt: '2025-06-15T20:00',
        scores: [
          { player1: 6, player2: 0 },
          { player1: 5, player2: 7 },
          { player1: 12, player2: 10 },
        ],
      }, // MM def MO 6-0 5-7 12-10 (ST)
      // ── Round 5 ──────────────────────────────────────────────────────
      {
        p1: 0,
        p2: 3,
        winnerIdx: 3,
        scheduledAt: '2025-05-20T16:00',
        scores: [
          { player1: 4, player2: 6 },
          { player1: 6, player2: 2 },
          { player1: 6, player2: 10 },
        ],
      }, // MM def IO 6-4 2-6 10-6 (ST)
      {
        p1: 7,
        p2: 5,
        winnerIdx: 5,
        scheduledAt: null,
        scores: [
          { player1: 6, player2: 7 },
          { player1: 0, player2: 6 },
        ],
      }, // MO def LS 7-6 6-0
      // ── Round 6 ──────────────────────────────────────────────────────
      {
        p1: 1,
        p2: 3,
        winnerIdx: 1,
        scheduledAt: null,
        scores: [
          { player1: 2, player2: 6 },
          { player1: 6, player2: 3 },
          { player1: 11, player2: 9 },
        ],
      }, // BD def MM 2-6 6-3 11-9 (ST)
      // ── Round 7 ──────────────────────────────────────────────────────
      {
        p1: 0,
        p2: 5,
        winnerIdx: 5,
        scheduledAt: '2025-06-07T10:00',
        scores: [
          { player1: 6, player2: 3 },
          { player1: 5, player2: 7 },
          { player1: 5, player2: 10 },
        ],
      }, // MO def IO 6-3 5-7 10-5 (ST)
      {
        p1: 4,
        p2: 3,
        winnerIdx: 3,
        scheduledAt: '2025-06-04T17:00',
        scores: [
          { player1: 6, player2: 1 },
          { player1: 3, player2: 6 },
          { player1: 10, player2: 12 },
        ],
      }, // MM def BC 1-6 6-3 12-10 (ST)
    ],
  },
  {
    name: 'Group C',
    position: 3,
    rankingMultiplier: 0.5,
    // Local: NS=0, G=1, M=2, BM=3, N3=4, MS=5, SM=6, N=7
    playerIndices: [15, 16, 17, 18, 19, 20, 21, 22],
    matches: [
      // ── Round 1 ──────────────────────────────────────────────────────
      {
        p1: 4,
        p2: 5,
        winnerIdx: 5,
        scheduledAt: null,
        scores: [
          { player1: 3, player2: 6 },
          { player1: 7, player2: 5 },
          { player1: 5, player2: 10 },
        ],
      }, // MS def N3 6-3 5-7 10-5 (ST)
      {
        p1: 6,
        p2: 7,
        winnerIdx: 6,
        scheduledAt: null,
        scores: [
          { player1: 6, player2: 4 },
          { player1: 7, player2: 5 },
        ],
      }, // SM def N 6-4 7-5
      // ── Round 2 ──────────────────────────────────────────────────────
      {
        p1: 1,
        p2: 5,
        winnerIdx: 1,
        scheduledAt: null,
        scores: [
          { player1: 6, player2: 4 },
          { player1: 6, player2: 2 },
        ],
      }, // G  def MS 6-4 6-2
      {
        p1: 4,
        p2: 7,
        winnerIdx: 4,
        scheduledAt: '2025-05-27T18:00',
        scores: [
          { player1: 6, player2: 2 },
          { player1: 6, player2: 0 },
        ],
      }, // N3 def N  6-2 6-0
      // ── Round 3 ──────────────────────────────────────────────────────
      {
        p1: 1,
        p2: 2,
        winnerIdx: 1,
        scheduledAt: '2025-05-14T18:00',
        scores: [
          { player1: 6, player2: 3 },
          { player1: 4, player2: 6 },
          { player1: 10, player2: 8 },
        ],
      }, // G  def M  6-3 4-6 10-8 (ST)
      {
        p1: 5,
        p2: 6,
        winnerIdx: 6,
        scheduledAt: '2025-06-15T18:00',
        scores: [
          { player1: 3, player2: 6 },
          { player1: 6, player2: 7 },
        ],
      }, // SM def MS 6-3 7-6
      // ── Round 4 ──────────────────────────────────────────────────────
      {
        p1: 1,
        p2: 4,
        winnerIdx: 1,
        scheduledAt: '2025-06-05T17:00',
        scores: [
          { player1: 6, player2: 3 },
          { player1: 6, player2: 4 },
        ],
      }, // G  def N3 6-3 6-4
      // ── Round 5 ──────────────────────────────────────────────────────
      {
        p1: 1,
        p2: 6,
        winnerIdx: 1,
        scheduledAt: '2025-05-14T18:00',
        scores: [
          { player1: 6, player2: 3 },
          { player1: 0, player2: 6 },
          { player1: 10, player2: 4 },
        ],
      }, // G  def SM 6-3 0-6 10-4 (ST)
      {
        p1: 7,
        p2: 5,
        winnerIdx: 5,
        scheduledAt: '2025-06-05T18:00',
        scores: [
          { player1: 2, player2: 6 },
          { player1: 2, player2: 6 },
        ],
      }, // MS def N  6-2 6-2
      // ── Round 7 ──────────────────────────────────────────────────────
      {
        p1: 1,
        p2: 7,
        winnerIdx: 1,
        scheduledAt: null,
        scores: [
          { player1: 6, player2: 1 },
          { player1: 6, player2: 3 },
        ],
      }, // G  def N  6-1 6-3
      {
        p1: 4,
        p2: 3,
        winnerIdx: 3,
        scheduledAt: '2025-05-15T17:00',
        scores: [
          { player1: 1, player2: 6 },
          { player1: 3, player2: 6 },
        ],
      }, // BM def N3 6-1 6-3
    ],
  },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function findOrCreatePlayer(fullName, isExisting, log) {
  // Always check exact name first — prevents duplicates on re-seed
  let results = await playersRepository.query([where('name', '==', fullName)])
  if (results.length > 0) {
    log(`Found: ${fullName} (${results[0].id})`)
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
    const p1Doc = groupPlayerDocs[m.p1]
    const p2Doc = groupPlayerDocs[m.p2]
    const winnerDoc = groupPlayerDocs[m.winnerIdx]
    await mRepo.create({
      competitionId: lid,
      competitionType: 'league',
      competitionName: LEAGUE_NAME,
      roundId: round.id,
      groupId: group.id,
      player1Position: m.p1 + 1,
      player2Position: m.p2 + 1,
      player1Id: p1Doc.id,
      player2Id: p2Doc.id,
      player1Name: p1Doc.name,
      player2Name: p2Doc.name,
      groupName: name,
      status: 'finished',
      scores: m.scores,
      winnerId: winnerDoc.id,
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

export default function SeedPlayLiga2025Ciklus1Page() {
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
          title="Seed: Play Liga 2025 Ciklus 1"
          subtitle="3 tiered groups (A=100%, B=75%, C=50%). 7+8+8 players. Played matches with results."
          eyebrow="Admin / One-time"
        />

        <div className="mt-8 max-w-lg space-y-4">
          <Card>
            <p className="mb-2 text-sm font-medium text-text">Šta će biti kreirano:</p>
            <ul className="space-y-1 text-sm text-text-light">
              <li>• Season: 2025 (reuse ili create)</li>
              <li>• Liga: Play Liga 2025 Ciklus 1 (Round Robin, 3 grupe)</li>
              <li>• Grupa A (×1.0): 7 igrača, 21 meč — svi odigrani</li>
              <li>• Grupa B (×0.75): 8 igrača, 11 odigranih mečeva</li>
              <li>• Grupa C (×0.5): 8 igrača, 11 odigranih mečeva</li>
              <li>• Promocija: top 2 | Relegacija: bottom 2</li>
              <li className="text-amber-600">
                • Igrači sa nepoznatim prezimenima: Veljko, Goran, Matija, Nenad, N. Stanisic,
                Nikola 3M
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
