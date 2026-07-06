import { where } from 'firebase/firestore'
import { playerAvailabilityRepository } from '../../../infrastructure/firestore.js'
import { toDate } from '../utils/overlap.js'

/**
 * Persist one availability window. Returns the created doc.
 *
 * @param {{ playerId, start: Date, end: Date, notes?: string|null,
 *           competitionScope?: { competitionType, competitionId } | null,
 *           createdBy: string }} params
 */
export async function addAvailability(params) {
  const doc = {
    playerId: params.playerId,
    start: params.start,
    end: params.end,
    source: 'admin_entry',
    notes: params.notes || null,
    competitionScope: params.competitionScope || null,
    consumedByMatchId: null,
    createdBy: params.createdBy,
  }
  return await playerAvailabilityRepository.create(doc)
}

export async function deleteAvailability(id) {
  await playerAvailabilityRepository.delete(id)
}

/**
 * Fetch availability windows for a list of player ids.
 * Chunks the `in` query (Firestore limit ~30) and applies the rest of the
 * filters client-side to avoid composite index requirements.
 *
 * @param {string[]} playerIds
 * @param {{ from?: Date, to?: Date, competitionId?: string|null,
 *           includeConsumed?: boolean }} options
 */
export async function fetchAvailabilityForPlayers(playerIds, options = {}) {
  const { from = null, to = null, competitionId = null, includeConsumed = false } = options
  if (!playerIds.length) return []

  const chunks = []
  for (let i = 0; i < playerIds.length; i += 30) {
    chunks.push(playerIds.slice(i, i + 30))
  }

  const results = await Promise.all(
    chunks.map((chunk) => playerAvailabilityRepository.query([where('playerId', 'in', chunk)])),
  )

  const all = results.flat()
  return all.filter((w) => {
    if (!includeConsumed && w.consumedByMatchId) return false
    const start = toDate(w.start)
    const end = toDate(w.end)
    if (!start || !end) return false
    if (from && end < from) return false
    if (to && start > to) return false
    if (competitionId) {
      const scopeId = w.competitionScope?.competitionId
      if (scopeId && scopeId !== competitionId) return false
    }
    return true
  })
}

/**
 * Mark availability windows as consumed by a scheduled match.
 */
export async function markConsumed(availabilityIds, matchId) {
  await Promise.all(
    availabilityIds
      .filter(Boolean)
      .map((id) => playerAvailabilityRepository.update(id, { consumedByMatchId: matchId })),
  )
}
