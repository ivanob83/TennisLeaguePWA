// Date helpers for the weekly calendar editor. All times are local
// (Europe/Belgrade in practice). Weeks start on Monday.

export function mondayOf(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const dow = d.getDay() // 0=Sun..6=Sat
  const daysFromMonday = (dow + 6) % 7
  d.setDate(d.getDate() - daysFromMonday)
  return d
}

export function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

export function addHours(date, n) {
  const d = new Date(date)
  d.setHours(d.getHours() + n)
  return d
}

export function dateKey(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function cellKey(date, hour) {
  return `${dateKey(date)}-${String(hour).padStart(2, '0')}`
}

export function parseCellKey(key) {
  // "YYYY-MM-DD-HH"
  const parts = key.split('-').map(Number)
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) {
    return null
  }
  const [y, m, d, h] = parts
  return { date: new Date(y, m - 1, d, 0, 0, 0, 0), hour: h }
}

export function formatWeekLabel(weekStart) {
  const end = addDays(weekStart, 6)
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(weekStart.getDate())}.${pad(weekStart.getMonth() + 1)} – ${pad(end.getDate())}.${pad(end.getMonth() + 1)}`
}

export function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

// Returns a Date for the start of `hour` on the day identified by dateStr.
// hour=24 rolls over to next day 00:00 thanks to Date constructor.
export function dateAtHour(dateStr, hour) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d, hour, 0, 0, 0)
}
