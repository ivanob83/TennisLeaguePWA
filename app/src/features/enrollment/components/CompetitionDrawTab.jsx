import { useMemo, useState } from 'react'
import { where } from 'firebase/firestore'
import {
  Alert,
  Badge,
  Button,
  Card,
  Loader,
  Select,
} from '../../../ui/index.js'
import { useFirestoreCollection } from '../../../hooks/useFirestore.js'
import {
  leagueGroupsRepository,
  tournamentGroupsRepository,
  roundsRepository,
  matchesRepository,
  leaguesRepository,
  tournamentsRepository,
} from '../../../infrastructure/firestore.js'

function groupName(position) {
  return `Group ${String.fromCharCode(64 + position)}`
}

function buildRoundRobinPairs(playerIds) {
  const pairs = []
  for (let i = 0; i < playerIds.length; i += 1) {
    for (let j = i + 1; j < playerIds.length; j += 1) {
      pairs.push([playerIds[i], playerIds[j]])
    }
  }
  return pairs
}

/**
 * Draw tab logic for group assignment (RR/hybrid) and seeded list (knockout).
 * @param {{competitionType: 'leagues'|'tournaments', competitionId: string, competition: any}} props
 */
export default function CompetitionDrawTab({ competitionType, competitionId, competition }) {
  const groupsRepo =
    competitionType === 'leagues'
      ? leagueGroupsRepository(competitionId)
      : tournamentGroupsRepository(competitionId)

  const competitionRepo = competitionType === 'leagues' ? leaguesRepository : tournamentsRepository
  const enrollmentPath = `${competitionType}/${competitionId}/enrollments`
  const groupsPath = `${competitionType}/${competitionId}/groups`
  const roundsPath = `${competitionType}/${competitionId}/rounds`

  const { data: enrollments, loading: enrollmentsLoading } = useFirestoreCollection(enrollmentPath)
  const { data: groups, loading: groupsLoading } = useFirestoreCollection(groupsPath)
  const { data: rounds } = useFirestoreCollection(roundsPath)

  const [groupSelectState, setGroupSelectState] = useState({})
  const [working, setWorking] = useState(false)
  const [error, setError] = useState(null)

  const isGroupBased =
    competition?.format === 'round_robin' || competition?.format === 'round_robin_knockout'

  const assignedPlayerIds = useMemo(() => {
    if (!isGroupBased) return new Set()
    const ids = groups.flatMap(g => g.playerIds || [])
    return new Set(ids)
  }, [groups, isGroupBased])

  const availableForGroups = useMemo(
    () => enrollments.filter(en => !assignedPlayerIds.has(en.playerId)),
    [enrollments, assignedPlayerIds]
  )

  const seedList = competition?.seededPlayerIds || []
  const seedablePlayers = enrollments.filter(en => !seedList.includes(en.playerId))

  async function ensureGroups() {
    if (!competition?.numGroups || !competition?.playersPerGroup) return
    setWorking(true)
    setError(null)
    try {
      const existingByPosition = new Map(groups.map(g => [g.position, g]))
      const tasks = []
      for (let pos = 1; pos <= competition.numGroups; pos += 1) {
        if (!existingByPosition.has(pos)) {
          tasks.push(
            groupsRepo.create({
              competitionId,
              competitionType: competitionType === 'leagues' ? 'league' : 'tournament',
              name: groupName(pos),
              position: pos,
              playerIds: [],
            })
          )
        }
      }
      await Promise.all(tasks)
    } catch {
      setError('Failed to initialize groups.')
    } finally {
      setWorking(false)
    }
  }

  async function ensureRoundRobinSlots(group, playerIds) {
    if (!competition?.playersPerGroup || playerIds.length !== competition.playersPerGroup) return

    const roundsRepo = roundsRepository(competitionType, competitionId)
    const existing = await roundsRepo.query([
      where('type', '==', 'round_robin'),
      where('groupId', '==', group.id),
    ])

    let round = existing[0]
    if (!round) {
      round = await roundsRepo.create({
        competitionId,
        competitionType: competitionType === 'leagues' ? 'league' : 'tournament',
        roundNumber: group.position,
        name: `${group.name} Round Robin`,
        type: 'round_robin',
        groupId: group.id,
        status: 'scheduled',
      })
    }

    const mRepo = matchesRepository(competitionType, competitionId, round.id)
    const existingMatches = await mRepo.getAll()
    if (existingMatches.length > 0) return

    const pairs = buildRoundRobinPairs(playerIds)
    await Promise.all(
      pairs.map(([player1Id, player2Id]) =>
        mRepo.create({
          competitionId,
          competitionType: competitionType === 'leagues' ? 'league' : 'tournament',
          roundId: round.id,
          groupId: group.id,
          player1Id,
          player2Id,
          status: 'not_scheduled',
          scheduledAt: null,
          generated: true,
        })
      )
    )
  }

  async function assignToGroup(group) {
    const selected = groupSelectState[group.id]
    if (!selected) return
    const current = group.playerIds || []

    if (current.length >= (competition?.playersPerGroup || Infinity)) {
      setError(`Group is full (${competition.playersPerGroup} players).`)
      return
    }

    setWorking(true)
    setError(null)
    try {
      const nextPlayerIds = [...current, selected]
      await groupsRepo.update(group.id, { playerIds: nextPlayerIds })
      setGroupSelectState(prev => ({ ...prev, [group.id]: '' }))
      await ensureRoundRobinSlots(group, nextPlayerIds)
    } catch {
      setError('Failed to assign player to group.')
    } finally {
      setWorking(false)
    }
  }

  async function removeFromGroup(group, playerId) {
    setWorking(true)
    setError(null)
    try {
      const nextPlayerIds = (group.playerIds || []).filter(id => id !== playerId)
      await groupsRepo.update(group.id, { playerIds: nextPlayerIds })
    } catch {
      setError('Failed to remove player from group.')
    } finally {
      setWorking(false)
    }
  }

  async function addToSeedList(playerId) {
    setWorking(true)
    setError(null)
    try {
      await competitionRepo.update(competitionId, {
        seededPlayerIds: [...seedList, playerId],
      })
    } catch {
      setError('Failed to add player to seeded list.')
    } finally {
      setWorking(false)
    }
  }

  async function removeFromSeedList(playerId) {
    setWorking(true)
    setError(null)
    try {
      await competitionRepo.update(competitionId, {
        seededPlayerIds: seedList.filter(id => id !== playerId),
      })
    } catch {
      setError('Failed to remove player from seeded list.')
    } finally {
      setWorking(false)
    }
  }

  async function generateKnockoutSlots() {
    if (seedList.length < 2 || seedList.length % 2 !== 0) {
      setError('Seed list must contain an even number of players (minimum 2).')
      return
    }

    setWorking(true)
    setError(null)
    try {
      const roundsRepo = roundsRepository(competitionType, competitionId)
      const existing = await roundsRepo.query([where('type', '==', 'knockout'), where('roundNumber', '==', 1)])

      let round = existing[0]
      if (!round) {
        round = await roundsRepo.create({
          competitionId,
          competitionType: competitionType === 'leagues' ? 'league' : 'tournament',
          roundNumber: 1,
          name: `Knockout Round (${seedList.length})`,
          type: 'knockout',
          groupId: null,
          status: 'scheduled',
        })
      }

      const mRepo = matchesRepository(competitionType, competitionId, round.id)
      const existingMatches = await mRepo.getAll()
      if (existingMatches.length > 0) return

      const pairings = []
      for (let i = 0; i < seedList.length / 2; i += 1) {
        pairings.push([seedList[i], seedList[seedList.length - 1 - i]])
      }

      await Promise.all(
        pairings.map(([player1Id, player2Id]) =>
          mRepo.create({
            competitionId,
            competitionType: competitionType === 'leagues' ? 'league' : 'tournament',
            roundId: round.id,
            groupId: null,
            player1Id,
            player2Id,
            status: 'not_scheduled',
            scheduledAt: null,
            generated: true,
          })
        )
      )
    } catch {
      setError('Failed to generate knockout slots.')
    } finally {
      setWorking(false)
    }
  }

  function playerLabel(playerId) {
    const enrollment = enrollments.find(en => en.playerId === playerId)
    return enrollment?.playerName || enrollment?.playerEmail || playerId
  }

  const generatedRoundCount = rounds.filter(r => r.type === (isGroupBased ? 'round_robin' : 'knockout')).length

  if (enrollmentsLoading || groupsLoading) {
    return <div className="flex justify-center py-10"><Loader /></div>
  }

  return (
    <div className="space-y-5">
      {error && <Alert variant="error">{error}</Alert>}

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-heading text-base font-semibold text-text">Draw</h3>
          <div className="flex items-center gap-2 text-sm">
            <Badge variant="neutral">Rounds: {generatedRoundCount}</Badge>
            <Badge variant="neutral">Enrolled: {enrollments.length}</Badge>
          </div>
        </div>
      </Card>

      {isGroupBased ? (
        <>
          {groups.length === 0 && (
            <Card>
              <p className="mb-4 text-sm text-text-light">
                This format needs groups. Initialize groups before assigning players.
              </p>
              <Button size="sm" onClick={ensureGroups} loading={working}>
                Create {competition?.numGroups || 0} Groups
              </Button>
            </Card>
          )}

          {groups.map(group => {
            const currentIds = group.playerIds || []
            const available = availableForGroups
            const isFull = currentIds.length >= (competition?.playersPerGroup || Infinity)

            return (
              <Card key={group.id}>
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="font-heading text-sm font-semibold text-text">{group.name}</h4>
                  <Badge variant={isFull ? 'finished' : 'scheduled'}>
                    {currentIds.length}/{competition?.playersPerGroup || 0}
                  </Badge>
                </div>

                {currentIds.length === 0 ? (
                  <p className="mb-3 text-sm text-text-light">No players assigned yet.</p>
                ) : (
                  <div className="mb-3 space-y-2">
                    {currentIds.map(playerId => (
                      <div key={playerId} className="flex items-center justify-between border border-slate-200 px-3 py-2">
                        <span className="text-sm text-text">{playerLabel(playerId)}</span>
                        <button
                          type="button"
                          className="text-xs text-rose-600 hover:text-rose-700"
                          onClick={() => removeFromGroup(group, playerId)}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {!isFull && (
                  <div className="flex gap-3">
                    <Select
                      className="flex-1"
                      placeholder="Select player"
                      value={groupSelectState[group.id] || ''}
                      options={available.map(en => ({
                        value: en.playerId,
                        label: en.playerName || en.playerEmail,
                      }))}
                      onChange={e =>
                        setGroupSelectState(prev => ({ ...prev, [group.id]: e.target.value }))
                      }
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => assignToGroup(group)}
                      disabled={!groupSelectState[group.id]}
                    >
                      Add
                    </Button>
                  </div>
                )}
              </Card>
            )
          })}
        </>
      ) : (
        <Card>
          <h4 className="mb-3 font-heading text-sm font-semibold text-text">Seeded Player List (Knockout)</h4>

          {seedList.length === 0 ? (
            <p className="mb-3 text-sm text-text-light">No seeded players yet.</p>
          ) : (
            <div className="mb-4 space-y-2">
              {seedList.map((playerId, index) => (
                <div key={playerId} className="flex items-center justify-between border border-slate-200 px-3 py-2">
                  <span className="text-sm text-text">{index + 1}. {playerLabel(playerId)}</span>
                  <button
                    type="button"
                    className="text-xs text-rose-600 hover:text-rose-700"
                    onClick={() => removeFromSeedList(playerId)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="mb-4 flex gap-3">
            <Select
              className="flex-1"
              placeholder="Select player"
              options={seedablePlayers.map(en => ({
                value: en.playerId,
                label: en.playerName || en.playerEmail,
              }))}
              value={groupSelectState.knockout || ''}
              onChange={e =>
                setGroupSelectState(prev => ({ ...prev, knockout: e.target.value }))
              }
            />
            <Button
              size="sm"
              variant="outline"
              disabled={!groupSelectState.knockout}
              onClick={() => addToSeedList(groupSelectState.knockout)}
            >
              Add Seed
            </Button>
          </div>

          <Button
            size="sm"
            onClick={generateKnockoutSlots}
            loading={working}
            loadingLabel="Generating..."
          >
            Generate Knockout Slots
          </Button>
        </Card>
      )}
    </div>
  )
}
