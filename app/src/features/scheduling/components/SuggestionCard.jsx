import { useState } from 'react'
import { Copy, CalendarCheck } from 'lucide-react'
import { Card, Button, Badge, ConfirmDialog } from '../../../ui/index.js'
import { useToast } from '../../../context/ToastContext.jsx'
import { scheduleMatch } from '../../matches/services/matchService.js'
import { markConsumed } from '../services/availabilityService.js'
import { buildSlotMessage, formatSlot } from '../utils/messageTemplates.js'

function playerName(p) {
  if (!p) return '—'
  return p.name || p.email || p.id
}

/**
 * One suggestion card. Receives:
 *   suggestion         { match, round, groupId, groupName, overlaps, p1Windows, p2Windows }
 *   competitionType    'leagues'|'tournaments'
 *   competitionId      string
 *   playersById        Map<id, player>
 *   onScheduled        () => void  (parent refresh)
 */
export default function SuggestionCard({
  suggestion,
  competitionType,
  competitionId,
  playersById,
  onScheduled,
}) {
  const { showToast } = useToast()
  const [pendingSlot, setPendingSlot] = useState(null) // overlap entry
  const [scheduling, setScheduling] = useState(false)

  const { match, round, groupName, overlaps } = suggestion
  const p1 = playersById.get(match.player1Id)
  const p2 = playersById.get(match.player2Id)

  function copyMessageFor(target) {
    if (!overlaps.length) return
    const slot = overlaps[0]
    const playerNameStr = playerName(target === 'p1' ? p1 : p2)
    const opponentName = playerName(target === 'p1' ? p2 : p1)
    const text = buildSlotMessage({
      playerName: playerNameStr,
      opponentName,
      groupName,
      start: slot.start,
      end: slot.end,
    })
    navigator.clipboard
      .writeText(text)
      .then(() =>
        showToast({
          title: 'Message copied',
          message: 'Paste into Viber/WhatsApp.',
          variant: 'success',
        }),
      )
      .catch(() => showToast({ title: 'Clipboard unavailable', variant: 'error' }))
  }

  async function confirmSchedule() {
    if (!pendingSlot) return
    setScheduling(true)
    try {
      const scheduledAt = pendingSlot.start
      await scheduleMatch(competitionType, competitionId, match.roundId, match.id, scheduledAt)
      await markConsumed([pendingSlot.sourceA, pendingSlot.sourceB], match.id)
      showToast({ title: 'Match scheduled', variant: 'success' })
      setPendingSlot(null)
      onScheduled?.()
    } catch (err) {
      console.error(err)
      showToast({ title: 'Failed to schedule', variant: 'error' })
    } finally {
      setScheduling(false)
    }
  }

  return (
    <Card>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {groupName ? <Badge>{groupName}</Badge> : null}
          {round?.label ? (
            <span className="text-xs uppercase tracking-wide text-text-light">{round.label}</span>
          ) : null}
        </div>

        <div className="text-base font-semibold text-text">
          {playerName(p1)} <span className="text-text-light">vs</span> {playerName(p2)}
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-light">
            Available together:
          </p>
          {overlaps.map((o, idx) => (
            <div
              key={idx}
              className="flex flex-wrap items-center justify-between gap-2 border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <span className="text-text">{formatSlot(o.start, o.end)}</span>
              <Button size="sm" variant="primary" onClick={() => setPendingSlot(o)}>
                <CalendarCheck size={14} />
                Schedule this slot
              </Button>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-3">
          <Button size="sm" variant="outline" onClick={() => copyMessageFor('p1')}>
            <Copy size={14} />
            Copy message for {playerName(p1)}
          </Button>
          <Button size="sm" variant="outline" onClick={() => copyMessageFor('p2')}>
            <Copy size={14} />
            Copy message for {playerName(p2)}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={!!pendingSlot}
        title="Schedule match"
        description={
          pendingSlot
            ? `Schedule for ${formatSlot(pendingSlot.start, pendingSlot.end)}? Start time will be saved as scheduledAt.`
            : ''
        }
        confirmLabel="Schedule"
        cancelLabel="Cancel"
        variant="default"
        loading={scheduling}
        onConfirm={confirmSchedule}
        onCancel={() => !scheduling && setPendingSlot(null)}
      />
    </Card>
  )
}
