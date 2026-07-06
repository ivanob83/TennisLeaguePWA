/**
 * Preset → list of {start, end} windows. Each preset returns one OR more
 * windows so a single click can persist multiple documents (e.g. weekend = 2).
 *
 * All times computed in local timezone (Europe/Belgrade in practice).
 */

function atTime(date, hour, minute = 0) {
  const d = new Date(date)
  d.setHours(hour, minute, 0, 0)
  return d
}

function addDays(date, days) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function nextDayOfWeek(from, targetDow) {
  const d = new Date(from)
  const diff = (targetDow - d.getDay() + 7) % 7
  return addDays(d, diff === 0 ? 7 : diff)
}

function daysUntilEndOfWeek(from) {
  // Treat Sunday as last day. Returns 0 if already Sunday.
  const dow = from.getDay() // 0=Sun
  return dow === 0 ? 0 : 7 - dow
}

export const PRESETS = [
  {
    id: 'tomorrow_evening',
    label: 'Tomorrow 17–21',
    build: () => {
      const tomorrow = addDays(new Date(), 1)
      return [{ start: atTime(tomorrow, 17), end: atTime(tomorrow, 21) }]
    },
  },
  {
    id: 'tomorrow_morning',
    label: 'Tomorrow 9–13',
    build: () => {
      const tomorrow = addDays(new Date(), 1)
      return [{ start: atTime(tomorrow, 9), end: atTime(tomorrow, 13) }]
    },
  },
  {
    id: 'weekend',
    label: 'Weekend (Sat+Sun 9–21)',
    build: () => {
      const sat = nextDayOfWeek(new Date(), 6) // 6 = Saturday
      const sun = addDays(sat, 1)
      return [
        { start: atTime(sat, 9), end: atTime(sat, 21) },
        { start: atTime(sun, 9), end: atTime(sun, 21) },
      ]
    },
  },
  {
    id: 'this_week_afternoons',
    label: 'This week afternoons',
    build: () => {
      const days = daysUntilEndOfWeek(new Date())
      const out = []
      for (let i = 1; i <= days; i++) {
        const day = addDays(new Date(), i)
        out.push({ start: atTime(day, 17), end: atTime(day, 21) })
      }
      return out
    },
  },
]

export function findPreset(id) {
  return PRESETS.find((p) => p.id === id) || null
}
