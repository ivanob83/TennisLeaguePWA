/**
 * Creates all groups, rounds, and match slots when a competition is first created.
 * Slots are generated with positional fields (player1Position, player2Position)
 * and null player IDs (null = BYE until a player is assigned).
 *
 * @param {object} competition - The newly created competition document
 * @param {string} competitionId
 * @param {'leagues'|'tournaments'} competitionType
 */
import {
  leagueGroupsRepository,
  tournamentGroupsRepository,
  roundsRepository,
  matchesRepository,
} from '../../../infrastructure/firestore.js'

function groupName(pos) {
  return `Group ${String.fromCharCode(64 + pos)}`
}

function rrPairs(n) {
  const pairs = []
  for (let i = 1; i <= n; i++)
    for (let j = i + 1; j <= n; j++)
      pairs.push([i, j])
  return pairs
}

export async function createCompetitionSlots(competition, competitionId, competitionType) {
  const cType = competitionType === 'leagues' ? 'league' : 'tournament'
  const isRR = competition.format === 'round_robin' || competition.format === 'round_robin_knockout'
  const isKO = competition.format === 'knockout'

  const groupsRepo = competitionType === 'leagues'
    ? leagueGroupsRepository(competitionId)
    : tournamentGroupsRepository(competitionId)
  const rRepo = roundsRepository(competitionType, competitionId)

  if (isRR) {
    for (let pos = 1; pos <= competition.numGroups; pos++) {
      const multiplier = competition.tierMultipliers?.[pos - 1] ?? 1.0

      const group = await groupsRepo.create({
        competitionId,
        competitionType: cType,
        name: groupName(pos),
        position: pos,
        // Fixed-size positional array: index = position-1, null = BYE
        playerIds: Array(competition.playersPerGroup).fill(null),
        rankingMultiplier: multiplier,
      })

      const round = await rRepo.create({
        competitionId,
        competitionType: cType,
        roundNumber: pos,
        name: `${groupName(pos)} Round Robin`,
        type: 'round_robin',
        groupId: group.id,
        status: 'scheduled',
      })

      const mRepo = matchesRepository(competitionType, competitionId, round.id)
      await Promise.all(
        rrPairs(competition.playersPerGroup).map(([p1Pos, p2Pos]) =>
          mRepo.create({
            competitionId,
            competitionType: cType,
            roundId: round.id,
            groupId: group.id,
            player1Position: p1Pos,
            player2Position: p2Pos,
            player1Id: null,
            player2Id: null,
            status: 'not_scheduled',
            scheduledAt: null,
            generated: true,
          })
        )
      )
    }
  }

  // Pure knockout: bracket slots from seed positions
  // Note: round_robin_knockout knockout phase is generated after RR results are in (Sprint 3)
  if (isKO) {
    const n = competition.numPlayers
    const round = await rRepo.create({
      competitionId,
      competitionType: cType,
      roundNumber: 1,
      name: `Knockout Round of ${n}`,
      type: 'knockout',
      groupId: null,
      status: 'scheduled',
    })

    const mRepo = matchesRepository(competitionType, competitionId, round.id)
    // Seed 1 vs N, 2 vs N-1, ...
    await Promise.all(
      Array.from({ length: n / 2 }, (_, i) => [i + 1, n - i]).map(([p1Pos, p2Pos]) =>
        mRepo.create({
          competitionId,
          competitionType: cType,
          roundId: round.id,
          groupId: null,
          player1Position: p1Pos,
          player2Position: p2Pos,
          player1Id: null,
          player2Id: null,
          status: 'not_scheduled',
          scheduledAt: null,
          generated: true,
        })
      )
    )
  }
}
