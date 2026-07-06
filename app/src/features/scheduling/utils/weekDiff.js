// Pure helpers that map between Firestore `playerAvailability` documents and
// the weekly hour-cell grid. Used by the calendar editor to:
//   - render existing slots (docsToCells)
//   - compute writes to persist the user's selection (diffWeek)
//
// Time model: cells are 1-hour blocks identified by "YYYY-MM-DD-HH".
// A doc spanning 17:00–21:00 expands to 4 cells (17,18,19,20). End is
// exclusive — a doc ending at 21:00 occupies the 20:00 cell, not 21:00.

import { toDate } from './overlap.js'
import { addDays, cellKey, dateAtHour, dateKey, isSameDay } from './weekRange.js'

export const DEFAULT_HOUR_RANGE = [7, 23]

function isConsumed(doc) {
  return Boolean(doc.consumedByMatchId)
}

// Convert a doc to a per-day block { id, date, startHour, endHour }.
// Returns null if dates are missing. Sets `crossMidnight: true` for spans
// that don't fit in a single day (those are rendered locked, not editable).
export function docToBlock(doc) {
  const start = toDate(doc.start)
  const end = toDate(doc.end)
  if (!start || !end || end <= start) return null

  const isMidnightNextDay =
    end.getHours() === 0 &&
    end.getMinutes() === 0 &&
    end.getSeconds() === 0 &&
    end.getTime() - start.getTime() <= 24 * 3600 * 1000

  const sameDay = isSameDay(start, end)
  if (!sameDay && !isMidnightNextDay) {
    return { id: doc.id, crossMidnight: true, start, end }
  }

  const startHour = start.getHours()
  let endHour = end.getHours() + (end.getMinutes() > 0 ? 1 : 0)
  if (isMidnightNextDay && !sameDay) endHour = 24

  return {
    id: doc.id,
    date: dateKey(start),
    startHour,
    endHour,
    start,
    end,
  }
}

// Expand editable docs into a Set of selected cell keys for the given week.
// Skips: consumed, cross-midnight, anything outside the week or hour range.
export function docsToCells(docs, weekStart, hourRange = DEFAULT_HOUR_RANGE) {
  return expandDocsToCells(
    docs.filter((d) => !isConsumed(d)),
    weekStart,
    hourRange,
  )
}

// Mirror of docsToCells, but for consumed (locked) docs only.
export function consumedCellsFromDocs(docs, weekStart, hourRange = DEFAULT_HOUR_RANGE) {
  return expandDocsToCells(
    docs.filter((d) => isConsumed(d)),
    weekStart,
    hourRange,
  )
}

function expandDocsToCells(docs, weekStart, hourRange) {
  const [hMin, hMax] = hourRange
  const weekEnd = addDays(weekStart, 7)
  const out = new Set()
  for (const doc of docs) {
    const b = docToBlock(doc)
    if (!b || b.crossMidnight) continue
    if (b.start < weekStart || b.start >= weekEnd) continue
    for (let h = b.startHour; h < b.endHour; h++) {
      if (h < hMin || h >= hMax) continue
      out.add(cellKey(b.start, h))
    }
  }
  return out
}

// Group consecutive selected hours per date into contiguous blocks.
// Input: Set of "YYYY-MM-DD-HH" strings.
// Output: Array<{ date: 'YYYY-MM-DD', startHour, endHour }> sorted by date+hour.
// `endHour` is exclusive (a 17:00 cell + 18:00 cell yields startHour=17, endHour=19).
export function cellsToBlocks(cellSet) {
  const byDate = new Map()
  for (const key of cellSet) {
    const lastDash = key.lastIndexOf('-')
    const date = key.slice(0, lastDash)
    const hour = Number(key.slice(lastDash + 1))
    if (Number.isNaN(hour)) continue
    if (!byDate.has(date)) byDate.set(date, [])
    byDate.get(date).push(hour)
  }

  const blocks = []
  const sortedDates = [...byDate.keys()].sort()
  for (const date of sortedDates) {
    const hours = [...new Set(byDate.get(date))].sort((a, b) => a - b)
    let runStart = hours[0]
    let prev = hours[0]
    for (let i = 1; i < hours.length; i++) {
      if (hours[i] === prev + 1) {
        prev = hours[i]
        continue
      }
      blocks.push({ date, startHour: runStart, endHour: prev + 1 })
      runStart = hours[i]
      prev = hours[i]
    }
    blocks.push({ date, startHour: runStart, endHour: prev + 1 })
  }
  return blocks
}

// Compute the writes needed to bring originalDocs in line with selectedCells.
//
// Strategy:
//   1. Filter originals to editable (not consumed, not cross-midnight, in week).
//   2. Convert to blocks. Compute desired blocks from selectedCells.
//   3. Per-date matching:
//      - exact same start/end → no-op (skip)
//      - if exactly 1 remaining original AND 1 remaining desired on the same
//        date → update endpoints (1 write instead of delete+create)
//      - else: delete all remaining originals + create all remaining desired
//        on that date.
//
// Cross-midnight or consumed originals are NEVER touched — they're returned
// as-is by the caller's reload, untouched in the diff.
export function diffWeek(originalDocs, selectedCells, weekStart, hourRange = DEFAULT_HOUR_RANGE) {
  const weekEnd = addDays(weekStart, 7)
  const editableBlocks = []

  for (const doc of originalDocs) {
    if (isConsumed(doc)) continue
    const b = docToBlock(doc)
    if (!b || b.crossMidnight) continue
    if (b.start < weekStart || b.start >= weekEnd) continue
    editableBlocks.push(b)
  }

  const desiredBlocks = cellsToBlocks(selectedCells).filter(
    (b) => b.startHour >= hourRange[0] && b.endHour <= hourRange[1] + 1,
  )

  // Bucket per date.
  const origByDate = new Map()
  for (const b of editableBlocks) {
    if (!origByDate.has(b.date)) origByDate.set(b.date, [])
    origByDate.get(b.date).push(b)
  }
  const desByDate = new Map()
  for (const b of desiredBlocks) {
    if (!desByDate.has(b.date)) desByDate.set(b.date, [])
    desByDate.get(b.date).push(b)
  }

  const creates = []
  const updates = []
  const deletes = []

  const allDates = new Set([...origByDate.keys(), ...desByDate.keys()])
  for (const date of allDates) {
    const origs = origByDate.get(date) || []
    const desires = desByDate.get(date) || []

    // Exact-match elimination.
    const remOrigs = []
    const matchedDesireIdx = new Set()
    for (const o of origs) {
      const idx = desires.findIndex(
        (d, i) =>
          !matchedDesireIdx.has(i) && d.startHour === o.startHour && d.endHour === o.endHour,
      )
      if (idx >= 0) {
        matchedDesireIdx.add(idx)
      } else {
        remOrigs.push(o)
      }
    }
    const remDesires = desires.filter((_, i) => !matchedDesireIdx.has(i))

    if (remOrigs.length === 0 && remDesires.length === 0) continue

    if (remOrigs.length === 1 && remDesires.length === 1) {
      const o = remOrigs[0]
      const d = remDesires[0]
      updates.push({
        id: o.id,
        start: dateAtHour(d.date, d.startHour),
        end: dateAtHour(d.date, d.endHour),
      })
      continue
    }

    for (const o of remOrigs) deletes.push(o.id)
    for (const d of remDesires) {
      creates.push({
        date: d.date,
        startHour: d.startHour,
        endHour: d.endHour,
        start: dateAtHour(d.date, d.startHour),
        end: dateAtHour(d.date, d.endHour),
      })
    }
  }

  return { creates, updates, deletes }
}
