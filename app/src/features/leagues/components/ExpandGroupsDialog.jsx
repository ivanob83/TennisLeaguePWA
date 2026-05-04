import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Users } from 'lucide-react'
import Button from '../../../ui/Button.jsx'
import Input from '../../../ui/Input.jsx'
import { expandRoundRobinLeague } from '../../enrollment/services/expandRoundRobin.js'

/**
 * ExpandGroupsDialog — superadmin-only modal for expanding a round-robin league.
 * Lets the admin raise league.playersPerGroup additively. Calls the service in
 * dry-run mode to compute a live preview before confirming.
 *
 * Props:
 *   open       boolean
 *   league     league document (must include id, playersPerGroup, numGroups, format, status)
 *   onClose    () => void  — called on cancel or after successful expansion
 *   onSuccess  (result) => void  — optional, called with service return value
 */
export default function ExpandGroupsDialog({ open, league, onClose, onSuccess }) {
  const cancelRef = useRef(null)
  const [newSize, setNewSize] = useState('')
  const [preview, setPreview] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  const oldSize = league?.playersPerGroup ?? 0
  const minNew = oldSize + 1
  const parsed = Number.parseInt(newSize, 10)
  const isValidNumber = Number.isInteger(parsed) && parsed >= minNew

  useEffect(() => {
    if (open) {
      setNewSize(String(minNew))
      setPreview(null)
      setPreviewError(null)
      setSubmitError(null)
      setSubmitting(false)
      setTimeout(() => cancelRef.current?.focus(), 10)
    }
  }, [open, minNew])

  useEffect(() => {
    if (!open) return
    function onKey(e) {
      if (e.key === 'Escape' && !submitting) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, submitting, onClose])

  // Live dry-run preview when number is valid
  useEffect(() => {
    if (!open || !league?.id || !isValidNumber) {
      setPreview(null)
      setPreviewError(null)
      return
    }
    let cancelled = false
    setPreviewLoading(true)
    setPreviewError(null)
    expandRoundRobinLeague(league.id, parsed, { dryRun: true })
      .then((result) => {
        if (!cancelled) {
          setPreview(result)
          setPreviewLoading(false)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setPreviewError(err.message)
          setPreview(null)
          setPreviewLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [open, league?.id, parsed, isValidNumber])

  async function handleConfirm() {
    if (!isValidNumber || submitting) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const result = await expandRoundRobinLeague(league.id, parsed)
      onSuccess?.(result)
      onClose()
    } catch (err) {
      setSubmitError(err.message)
      setSubmitting(false)
    }
  }

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="expand-groups-title"
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={() => !submitting && onClose()}
      />

      <div className="relative w-full max-w-md border border-slate-200 bg-white shadow-xl">
        <div className="h-1 w-full bg-secondary" />

        <div className="p-6">
          <div className="flex items-start gap-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center text-secondary">
              <Users size={24} strokeWidth={2} />
            </span>
            <div className="min-w-0 flex-1">
              <h2
                id="expand-groups-title"
                className="font-heading text-lg font-black uppercase tracking-tight text-text"
              >
                Expand groups
              </h2>
              <p className="mt-1 text-sm text-text-light">
                Add player slots to every group. Existing matches stay untouched; only new position
                pairs get match slots.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-text-light">Number of groups</span>
              <span className="font-medium text-text">{league?.numGroups ?? '—'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-light">Current players per group</span>
              <span className="font-medium text-text">{oldSize}</span>
            </div>

            <div className="pt-1">
              <Input
                label="New players per group"
                type="number"
                min={minNew}
                step={1}
                value={newSize}
                onChange={(e) => setNewSize(e.target.value)}
                hint={`Must be greater than ${oldSize}.`}
                error={
                  newSize !== '' && !isValidNumber ? `Enter an integer ≥ ${minNew}.` : undefined
                }
                disabled={submitting}
              />
            </div>

            <div className="border-t border-slate-100 pt-3">
              {previewLoading && <p className="text-xs text-text-light">Calculating preview…</p>}
              {!previewLoading && previewError && (
                <p className="text-xs font-medium text-rose-600">{previewError}</p>
              )}
              {!previewLoading && preview && !previewError && (
                <div className="space-y-1 text-xs text-text-light">
                  <p>
                    <span className="font-semibold text-text">{preview.matchesCreated}</span> new
                    match slots will be created across{' '}
                    <span className="font-semibold text-text">{preview.groupsUpdated}</span>{' '}
                    {preview.groupsUpdated === 1 ? 'group' : 'groups'}.
                  </p>
                  {preview.perGroup.some((g) => g.matchesSkipped > 0) && (
                    <p>Some pairs already exist and will be skipped (idempotent).</p>
                  )}
                </div>
              )}
            </div>

            {submitError && (
              <div className="border-t border-slate-100 pt-3">
                <p className="text-xs font-medium text-rose-600">{submitError}</p>
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              ref={cancelRef}
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="inline-flex h-11 items-center justify-center gap-2 border border-slate-300 px-5 text-sm font-bold uppercase tracking-[0.12em] text-text transition-colors duration-280 hover:border-slate-400 hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-60"
            >
              Cancel
            </button>
            <Button
              size="md"
              onClick={handleConfirm}
              disabled={submitting || !isValidNumber || !!previewError || previewLoading}
            >
              {submitting ? 'Expanding…' : 'Expand'}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
