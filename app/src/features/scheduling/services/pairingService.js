import {
  matchesRepository,
  roundsRepository,
  leagueGroupsRepository,
  tournamentGroupsRepository,
} from '../../../infrastructure/firestore.js'
import { intersectWindows } from '../utils/overlap.js'
import { fetchAvailabilityForPlayers } from './availabilityService.js'

const MIN_MATCH_MINUTES = 90

/**
 * Compute pairing suggestions for a single competition.
 *
 * @param {{ competitionType: 'leagues'|'tournaments', competitionId: string,
 *           fromDate?: Date, toDate?: Date, groupIds?: string[]|null }} params
 * @returns {Promise<Array<{
 *   match, round, groupId, groupName, overlaps,
 *   p1Windows, p2Windows
 * }>>}
 */
export async function computeSuggestions({
  competitionType,
  competitionId,
  fromDate = null,
  toDate = null,
  groupIds = null,
}) {
  const rRepo = roundsRepository(competitionType, competitionId)
  const rounds = await rRepo.getAll()

  const filteredRounds =
    groupIds && groupIds.length
      ? rounds.filter((r) => r.groupId && groupIds.includes(r.groupId))
      : rounds

  const matchLists = await Promise.all(
    filteredRounds.map((r) => matchesRepository(competitionType, competitionId, r.id).getAll()),
  )

  const allMatches = []
  filteredRounds.forEach((round, idx) => {
    for (const m of matchLists[idx]) {
      if (m.status !== 'not_scheduled') continue
      if (!m.player1Id || !m.player2Id) continue
      allMatches.push({ ...m, roundId: round.id, _round: round })
    }
  })

  if (!allMatches.length) return []

  const groupsRepo =
    competitionType === 'leagues'
      ? leagueGroupsRepository(competitionId)
      : tournamentGroupsRepository(competitionId)
  let groups = []
  try {
    groups = await groupsRepo.getAll()
  } catch {
    groups = []
  }
  const groupNameById = new Map(groups.map((g) => [g.id, g.name || g.label || g.id]))

  const playerIds = [...new Set(allMatches.flatMap((m) => [m.player1Id, m.player2Id]))]

  const windows = await fetchAvailabilityForPlayers(playerIds, {
    from: fromDate,
    to: toDate,
    competitionId,
  })

  const byPlayer = new Map()
  for (const w of windows) {
    if (!byPlayer.has(w.playerId)) byPlayer.set(w.playerId, [])
    byPlayer.get(w.playerId).push(w)
  }

  const suggestions = []
  for (const m of allMatches) {
    const w1 = byPlayer.get(m.player1Id) || []
    const w2 = byPlayer.get(m.player2Id) || []
    if (!w1.length || !w2.length) continue
    const overlaps = intersectWindows(w1, w2, MIN_MATCH_MINUTES)
    if (!overlaps.length) continue

    const groupId = m._round?.groupId || null
    const groupName = groupId ? groupNameById.get(groupId) || null : null

    suggestions.push({
      match: { ...m, _round: undefined },
      round: m._round,
      groupId,
      groupName,
      overlaps,
      p1Windows: w1,
      p2Windows: w2,
    })
  }

  suggestions.sort((a, b) => {
    const aMin = Math.min(...a.overlaps.map((o) => o.start.getTime()))
    const bMin = Math.min(...b.overlaps.map((o) => o.start.getTime()))
    return aMin - bMin
  })

  return suggestions
}

export { MIN_MATCH_MINUTES }
