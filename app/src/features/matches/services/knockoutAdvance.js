import { where } from 'firebase/firestore'
import { roundsRepository, matchesRepository } from '../../../infrastructure/firestore.js'

/**
 * Knockout bracket advancement.
 *
 * Convention (no explicit links stored in Firestore): within a knockout round,
 * matches are ordered by the trailing number in their label (R16-1 … R16-8,
 * QF1 … QF4, SF1, SF2, Final). Match #i (0-based) of round N feeds match
 * #floor(i/2) of the next knockout round — even i → player1, odd i → player2.
 */

const FINISHED = ['finished', 'walkover']

export function isMatchFinished(m) {
  return FINISHED.includes(m?.status) || Boolean(m?.walkover)
}

function labelIndex(label) {
  const m = /(\d+)\s*$/.exec(label ?? '')
  return m ? Number(m[1]) : 0
}

/** Sort matches of one round into bracket order. */
export function sortBracketMatches(matches) {
  return [...matches].sort((a, b) => {
    const d = labelIndex(a.label) - labelIndex(b.label)
    if (d !== 0) return d
    return String(a.label ?? '').localeCompare(String(b.label ?? ''))
  })
}

/**
 * For a match in a (sorted) round, return the labels of the two feeder
 * matches from the previous (sorted) round, or null if not applicable.
 */
export function feederLabels(prevSortedMatches, matchIndex) {
  if (!prevSortedMatches?.length) return null
  const a = prevSortedMatches[matchIndex * 2]
  const b = prevSortedMatches[matchIndex * 2 + 1]
  if (!a && !b) return null
  return [a?.label ?? null, b?.label ?? null]
}

function winnerFields(match, slot) {
  const isP1 = match.winnerId === match.player1Id
  return {
    [`${slot}Id`]: match.winnerId,
    [`${slot}Name`]: (isP1 ? match.player1Name : match.player2Name) ?? null,
    [`${slot}Position`]: (isP1 ? match.player1Position : match.player2Position) ?? null,
  }
}

async function loadKnockoutRounds(competitionType, competitionId) {
  const rounds = await roundsRepository(competitionType, competitionId).query([
    where('type', '==', 'knockout'),
  ])
  rounds.sort((a, b) => (a.roundNumber || 0) - (b.roundNumber || 0))
  const withMatches = []
  for (const r of rounds) {
    const ms = await matchesRepository(competitionType, competitionId, r.id).getAll()
    withMatches.push({ ...r, matches: sortBracketMatches(ms) })
  }
  return withMatches
}

/**
 * Push winners of finished knockout matches into the next round.
 * - Only fills/overwrites slots of next-round matches that are NOT finished
 *   (so a played QF is never altered).
 * - If an earlier result is edited and the winner changes, the slot is updated.
 * @param {string|null} onlyRoundId  limit to winners from this round (null = whole bracket)
 * @returns {Promise<number>} number of slots updated
 */
export async function advanceKnockoutWinners(competitionType, competitionId, onlyRoundId = null) {
  const rounds = await loadKnockoutRounds(competitionType, competitionId)
  let updated = 0

  for (let r = 0; r < rounds.length - 1; r++) {
    const cur = rounds[r]
    const next = rounds[r + 1]
    if (onlyRoundId && cur.id !== onlyRoundId) continue
    // Sanity: next round must be exactly half the size (bracket shape).
    if (next.matches.length !== Math.ceil(cur.matches.length / 2)) continue

    const nextRepo = matchesRepository(competitionType, competitionId, next.id)
    for (let i = 0; i < cur.matches.length; i++) {
      const m = cur.matches[i]
      if (!isMatchFinished(m) || !m.winnerId) continue
      const target = next.matches[Math.floor(i / 2)]
      if (!target || isMatchFinished(target)) continue
      const slot = i % 2 === 0 ? 'player1' : 'player2'
      if (target[`${slot}Id`] === m.winnerId) continue
      const fields = winnerFields(m, slot)
      await nextRepo.update(target.id, fields)
      Object.assign(target, fields)
      updated++
    }
  }
  return updated
}
