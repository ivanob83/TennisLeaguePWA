import { useMemo, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Alert, Badge, Button, Card, Loader, Select } from '../../../ui/index.js'
import { useFirestoreCollection } from '../../../hooks/useFirestore.js'
import {
  leagueGroupsRepository,
  tournamentGroupsRepository,
  roundsRepository,
  matchesRepository,
  leaguesRepository,
  tournamentsRepository,
} from '../../../infrastructure/firestore.js'

/**
 * Draw tab: assign enrolled players to group positions (RR) or seed positions (knockout).
 * Match slots already exist (created on competition creation) with null player IDs.
 * Assigning a player to position N updates all match slots for that position.
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

  // All player IDs currently assigned to any group position
  const assignedPlayerIds = useMemo(() => {
    const ids = groups.flatMap((g) => (g.playerIds || []).filter(Boolean))
    return new Set(ids)
  }, [groups])

  const availableForGroups = useMemo(
    () => enrollments.filter((en) => !assignedPlayerIds.has(en.playerId)),
    [enrollments, assignedPlayerIds],
  )

  const seedList = competition?.seededPlayerIds || []
  const seedablePlayers = enrollments.filter((en) => !seedList.includes(en.playerId))

  function playerLabel(playerId) {
    if (!playerId) return 'BYE'
    const en = enrollments.find((e) => e.playerId === playerId)
    return en?.playerName || en?.playerEmail || playerId
  }

  // Update all match slots in a round that reference a given position
  async function updateMatchSlots(roundId, position, playerId) {
    const mRepo = matchesRepository(competitionType, competitionId, roundId)
    const allMatches = await mRepo.getAll()
    const updates = []
    for (const match of allMatches) {
      if (match.player1Position === position)
        updates.push(mRepo.update(match.id, { player1Id: playerId }))
      if (match.player2Position === position)
        updates.push(mRepo.update(match.id, { player2Id: playerId }))
    }
    await Promise.all(updates)
  }

  async function assignToGroup(group) {
    const selected = groupSelectState[group.id]
    if (!selected) return
    const playerIds = group.playerIds || []
    const emptyIdx = playerIds.indexOf(null)
    if (emptyIdx === -1) {
      setError(`Group ${group.name} is full.`)
      return
    }

    setWorking(true)
    setError(null)
    try {
      const nextPlayerIds = [...playerIds]
      nextPlayerIds[emptyIdx] = selected
      await groupsRepo.update(group.id, { playerIds: nextPlayerIds })
      setGroupSelectState((prev) => ({ ...prev, [group.id]: '' }))

      const round = rounds.find((r) => r.groupId === group.id)
      if (round) await updateMatchSlots(round.id, emptyIdx + 1, selected)
    } catch {
      setError('Failed to assign player to group.')
    } finally {
      setWorking(false)
    }
  }

  async function removeFromGroup(group, idx) {
    setWorking(true)
    setError(null)
    try {
      const nextPlayerIds = [...(group.playerIds || [])]
      nextPlayerIds[idx] = null
      await groupsRepo.update(group.id, { playerIds: nextPlayerIds })

      const round = rounds.find((r) => r.groupId === group.id)
      if (round) await updateMatchSlots(round.id, idx + 1, null)
    } catch {
      setError('Failed to remove player from group.')
    } finally {
      setWorking(false)
    }
  }

  async function addToSeedList(playerId) {
    const emptyIdx = seedList.indexOf(null)
    if (emptyIdx === -1) return
    setWorking(true)
    setError(null)
    try {
      const next = [...seedList]
      next[emptyIdx] = playerId
      await competitionRepo.update(competitionId, { seededPlayerIds: next })
      setGroupSelectState((prev) => ({ ...prev, knockout: '' }))

      const round = rounds.find((r) => r.type === 'knockout')
      if (round) await updateMatchSlots(round.id, emptyIdx + 1, playerId)
    } catch {
      setError('Failed to assign player to seed position.')
    } finally {
      setWorking(false)
    }
  }

  async function removeFromSeedList(idx) {
    setWorking(true)
    setError(null)
    try {
      const next = [...seedList]
      next[idx] = null
      await competitionRepo.update(competitionId, { seededPlayerIds: next })

      const round = rounds.find((r) => r.type === 'knockout')
      if (round) await updateMatchSlots(round.id, idx + 1, null)
    } catch {
      setError('Failed to remove player from seed list.')
    } finally {
      setWorking(false)
    }
  }

  if (enrollmentsLoading || groupsLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {error && <Alert variant="error">{error}</Alert>}

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-heading text-base font-semibold text-text">Draw</h3>
          <Badge variant="neutral">Enrolled: {enrollments.length}</Badge>
        </div>
      </Card>

      {isGroupBased ? (
        groups
          .slice()
          .sort((a, b) => (a.position || 0) - (b.position || 0))
          .map((group) => {
            const playerIds = group.playerIds || []
            const filled = playerIds.filter(Boolean).length
            const total = playerIds.length
            const isFull = filled >= total

            return (
              <Card key={group.id}>
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="font-heading text-sm font-semibold text-text">{group.name}</h4>
                  <Badge variant={isFull ? 'finished' : 'scheduled'}>
                    {filled}/{total}
                  </Badge>
                </div>

                <div className="mb-3 space-y-1.5">
                  {playerIds.map((playerId, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between border border-slate-200 px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 text-xs text-text-light">{idx + 1}</span>
                        <span
                          className={`text-sm ${playerId ? 'text-text' : 'italic text-text-light'}`}
                        >
                          {playerLabel(playerId)}
                        </span>
                      </div>
                      {playerId && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-slate-400 hover:text-rose-500"
                          onClick={() => removeFromGroup(group, idx)}
                          disabled={working}
                        >
                          <Trash2 size={14} />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                {!isFull && (
                  <div className="flex gap-3">
                    <Select
                      className="flex-1"
                      placeholder="Select player to assign"
                      value={groupSelectState[group.id] || ''}
                      options={availableForGroups.map((en) => ({
                        value: en.playerId,
                        label: en.playerName || en.playerEmail,
                      }))}
                      onChange={(e) =>
                        setGroupSelectState((prev) => ({ ...prev, [group.id]: e.target.value }))
                      }
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => assignToGroup(group)}
                      disabled={!groupSelectState[group.id] || working}
                    >
                      Assign
                    </Button>
                  </div>
                )}
              </Card>
            )
          })
      ) : (
        <Card>
          <h4 className="mb-3 font-heading text-sm font-semibold text-text">
            Seeded Positions (Knockout)
          </h4>

          <div className="mb-4 space-y-1.5">
            {seedList.map((playerId, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between border border-slate-200 px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 text-xs text-text-light">{idx + 1}</span>
                  <span className={`text-sm ${playerId ? 'text-text' : 'italic text-text-light'}`}>
                    {playerLabel(playerId)}
                  </span>
                </div>
                {playerId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-slate-400 hover:text-rose-500"
                    onClick={() => removeFromSeedList(idx)}
                    disabled={working}
                  >
                    <Trash2 size={14} />
                  </Button>
                )}
              </div>
            ))}
          </div>

          {seedList.some((id) => id === null) && (
            <div className="flex gap-3">
              <Select
                className="flex-1"
                placeholder="Select player"
                options={seedablePlayers.map((en) => ({
                  value: en.playerId,
                  label: en.playerName || en.playerEmail,
                }))}
                value={groupSelectState.knockout || ''}
                onChange={(e) =>
                  setGroupSelectState((prev) => ({ ...prev, knockout: e.target.value }))
                }
              />
              <Button
                size="sm"
                variant="outline"
                disabled={!groupSelectState.knockout || working}
                onClick={() => addToSeedList(groupSelectState.knockout)}
              >
                Assign
              </Button>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
