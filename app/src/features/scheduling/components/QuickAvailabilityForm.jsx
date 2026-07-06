import { useState } from 'react'
import { Button, Card, Input, Alert } from '../../../ui/index.js'
import { useAuthContext } from '../../auth/context/AuthContext.jsx'
import { useToast } from '../../../context/ToastContext.jsx'
import PlayerCombobox from './PlayerCombobox.jsx'
import PresetChips from './PresetChips.jsx'
import { addAvailability } from '../services/availabilityService.js'

function parseLocalInput(value) {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

/**
 * Tab 1 form. Player picker + preset chips + custom range + notes.
 * Calls `onCreated()` after successful persist so parent can refresh list.
 */
export default function QuickAvailabilityForm({ onCreated, scopeOptions = [] }) {
  const { user } = useAuthContext()
  const { showToast } = useToast()

  const [player, setPlayer] = useState(null)
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [notes, setNotes] = useState('')
  const [scopeKey, setScopeKey] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  function resetForm() {
    // Keep player + notes + scope so admin can add multiple slots
    // for the same player without re-selecting.
    setCustomStart('')
    setCustomEnd('')
  }

  function getScope() {
    if (!scopeKey) return null
    const found = scopeOptions.find((s) => s.value === scopeKey)
    if (!found) return null
    return { competitionType: found.competitionType, competitionId: found.competitionId }
  }

  async function persistWindows(windows) {
    if (!player) {
      setError('Select a player.')
      return
    }
    if (!windows.length) {
      setError('No valid slot to save.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const scope = getScope()
      for (const w of windows) {
        if (!(w.start instanceof Date) || !(w.end instanceof Date)) continue
        if (w.end <= w.start) continue
        await addAvailability({
          playerId: player.id,
          start: w.start,
          end: w.end,
          notes: notes.trim() || null,
          competitionScope: scope,
          createdBy: user.uid,
        })
      }
      showToast({ title: 'Slot added', variant: 'success' })
      resetForm()
      onCreated?.()
    } catch (err) {
      console.error(err)
      setError('Failed to save slot.')
    } finally {
      setSubmitting(false)
    }
  }

  function handlePresetPick(preset) {
    if (!player) {
      setError('Select a player first.')
      return
    }
    persistWindows(preset.build())
  }

  function handleCustomSubmit(e) {
    e.preventDefault()
    const start = parseLocalInput(customStart)
    const end = parseLocalInput(customEnd)
    if (!start || !end) {
      setError('Enter start and end.')
      return
    }
    persistWindows([{ start, end }])
  }

  return (
    <Card>
      <div className="space-y-4">
        <h3 className="font-heading text-base font-semibold text-text">Quick availability entry</h3>

        {error ? <Alert variant="error">{error}</Alert> : null}

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-text">Player</label>
          <PlayerCombobox value={player} onChange={setPlayer} disabled={submitting} />
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-text">Preset</label>
          <PresetChips onPick={handlePresetPick} disabled={submitting} />
        </div>

        <form onSubmit={handleCustomSubmit} className="space-y-3 border-t border-slate-200 pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-light">
            Custom slot
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              type="datetime-local"
              label="From"
              name="start"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              disabled={submitting}
            />
            <Input
              type="datetime-local"
              label="To"
              name="end"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              disabled={submitting}
            />
          </div>
          <Button type="submit" size="sm" loading={submitting} disabled={!player}>
            Add custom slot
          </Button>
        </form>

        <div className="grid grid-cols-1 gap-3 border-t border-slate-200 pt-4 sm:grid-cols-2">
          <Input
            label="Notes"
            name="notes"
            placeholder='e.g. "viber 03.05 21:14"'
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={submitting}
            hint="Optional."
          />
          {scopeOptions.length > 0 ? (
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-text">Scope</label>
              <select
                value={scopeKey}
                onChange={(e) => setScopeKey(e.target.value)}
                disabled={submitting}
                className="w-full border border-slate-300 bg-white px-field-x py-field-y text-sm text-text"
              >
                <option value="">All competitions</option>
                {scopeOptions.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>
      </div>
    </Card>
  )
}
