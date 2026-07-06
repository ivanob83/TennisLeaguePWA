import { useEffect, useMemo, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Button, Card, Loader } from '../../../ui/index.js'
import {
  playerAvailabilityRepository,
  playersRepository,
  leaguesRepository,
  tournamentsRepository,
  leagueGroupsRepository,
  tournamentGroupsRepository,
} from '../../../infrastructure/firestore.js'
import { useToast } from '../../../context/ToastContext.jsx'
import { toDate } from '../utils/overlap.js'
import { deleteAvailability } from '../services/availabilityService.js'

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function formatRange(start, end) {
  if (!start || !end) return '-'
  const pad = (n) => String(n).padStart(2, '0')
  const sameDay =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate()
  const dayName = DAY_NAMES[start.getDay()]
  const datePart = `${pad(start.getDate())}.${pad(start.getMonth() + 1)}.${start.getFullYear()}`
  const t1 = `${pad(start.getHours())}:${pad(start.getMinutes())}`
  const t2 = `${pad(end.getHours())}:${pad(end.getMinutes())}`
  if (sameDay) return `${dayName} ${datePart} ${t1}–${t2}`
  const dayName2 = DAY_NAMES[end.getDay()]
  const datePart2 = `${pad(end.getDate())}.${pad(end.getMonth() + 1)}.${end.getFullYear()}`
  return `${dayName} ${datePart} ${t1} → ${dayName2} ${datePart2} ${t2}`
}

async function fetchGroupsByPlayer() {
  const [leagues, tournaments] = await Promise.all([
    leaguesRepository.getAll(),
    tournamentsRepository.getAll(),
  ])
  const activeLeagues = leagues.filter((l) => l.status === 'active' || l.status === 'draft')
  const activeTournaments = tournaments.filter((t) => t.status === 'active' || t.status === 'draft')

  const groupLists = await Promise.all([
    ...activeLeagues.map((l) =>
      leagueGroupsRepository(l.id)
        .getAll()
        .then((gs) => gs.map((g) => ({ ...g, _competitionName: l.name || l.id }))),
    ),
    ...activeTournaments.map((t) =>
      tournamentGroupsRepository(t.id)
        .getAll()
        .then((gs) => gs.map((g) => ({ ...g, _competitionName: t.name || t.id }))),
    ),
  ])

  const map = new Map()
  for (const list of groupLists) {
    for (const g of list) {
      const groupLabel = g.name || g.label || 'Group'
      for (const pid of g.playerIds || []) {
        if (!map.has(pid)) map.set(pid, [])
        const arr = map.get(pid)
        if (!arr.some((x) => x.competition === g._competitionName && x.group === groupLabel)) {
          arr.push({ competition: g._competitionName, group: groupLabel })
        }
      }
    }
  }
  return map
}

export default function AvailabilityTable({ refreshKey = 0, daysWindow = 14 }) {
  const { showToast } = useToast()
  const [availability, setAvailability] = useState([])
  const [players, setPlayers] = useState([])
  const [groupsByPlayer, setGroupsByPlayer] = useState(new Map())
  const [loading, setLoading] = useState(true)
  const [removingId, setRemovingId] = useState(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    Promise.all([
      playerAvailabilityRepository.getAll(),
      playersRepository.getAll(),
      fetchGroupsByPlayer(),
    ])
      .then(([avail, pl, groupMap]) => {
        if (!active) return
        setAvailability(avail)
        setPlayers(pl)
        setGroupsByPlayer(groupMap)
      })
      .catch((err) => {
        console.error('Failed to load availability', err)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [refreshKey])

  const playerNameById = useMemo(
    () => new Map(players.map((p) => [p.id, p.name || p.email || p.id])),
    [players],
  )

  const grouped = useMemo(() => {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - daysWindow)

    const filtered = availability
      .map((w) => ({ ...w, _start: toDate(w.start), _end: toDate(w.end) }))
      .filter((w) => w._end && w._end >= cutoff)
      .sort((a, b) => (a._start?.getTime() || 0) - (b._start?.getTime() || 0))

    const map = new Map()
    for (const w of filtered) {
      const key = w.playerId
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(w)
    }
    return map
  }, [availability, daysWindow])

  async function handleRemove(id) {
    if (!window.confirm('Delete this slot?')) return
    setRemovingId(id)
    try {
      await deleteAvailability(id)
      setAvailability((curr) => curr.filter((w) => w.id !== id))
      showToast({ title: 'Slot deleted', variant: 'success' })
    } catch (err) {
      console.error(err)
      showToast({ title: 'Failed to delete', variant: 'error' })
    } finally {
      setRemovingId(null)
    }
  }

  if (loading) {
    return (
      <Card>
        <div className="flex items-center justify-center py-8">
          <Loader />
        </div>
      </Card>
    )
  }

  if (grouped.size === 0) {
    return (
      <Card>
        <p className="text-sm text-text-light">No slots entered in the last {daysWindow} days.</p>
      </Card>
    )
  }

  return (
    <Card>
      <h3 className="mb-4 font-heading text-base font-semibold text-text">
        Active slots (last {daysWindow} days)
      </h3>
      <div className="space-y-5">
        {[...grouped.entries()].map(([playerId, windows]) => {
          const groups = groupsByPlayer.get(playerId) || []
          return (
            <div key={playerId}>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-primary">
                  {playerNameById.get(playerId) || playerId}
                </span>
                {groups.map((g, idx) => (
                  <span
                    key={idx}
                    className="border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-text-light"
                    title={g.competition}
                  >
                    {g.group}
                  </span>
                ))}
              </div>
              <div className="space-y-1.5">
                {windows.map((w) => (
                  <div
                    key={w.id}
                    className="flex items-center justify-between border border-slate-200 bg-white px-3 py-2 text-sm"
                  >
                    <div className="flex flex-1 flex-wrap items-center gap-3">
                      <span
                        className={
                          w.consumedByMatchId ? 'text-text-lighter line-through' : 'text-text'
                        }
                      >
                        {formatRange(w._start, w._end)}
                      </span>
                      {w.consumedByMatchId ? (
                        <span className="text-xs uppercase tracking-wide text-text-lighter">
                          consumed
                        </span>
                      ) : null}
                      {w.notes ? (
                        <span className="text-xs text-text-light">— {w.notes}</span>
                      ) : null}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemove(w.id)}
                      loading={removingId === w.id}
                      aria-label="Delete slot"
                      className="text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
