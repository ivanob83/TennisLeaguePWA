import { doc, setDoc, getDocs, deleteDoc, collection } from 'firebase/firestore'
import { db } from '../../../infrastructure/firebase.js'
import {
  roundsRepository,
  matchesRepository,
  leagueGroupsRepository,
  tournamentGroupsRepository,
} from '../../../infrastructure/firestore.js'
import { TOURNAMENT_POINTS, LEAGUE_POINTS } from '../config.js'

/**
 * Normalize sets to {p1, p2} regardless of storage format.
 * Newer matches use sets:[{p1,p2}], legacy seed data uses scores:[{player1,player2}].
 */
function normalizeSets(match) {
  if (match.sets?.length) return match.sets
  if (match.scores?.length) return match.scores.map((s) => ({ p1: s.player1, p2: s.player2 }))
  return []
}

function isPlayed(match) {
  return match.status === 'finished' || match.status === 'walkover'
}

/**
 * Recalculate and persist rankings for a competition.
 *
 * Points:
 *  - Group stage wins/losses → groupWin / groupLoss per match
 *  - SF loser (3rd/4th)     → semifinal bonus
 *  - Final loser (runner-up) → final bonus
 *  - Final winner (champion) → winner bonus
 *
 * @param {string} competitionType - 'leagues' | 'tournaments'
 * @param {string} competitionId
 * @param {Array}  enrollments - enrollment documents (provides playerName / playerEmail)
 */
export async function recalculateRankings(competitionType, competitionId, enrollments) {
  const cfg = competitionType === 'leagues' ? LEAGUE_POINTS : TOURNAMENT_POINTS

  const groupsRepo =
    competitionType === 'leagues'
      ? leagueGroupsRepository(competitionId)
      : tournamentGroupsRepository(competitionId)
  const groups = await groupsRepo.getAll()
  const groupMultiplierMap = {}
  for (const g of groups) {
    groupMultiplierMap[g.id] = g.rankingMultiplier ?? 1.0
  }

  const rounds = await roundsRepository(competitionType, competitionId).getAll()
  const groupRounds = rounds.filter((r) => r.type === 'round_robin')
  const knockoutRounds = rounds.filter((r) => r.type === 'knockout')

  const groupMatches = []
  for (const round of groupRounds) {
    const multiplier = groupMultiplierMap[round.groupId] ?? 1.0
    const matches = await matchesRepository(competitionType, competitionId, round.id).getAll()
    groupMatches.push(...matches.filter(isPlayed).map((m) => ({ ...m, _multiplier: multiplier })))
  }

  const knockoutMatches = []
  for (const round of knockoutRounds) {
    const matches = await matchesRepository(competitionType, competitionId, round.id).getAll()
    knockoutMatches.push(...matches.filter(isPlayed))
  }

  // Seed stats for all enrolled players
  const stats = {}
  for (const en of enrollments) {
    stats[en.playerId] = {
      playerId: en.playerId,
      playerName: en.playerName || en.playerEmail || en.playerId,
      wins: 0,
      losses: 0,
      setsWon: 0,
      setsLost: 0,
      matchesPlayed: 0,
      winRate: 0,
      points: 0,
    }
  }

  function ensurePlayer(id) {
    if (!stats[id]) {
      stats[id] = {
        playerId: id,
        playerName: id,
        wins: 0,
        losses: 0,
        setsWon: 0,
        setsLost: 0,
        matchesPlayed: 0,
        winRate: 0,
        points: 0,
      }
    }
  }

  // ── Group stage ─────────────────────────────────────────────────────────────
  for (const match of groupMatches) {
    const { player1Id: p1, player2Id: p2, winnerId } = match
    if (!p1 || !p2 || !winnerId) continue

    ensurePlayer(p1)
    ensurePlayer(p2)

    stats[p1].matchesPlayed += 1
    stats[p2].matchesPlayed += 1

    for (const set of normalizeSets(match)) {
      stats[p1].setsWon += Number(set.p1)
      stats[p1].setsLost += Number(set.p2)
      stats[p2].setsWon += Number(set.p2)
      stats[p2].setsLost += Number(set.p1)
    }

    const mult = match._multiplier ?? 1.0
    if (winnerId === p1) {
      stats[p1].wins += 1
      stats[p1].points += Math.round(cfg.groupWin * mult)
      stats[p2].losses += 1
      stats[p2].points += Math.round(cfg.groupLoss * mult)
    } else {
      stats[p2].wins += 1
      stats[p2].points += Math.round(cfg.groupWin * mult)
      stats[p1].losses += 1
      stats[p1].points += Math.round(cfg.groupLoss * mult)
    }
  }

  // ── Knockout stage ──────────────────────────────────────────────────────────
  // Count matchesPlayed / wins / losses / sets for all knockout matches
  for (const match of knockoutMatches) {
    const { player1Id: p1, player2Id: p2, winnerId } = match
    if (!p1 || !p2 || !winnerId) continue

    ensurePlayer(p1)
    ensurePlayer(p2)

    stats[p1].matchesPlayed += 1
    stats[p2].matchesPlayed += 1

    for (const set of normalizeSets(match)) {
      stats[p1].setsWon += Number(set.p1)
      stats[p1].setsLost += Number(set.p2)
      stats[p2].setsWon += Number(set.p2)
      stats[p2].setsLost += Number(set.p1)
    }

    if (winnerId === p1) {
      stats[p1].wins += 1
      stats[p2].losses += 1
    } else {
      stats[p2].wins += 1
      stats[p1].losses += 1
    }
  }

  // SF loser (3rd/4th) gets semifinal bonus
  const sfMatches = knockoutMatches.filter((m) => m.label?.startsWith('SF'))
  for (const match of sfMatches) {
    const { player1Id: p1, player2Id: p2, winnerId } = match
    if (!p1 || !p2 || !winnerId) continue
    ensurePlayer(p1)
    ensurePlayer(p2)
    const loserId = winnerId === p1 ? p2 : p1
    stats[loserId].points += cfg.semifinal
  }

  // Final loser (runner-up) gets final bonus; winner gets winner bonus
  const finalMatch = knockoutMatches.find((m) => m.label === 'Final')
  if (finalMatch) {
    const { player1Id: p1, player2Id: p2, winnerId } = finalMatch
    if (p1 && p2 && winnerId) {
      ensurePlayer(p1)
      ensurePlayer(p2)
      const loserId = winnerId === p1 ? p2 : p1
      stats[winnerId].points += cfg.winner
      stats[loserId].points += cfg.final
    }
  }

  // ── Persist ─────────────────────────────────────────────────────────────────
  const basePath = `${competitionType}/${competitionId}/rankings`

  // Delete orphan docs (written with addDoc/auto-ID instead of playerId as doc ID)
  const existingSnap = await getDocs(collection(db, basePath))
  await Promise.all(
    existingSnap.docs
      .filter((d) => d.id !== d.data().playerId)
      .map((d) => deleteDoc(doc(db, basePath, d.id))),
  )

  for (const entry of Object.values(stats)) {
    const winRate =
      entry.matchesPlayed > 0 ? Math.round((entry.wins / entry.matchesPlayed) * 100) : 0
    const docRef = doc(db, basePath, entry.playerId)
    await setDoc(docRef, { ...entry, winRate, updatedAt: new Date() }, { merge: true })
  }
}
