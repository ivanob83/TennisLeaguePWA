/**
 * Interval intersection helpers.
 *
 * Availability windows can arrive as native Date or Firestore Timestamp
 * depending on whether they came from the server or local optimistic state.
 * `toDate` normalizes both.
 */

export function toDate(value) {
  if (!value) return null
  if (value instanceof Date) return value
  if (typeof value.toDate === 'function') return value.toDate()
  return new Date(value)
}

/**
 * Compute pairwise overlaps between two lists of availability windows.
 * Each window: { id, start, end, ... }. Output entries carry source ids.
 *
 * @param {Array} listA
 * @param {Array} listB
 * @param {number} minMinutes  Minimum overlap duration to keep.
 * @returns {Array<{ start: Date, end: Date, sourceA: string, sourceB: string }>}
 */
export function intersectWindows(listA, listB, minMinutes) {
  const out = []
  for (const a of listA) {
    const aStart = toDate(a.start)
    const aEnd = toDate(a.end)
    if (!aStart || !aEnd) continue
    for (const b of listB) {
      const bStart = toDate(b.start)
      const bEnd = toDate(b.end)
      if (!bStart || !bEnd) continue
      const start = aStart > bStart ? aStart : bStart
      const end = aEnd < bEnd ? aEnd : bEnd
      const minutes = (end - start) / 60000
      if (minutes >= minMinutes) {
        out.push({ start, end, sourceA: a.id, sourceB: b.id })
      }
    }
  }
  out.sort((a, b) => a.start - b.start)
  return out
}
