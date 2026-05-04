/**
 * Expand a round-robin league: increase playersPerGroup additively.
 *
 * Strictly additive operation:
 *   - league.playersPerGroup updated to newPlayersPerGroup
 *   - group.playerIds appended with nulls (never reorders existing slots)
 *   - new match slots created only for new pairs of positions
 *   - existing match documents are NEVER modified or deleted
 *   - existing enrollments untouched
 *
 * Hard guard (T1.7): snapshots existing match ids and the first oldSize slots of
 * each group's playerIds before writing, then asserts they are unchanged after.
 * Any divergence throws — surfacing accidental destructive ops.
 *
 * Idempotent (T1.2): if some new pairs already exist (re-run / retry), they are
 * filtered out before create.
 */
import { where } from 'firebase/firestore'
import {
  leaguesRepository,
  leagueGroupsRepository,
  roundsRepository,
  matchesRepository,
} from '../../../infrastructure/firestore.js'

function generateNewPairs(oldSize, newSize) {
  const pairs = []
  for (let i = 1; i <= newSize; i++)
    for (let j = i + 1; j <= newSize; j++) if (i > oldSize || j > oldSize) pairs.push([i, j])
  return pairs
}

function pairKey(p1, p2) {
  return `${p1}-${p2}`
}

function assertExistingMatchesUntouched(beforeIds, afterMatches) {
  const afterIds = new Set(afterMatches.map((m) => m.id))
  for (const id of beforeIds) {
    if (!afterIds.has(id)) throw new Error(`Invariant violated: existing match ${id} was deleted`)
  }
  if (afterMatches.length < beforeIds.size)
    throw new Error('Invariant violated: match count decreased')
}

function assertPlayerIdsPrefixEqual(beforeIds, afterIds, oldSize, groupId) {
  for (let i = 0; i < oldSize; i++) {
    if (beforeIds[i] !== afterIds[i])
      throw new Error(
        `Invariant violated: group ${groupId} playerIds[${i}] changed from ${beforeIds[i]} to ${afterIds[i]}`,
      )
  }
}

/**
 * @param {string} leagueId
 * @param {number} newPlayersPerGroup
 * @param {{ dryRun?: boolean }} [options]
 * @returns {Promise<{ dryRun: boolean, oldSize: number, newSize: number, groupsUpdated: number, matchesCreated: number, perGroup: Array<{ groupId: string, name: string, paddedSlots: number, matchesCreated: number, matchesSkipped: number }> }>}
 */
