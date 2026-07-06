/**
 * Compose human-readable messages admin will paste into Viber/WhatsApp.
 *
 * Time format: day dd.mm. HH:MM–HH:MM.
 */

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function pad(n) {
  return String(n).padStart(2, '0')
}

export function formatSlot(start, end) {
  const day = DAYS[start.getDay()]
  const date = `${pad(start.getDate())}.${pad(start.getMonth() + 1)}.`
  const t1 = `${pad(start.getHours())}:${pad(start.getMinutes())}`
  const t2 = `${pad(end.getHours())}:${pad(end.getMinutes())}`
  return `${day} ${date} ${t1}–${t2}`
}

/**
 * @param {{ playerName: string, opponentName: string, groupName?: string|null,
 *           start: Date, end: Date }} args
 * @returns {string}
 */
export function buildSlotMessage({ playerName, opponentName, groupName, start, end }) {
  const groupSuffix = groupName ? ` (${groupName})` : ''
  return `Hi ${playerName}, proposed match vs ${opponentName}${groupSuffix}: ${formatSlot(start, end)}. Does that work for you? Thanks.`
}
