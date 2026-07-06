import { matchesRepository } from '../../../infrastructure/firestore.js'
import { recalculateRankings } from '../../rankings/services/rankingService.js'

/**
 * Validate that sets are well-formed.
 * @param {Array<{p1: string|number, p2: string|number}>} sets
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateSets(sets) {
  if (!sets || sets.length === 0) {
    return { valid: false, error: 'At least one set is required.' }
  }
  for (const [i, set] of sets.entries()) {
    const p1 = Number(set.p1)
    const p2 = Number(set.p2)
    if (Number.isNaN(p1) || Number.isNaN(p2)) {
      return { valid: false, error: `Set ${i + 1}: scores must be numbers.` }
    }
    if (!Number.isInteger(p1) || !Number.isInteger(p2)) {
      return { valid: false, error: `Set ${i + 1}: scores must be whole numbers.` }
    }
    if (p1 < 0 || p2 < 0) {
      return { valid: false, error: `Set ${i + 1}: scores cannot be negative.` }
    }
    if (p1 === p2) {
      return { valid: false, error: `Set ${i + 1}: a set cannot end in a draw.` }
    }
  }
  return { valid: true }
}

/**
 * Determine match winner based on sets won.
 * @returns {string|null} player1Id, player2Id, or null if equal
 */
export function determineWinner(sets, player1Id, player2Id) {
  let p1Sets = 0
  let p2Sets = 0
  for (const set of sets) {
    if (Number(set.p1) > Number(set.p2)) p1Sets += 1
    else p2Sets += 1
  }
  if (p1Sets > p2Sets) return player1Id
  if (p2Sets > p1Sets) return player2Id
  return null
}

/**
 * Assign a date/time to a match slot — editor only.
 * Transitions: not_scheduled → scheduled
 */
export async function scheduleMatch(competitionType, competitionId, roundId, matchId, scheduledAt) {
  const repo = matchesRepository(competitionType, competitionId, roundId)
  await repo.update(matchId, { scheduledAt, status: 'scheduled' })
}

/**
 * Submit scores for admin approval — editor or matched player.
 * Saves scores as pending; transitions to 'pending_approval'.
 * Admin must approve before the result is finalised.
 */
export async function submitScores(
  competitionType,
  competitionId,
  roundId,
  matchId,
  sets,
  player1Id,
  player2Id,
) {
  const normalizedSets = sets.map((s) => ({ p1: Number(s.p1), p2: Number(s.p2) }))
  const pendingWinnerId = determineWinner(normalizedSets, player1Id, player2Id)
  const repo = matchesRepository(competitionType, competitionId, roundId)
  await repo.update(matchId, {
    pendingSets: normalizedSets,
    pendingWinnerId,
    status: 'pending_approval',
    submittedAt: new Date(),
  })
}

/**
 * Admin approves pending scores — editor only.
 * Copies pending data to final fields and transitions to 'finished'.
 */
export async function approveScores(
  competitionType,
  competitionId,
  roundId,
  match,
  enrollments = [],
) {
  const repo = matchesRepository(competitionType, competitionId, roundId)
  await repo.update(match.id, {
    sets: match.pendingSets,
    scores: match.pendingSets.map((s) => ({ player1: s.p1, player2: s.p2 })),
    winnerId: match.pendingWinnerId,
    pendingSets: null,
    pendingWinnerId: null,
    status: 'finished',
    finishedAt: new Date(),
  })
  onMatchFinished({ id: match.id, competitionType, competitionId, roundId, enrollments })
}

/**
 * Editor directly overwrites a finished match result — skips pending_approval.
 */
export async function editResult(
  competitionType,
  competitionId,
  roundId,
  matchId,
  sets,
  player1Id,
  player2Id,
  enrollments = [],
) {
  const normalizedSets = sets.map((s) => ({ p1: Number(s.p1), p2: Number(s.p2) }))
  const winnerId = determineWinner(normalizedSets, player1Id, player2Id)
  const repo = matchesRepository(competitionType, competitionId, roundId)
  await repo.update(matchId, {
    sets: normalizedSets,
    scores: normalizedSets.map((s) => ({ player1: s.p1, player2: s.p2 })),
    winnerId,
    status: 'finished',
    finishedAt: new Date(),
    pendingSets: null,
    pendingWinnerId: null,
  })
  onMatchFinished({ id: matchId, competitionType, competitionId, roundId, enrollments })
}

/**
 * Editor sets match result as walkover — no sets, winner is the non-defaulting player.
 */
export async function setWalkover(
  competitionType,
  competitionId,
  roundId,
  matchId,
  winnerId,
  enrollments = [],
) {
  const repo = matchesRepository(competitionType, competitionId, roundId)
  await repo.update(matchId, {
    winnerId,
    sets: [],
    scores: [],
    walkover: true,
    pendingSets: null,
    pendingWinnerId: null,
    status: 'finished',
    finishedAt: new Date(),
  })
  onMatchFinished({ id: matchId, competitionType, competitionId, roundId, enrollments })
}

/**
 * Admin rejects pending scores — editor only.
 * Clears pending data and reverts to previous status.
 */
export async function rejectScores(competitionType, competitionId, roundId, match) {
  const repo = matchesRepository(competitionType, competitionId, roundId)
  const revertStatus = match.scheduledAt ? 'scheduled' : 'not_scheduled'
  await repo.update(match.id, {
    pendingSets: null,
    pendingWinnerId: null,
    status: revertStatus,
    submittedAt: null,
  })
}

/**
 * Triggers ranking recalculation after a match is finished.
 */
function onMatchFinished({ competitionType, competitionId, enrollments }) {
  recalculateRankings(competitionType, competitionId, enrollments).catch((err) =>
    console.error('[Rankings] Recalculation failed:', err),
  )
}