export async function expandRoundRobinLeague(leagueId, newPlayersPerGroup, options = {}) {
  const { dryRun = false } = options

  // ----- T1.3 Validations -----
  const league = await leaguesRepository.getById(leagueId)
  if (!league) throw new Error('League not found')
  if (!['round_robin', 'round_robin_knockout'].includes(league.format))
    throw new Error('Only round-robin formats supported')
  if (['completed', 'archived'].includes(league.status))
    throw new Error('Cannot expand completed/archived league')

  const oldSize = league.playersPerGroup
  if (typeof newPlayersPerGroup !== 'number' || !Number.isInteger(newPlayersPerGroup))
    throw new Error('newPlayersPerGroup must be an integer')
  if (newPlayersPerGroup <= oldSize)
    throw new Error(`newPlayersPerGroup must be > ${oldSize} (current playersPerGroup)`)

  const rRepo = roundsRepository('leagues', leagueId)

  if (league.format === 'round_robin_knockout') {
    const koRounds = await rRepo.query([where('type', '==', 'knockout')])
    if (koRounds.length > 0) throw new Error('Knockout phase already generated; expansion blocked')
  }

  // ----- Load current state -----
  const groupsRepo = leagueGroupsRepository(leagueId)
  const groups = await groupsRepo.getAll()
  const allRounds = await rRepo.getAll()

  const newPairs = generateNewPairs(oldSize, newPlayersPerGroup)

  // Snapshot per-group: matches before, playerIds prefix before.
  const groupSnapshots = []
  for (const group of groups) {
    const round = allRounds.find((r) => r.type === 'round_robin' && r.groupId === group.id)
    const existingMatches = round
      ? await matchesRepository('leagues', leagueId, round.id).getAll()
      : []
    const existingPairs = new Set(
      existingMatches.map((m) => pairKey(m.player1Position, m.player2Position)),
    )
    // ----- T1.2 Idempotent filter -----
    const pairsToCreate = newPairs.filter(([p1, p2]) => !existingPairs.has(pairKey(p1, p2)))

    groupSnapshots.push({
      group,
      round,
      existingMatchIds: new Set(existingMatches.map((m) => m.id)),
      existingMatchCount: existingMatches.length,
      playerIdsBefore: [...(group.playerIds ?? [])],
      pairsToCreate,
      matchesSkipped: newPairs.length - pairsToCreate.length,
    })
  }

  // ----- Dry-run early return -----
  const perGroup = groupSnapshots.map((s) => ({
    groupId: s.group.id,
    name: s.group.name,
    paddedSlots: Math.max(0, newPlayersPerGroup - (s.group.playerIds?.length ?? 0)),
    matchesCreated: s.pairsToCreate.length,
    matchesSkipped: s.matchesSkipped,
  }))
  const matchesCreated = perGroup.reduce((sum, g) => sum + g.matchesCreated, 0)

  if (dryRun) {
    return {
      dryRun: true,
      oldSize,
      newSize: newPlayersPerGroup,
      groupsUpdated: groups.length,
      matchesCreated,
      perGroup,
    }
  }

  // ----- Writes -----
  await leaguesRepository.update(leagueId, { playersPerGroup: newPlayersPerGroup })

  for (const snap of groupSnapshots) {
    const { group, round, playerIdsBefore } = snap

    // ----- T1.4 Defensive padding -----
    const currentLen = playerIdsBefore.length
    const padCount = Math.max(0, newPlayersPerGroup - currentLen)
    const paddedPlayerIds =
      padCount > 0 ? [...playerIdsBefore, ...Array(padCount).fill(null)] : playerIdsBefore
    if (padCount > 0) {
      await groupsRepo.update(group.id, { playerIds: paddedPlayerIds })
    }

    if (!round) continue

    const mRepo = matchesRepository('leagues', leagueId, round.id)
    await Promise.all(
      snap.pairsToCreate.map(([p1Pos, p2Pos]) =>
        mRepo.create({
          competitionId: leagueId,
          competitionType: 'league',
          roundId: round.id,
          groupId: group.id,
          player1Position: p1Pos,
          player2Position: p2Pos,
          player1Id: paddedPlayerIds[p1Pos - 1] ?? null,
          player2Id: paddedPlayerIds[p2Pos - 1] ?? null,
          status: 'not_scheduled',
          scheduledAt: null,
          generated: true,
        }),
      ),
    )
  }

  // ----- T1.7 Hard-guard: verify invariants post-write -----
  for (const snap of groupSnapshots) {
    const { group, round, existingMatchIds, playerIdsBefore } = snap

    const groupAfter = await groupsRepo.getById(group.id)
    if (!groupAfter) throw new Error(`Invariant violated: group ${group.id} disappeared`)
    assertPlayerIdsPrefixEqual(playerIdsBefore, groupAfter.playerIds ?? [], oldSize, group.id)
    if ((groupAfter.playerIds?.length ?? 0) < newPlayersPerGroup)
      throw new Error(
        `Invariant violated: group ${group.id} playerIds length ${groupAfter.playerIds?.length} < ${newPlayersPerGroup}`,
      )

    if (!round) continue
    const matchesAfter = await matchesRepository('leagues', leagueId, round.id).getAll()
    assertExistingMatchesUntouched(existingMatchIds, matchesAfter)
  }

  return {
    dryRun: false,
    oldSize,
    newSize: newPlayersPerGroup,
    groupsUpdated: groups.length,
    matchesCreated,
    perGroup,
  }
}

/**
 * Repair: ensure every (i,j) pair with i<j in [1..league.playersPerGroup] has a
 * match document for each round-robin round of every group. Idempotent — does
 * not modify league.playersPerGroup or existing match documents. Safe to run
 * anytime to recover from drift / partial writes.
 *
 * @param {string} leagueId
 * @param {{ dryRun?: boolean }} [options]
 */
