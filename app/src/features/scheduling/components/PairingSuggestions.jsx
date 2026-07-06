import { useEffect, useMemo, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { Card, Loader, Button, Alert } from '../../../ui/index.js'
import { playersRepository } from '../../../infrastructure/firestore.js'
import { computeSuggestions } from '../services/pairingService.js'
import SuggestionCard from './SuggestionCard.jsx'

function startOfWeek(d) {
  const out = new Date(d)
  out.setHours(0, 0, 0, 0)
  return out
}

function endOfWeekFrom(d) {
  const out = new Date(d)
  // 7 days from now, 23:59
  out.setDate(out.getDate() + 7)
  out.setHours(23, 59, 59, 999)
  return out
}

/**
 * Tab 2 body. Filters at the top; list of cards below.
 *
 * Props:
 *   competitionOptions  Array<{ value, label, competitionType, competitionId }>
 *   defaultCompetition  string|null  (the `value` of competitionOptions to preselect)
 */
export default function PairingSuggestions({ competitionOptions = [], defaultCompetition = null }) {
  const [selectedKey, setSelectedKey] = useState(
    defaultCompetition || competitionOptions[0]?.value || '',
  )
  const [thisWeekOnly, setThisWeekOnly] = useState(true)
  const [suggestions, setSuggestions] = useState([])
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [refreshTick, setRefreshTick] = useState(0)

  useEffect(() => {
    let active = true
    playersRepository
      .getAll()
      .then((list) => {
        if (active) setPlayers(list)
      })
      .catch(() => {
        if (active) setPlayers([])
      })
    return () => {
      active = false
    }
  }, [])

  const playersById = useMemo(() => new Map(players.map((p) => [p.id, p])), [players])

  const selected = competitionOptions.find((c) => c.value === selectedKey) || null

  useEffect(() => {
    if (!selected) {
      setSuggestions([])
      return
    }
    let active = true
    setLoading(true)
    setError(null)
    const fromDate = thisWeekOnly ? startOfWeek(new Date()) : new Date()
    const toDate = thisWeekOnly ? endOfWeekFrom(new Date()) : null
    computeSuggestions({
      competitionType: selected.competitionType,
      competitionId: selected.competitionId,
      fromDate,
      toDate,
    })
      .then((res) => {
        if (active) setSuggestions(res)
      })
      .catch((err) => {
        console.error(err)
        if (active) setError('Failed to compute suggestions.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [selectedKey, thisWeekOnly, refreshTick, selected])

  return (
    <div className="space-y-5">
      <Card>
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[240px] flex-1 space-y-1.5">
            <label className="block text-sm font-medium text-text">Competition</label>
            <select
              value={selectedKey}
              onChange={(e) => setSelectedKey(e.target.value)}
              className="w-full border border-slate-300 bg-white px-field-x py-field-y text-sm text-text"
            >
              {competitionOptions.length === 0 ? (
                <option value="">No active competitions</option>
              ) : null}
              {competitionOptions.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={thisWeekOnly}
              onChange={(e) => setThisWeekOnly(e.target.checked)}
            />
            This week only
          </label>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setRefreshTick((t) => t + 1)}
            disabled={loading || !selected}
          >
            <RefreshCw size={14} />
            Refresh
          </Button>
        </div>
      </Card>

      {error ? <Alert variant="error">{error}</Alert> : null}

      {loading ? (
        <Card>
          <div className="flex items-center justify-center py-8">
            <Loader />
          </div>
        </Card>
      ) : !selected ? (
        <Card>
          <p className="text-sm text-text-light">Select a competition.</p>
        </Card>
      ) : suggestions.length === 0 ? (
        <Card>
          <p className="text-sm text-text-light">
            No suggestions. Add slots in "Quick entry" or widen the window.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {suggestions.map((s) => (
            <SuggestionCard
              key={s.match.id}
              suggestion={s}
              competitionType={selected.competitionType}
              competitionId={selected.competitionId}
              playersById={playersById}
              onScheduled={() => setRefreshTick((t) => t + 1)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
