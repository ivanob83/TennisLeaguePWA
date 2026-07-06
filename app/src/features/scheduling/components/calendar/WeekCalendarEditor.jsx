import { useEffect, useMemo, useState } from 'react'
import { Card, Alert, ConfirmDialog } from '../../../../ui/index.js'
import { useToast } from '../../../../context/ToastContext.jsx'
import { useAuthContext } from '../../../auth/context/AuthContext.jsx'
import { playerAvailabilityRepository } from '../../../../infrastructure/firestore.js'
import { addAvailability, fetchAvailabilityForPlayers } from '../../services/availabilityService.js'
import { addDays, cellKey, mondayOf } from '../../utils/weekRange.js'
import { toDate } from '../../utils/overlap.js'
import {
  DEFAULT_HOUR_RANGE,
  consumedCellsFromDocs,
  diffWeek,
  docsToCells,
} from '../../utils/weekDiff.js'
import HourGrid from './HourGrid.jsx'
import WeekHeader from './WeekHeader.jsx'
import SaveBar from './SaveBar.jsx'
import GridSkeleton from './GridSkeleton.jsx'

export default function WeekCalendarEditor({
  playerId,
  scope = null,
  hourRange = DEFAULT_HOUR_RANGE,
  onDirtyChange,
}) {
  const { user } = useAuthContext()
  const { showToast } = useToast()
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()))
  const [originalDocs, setOriginalDocs] = useState([])
  const [draftCells, setDraftCells] = useState(() => new Set())
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [pendingNav, setPendingNav] = useState(null) // () => void

  useEffect(() => {
    if (!playerId) {
      setOriginalDocs([])
      setDraftCells(new Set())
      return
    }
    let active = true
    setLoading(true)
    setError(null)
    fetchAvailabilityForPlayers([playerId], {
      from: weekStart,
      to: addDays(weekStart, 7),
      competitionId: scope?.competitionId || null,
      includeConsumed: true,
    })
      .then((docs) => {
        if (!active) return
        setOriginalDocs(docs)
        setDraftCells(docsToCells(docs, weekStart, hourRange))
      })
      .catch((err) => {
        console.error('Failed to load availability', err)
        if (active) setError('Failed to load availability.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [playerId, weekStart, scope?.competitionId, hourRange])

  const consumedCells = useMemo(
    () => consumedCellsFromDocs(originalDocs, weekStart, hourRange),
    [originalDocs, weekStart, hourRange],
  )

  const editableDocsCount = useMemo(
    () => originalDocs.filter((d) => !d.consumedByMatchId).length,
    [originalDocs],
  )

  const legacyCount = useMemo(() => {
    let n = 0
    for (const d of originalDocs) {
      if (d.consumedByMatchId) continue
      const start = toDate(d.start)
      const end = toDate(d.end)
      if (!start || !end) continue
      if (start.getMinutes() !== 0 || end.getMinutes() !== 0) n++
    }
    return n
  }, [originalDocs])

  const allConsumedNotice = consumedCells.size > 0 && editableDocsCount === 0

  const diff = useMemo(
    () => diffWeek(originalDocs, draftCells, weekStart, hourRange),
    [originalDocs, draftCells, weekStart, hourRange],
  )

  const changesCount = diff.creates.length + diff.updates.length + diff.deletes.length
  const dirty = changesCount > 0

  useEffect(() => {
    onDirtyChange?.(dirty)
  }, [dirty, onDirtyChange])

  function toggleCell(key) {
    if (consumedCells.has(key)) return
    setDraftCells((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function toggleDay(dayIndex) {
    const day = addDays(weekStart, dayIndex)
    const [hMin, hMax] = hourRange
    const editableKeys = []
    for (let h = hMin; h < hMax; h++) {
      const k = cellKey(day, h)
      if (!consumedCells.has(k)) editableKeys.push(k)
    }
    if (editableKeys.length === 0) return
    setDraftCells((prev) => {
      const allSelected = editableKeys.every((k) => prev.has(k))
      const next = new Set(prev)
      if (allSelected) {
        for (const k of editableKeys) next.delete(k)
      } else {
        for (const k of editableKeys) next.add(k)
      }
      return next
    })
  }

  function toggleHour(hour) {
    const editableKeys = []
    for (let i = 0; i < 7; i++) {
      const day = addDays(weekStart, i)
      const k = cellKey(day, hour)
      if (!consumedCells.has(k)) editableKeys.push(k)
    }
    if (editableKeys.length === 0) return
    setDraftCells((prev) => {
      const allSelected = editableKeys.every((k) => prev.has(k))
      const next = new Set(prev)
      if (allSelected) {
        for (const k of editableKeys) next.delete(k)
      } else {
        for (const k of editableKeys) next.add(k)
      }
      return next
    })
  }

  function attemptWeekChange(nextWeekStart) {
    if (dirty) {
      setPendingNav(() => () => setWeekStart(nextWeekStart))
      return
    }
    setWeekStart(nextWeekStart)
  }

  function handleCancel() {
    setDraftCells(docsToCells(originalDocs, weekStart, hourRange))
  }

  async function handleSave() {
    if (!playerId || !dirty) return
    setSaving(true)
    setError(null)
    try {
      await Promise.all([
        ...diff.creates.map((b) =>
          addAvailability({
            playerId,
            start: b.start,
            end: b.end,
            notes: null,
            competitionScope: scope
              ? { competitionType: scope.competitionType, competitionId: scope.competitionId }
              : null,
            createdBy: user.uid,
          }),
        ),
        ...diff.updates.map((u) =>
          playerAvailabilityRepository.update(u.id, { start: u.start, end: u.end }),
        ),
        ...diff.deletes.map((id) => playerAvailabilityRepository.delete(id)),
      ])
      const fresh = await fetchAvailabilityForPlayers([playerId], {
        from: weekStart,
        to: addDays(weekStart, 7),
        competitionId: scope?.competitionId || null,
        includeConsumed: true,
      })
      setOriginalDocs(fresh)
      setDraftCells(docsToCells(fresh, weekStart, hourRange))
      showToast({
        title: changesCount === 1 ? '1 change saved' : `${changesCount} changes saved`,
        variant: 'success',
      })
    } catch (err) {
      console.error('Failed to save availability', err)
      setError('Failed to save changes. Some writes may have partially applied.')
      showToast({ title: 'Save failed', variant: 'error' })
    } finally {
      setSaving(false)
    }
  }

  function confirmNav() {
    const action = pendingNav
    setPendingNav(null)
    action?.()
  }

  function cancelNav() {
    setPendingNav(null)
  }

  if (!playerId) {
    return (
      <Card>
        <p className="text-sm text-text-light">Select a player to edit weekly availability.</p>
      </Card>
    )
  }

  return (
    <Card>
      <div className="space-y-4">
        <WeekHeader weekStart={weekStart} onChange={attemptWeekChange} />

        {error ? <Alert variant="error">{error}</Alert> : null}

        {!loading && allConsumedNotice ? (
          <Alert variant="info">
            All slots this week are consumed by scheduled matches. Add new ones below.
          </Alert>
        ) : null}

        {!loading && legacyCount > 0 ? (
          <Alert variant="info">
            {legacyCount === 1
              ? '1 legacy slot has non-hourly bounds and is rounded to whole hours in this view.'
              : `${legacyCount} legacy slots have non-hourly bounds and are rounded to whole hours.`}{' '}
            Editing snaps to whole hours.
          </Alert>
        ) : null}

        {loading ? (
          <GridSkeleton hourRange={hourRange} />
        ) : (
          <HourGrid
            weekStart={weekStart}
            hourRange={hourRange}
            selectedCells={draftCells}
            consumedCells={consumedCells}
            onCellClick={toggleCell}
            onDayClick={toggleDay}
            onHourClick={toggleHour}
          />
        )}

        <div className="flex flex-wrap items-center gap-4 text-xs text-text-light">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 border border-slate-200 bg-white" /> empty
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 border border-secondary bg-secondary/20" />{' '}
            available
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block h-3 w-3 border border-slate-300"
              style={{
                background: 'repeating-linear-gradient(45deg,#e2e8f0 0 4px,transparent 4px 8px)',
              }}
            />
            consumed (locked)
          </span>
          <span className="ml-auto text-text-lighter">
            Tip: Cmd/Ctrl+click day header to toggle entire day. Click hour label to toggle that
            hour all week.
          </span>
        </div>

        <SaveBar
          changesCount={changesCount}
          saving={saving}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </div>

      <ConfirmDialog
        open={Boolean(pendingNav)}
        title="Discard unsaved changes?"
        description={`You have ${changesCount} unsaved ${
          changesCount === 1 ? 'change' : 'changes'
        }. Continue and lose them?`}
        confirmLabel="Discard"
        variant="warning"
        onConfirm={confirmNav}
        onCancel={cancelNav}
      />
    </Card>
  )
}