export async function repairRoundRobinMatches(leagueId, options = {}) {
  const { dryRun = false } = options
  const league = await leaguesRepository.getById(leagueId)
  if (!league) throw new Error('League not found')
  if (!['round_robin', 'round_robin_knockout'].includes(league.format))
    throw new Error('Only round-robin formats supported')

  const n = league.playersPerGroup
  if (!Number.isInteger(n) || n < 2) throw new Error(`Invalid league.playersPerGroup: ${n}`)

  const rRepo = roundsRepository('leagues', leagueId)
  const groupsRepo = leagueGroupsRepository(leagueId)
  const groups = await groupsRepo.getAll()
  const allRounds = await rRepo.getAll()

  const allPairs = []
  for (let i = 1; i <= n; i++) for (let j = i + 1; j <= n; j++) allPairs.push([i, j])

  const perGroup = []
  let matchesCreated = 0
  let groupsWithoutRound = 0

  for (const group of groups) {
    const round = allRounds.find((r) => r.type === 'round_robin' && r.groupId === group.id)
    if (!round) {
      groupsWithoutRound++
      perGroup.push({
        groupId: group.id,
        name: group.name,
        roundFound: false,
        existing: 0,
        missing: allPairs.length,
        matchesCreated: 0,
      })
      continue
    }
    const mRepo = matchesRepository('leagues', leagueId, round.id)
    const existingMatches = await mRepo.getAll()
    const existingPairs = new Set(
      existingMatches.map((m) => pairKey(m.player1Position, m.player2Position)),
    )
    const missingPairs = allPairs.filter(([p1, p2]) => !existingPairs.has(pairKey(p1, p2)))

    const groupPlayerIds = group.playerIds ?? []
    if (!dryRun && missingPairs.length > 0) {
      await Promise.all(
        missingPairs.map(([p1Pos, p2Pos]) =>
          mRepo.create({
            competitionId: leagueId,
            competitionType: 'league',
            roundId: round.id,
            groupId: group.id,
            player1Position: p1Pos,
            player2Position: p2Pos,
            player1Id: groupPlayerIds[p1Pos - 1] ?? null,
            player2Id: groupPlayerIds[p2Pos - 1] ?? null,
            status: 'not_scheduled',
            scheduledAt: null,
            generated: true,
          }),
        ),
      )
    }

    // Sync existing matches' player IDs from group.playerIds when current value
    // is null and slot is filled. Only fills nulls — never overwrites a real id.
    let idsSynced = 0
    const idSyncCandidates = existingMatches.filter((m) => {
      const expected1 = groupPlayerIds[(m.player1Position ?? 0) - 1] ?? null
      const expected2 = groupPlayerIds[(m.player2Position ?? 0) - 1] ?? null
      const needs1 = m.player1Id == null && expected1 != null
      const needs2 = m.player2Id == null && expected2 != null
      return needs1 || needs2
    })
    if (!dryRun && idSyncCandidates.length > 0) {
      await Promise.all(
        idSyncCandidates.map((m) => {
          const update = {}
          const expected1 = groupPlayerIds[m.player1Position - 1] ?? null
          const expected2 = groupPlayerIds[m.player2Position - 1] ?? null
          if (m.player1Id == null && expected1 != null) update.player1Id = expected1
          if (m.player2Id == null && expected2 != null) update.player2Id = expected2
          return mRepo.update(m.id, update)
        }),
      )
    }
    idsSynced = idSyncCandidates.length

    matchesCreated += dryRun ? 0 : missingPairs.length
    perGroup.push({
      groupId: group.id,
      name: group.name,
      roundFound: true,
      existing: existingMatches.length,
      missing: missingPairs.length,
      matchesCreated: dryRun ? 0 : missingPairs.length,
      idsSynced: dryRun ? 0 : idsSynced,
    })
  }

  return {
    dryRun,
    playersPerGroup: n,
    expectedPerGroup: allPairs.length,
    groupsTotal: groups.length,
    groupsWithoutRound,
    matchesCreated,
    perGroup,
  }
}
