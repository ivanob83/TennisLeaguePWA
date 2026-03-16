import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle } from 'lucide-react'
import { cn } from '../utils.js'
import Button from './Button.jsx'

/**
 * ConfirmDialog — blocking confirmation modal, design-system aligned.
 *
 * Props:
 *   open         boolean
 *   title        string
 *   description  string
 *   confirmLabel string  (default "Delete")
 *   cancelLabel  string  (default "Cancel")
 *   variant      "danger" | "warning" | "default"  (default "danger")
 *   loading      boolean
 *   onConfirm    () => void
 *   onCancel     () => void
 */
export default function ConfirmDialog({
  open,
  title = 'Are you sure?',
  description,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  variant = 'danger',
  loading = false,
  onConfirm,
  onCancel,
}) {
  const cancelRef = useRef(null)

  // Focus cancel button on open
  useEffect(() => {
    if (open) {
      setTimeout(() => cancelRef.current?.focus(), 10)
    }
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    function onKey(e) {
      if (e.key === 'Escape' && !loading) onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, loading, onCancel])

  if (!open) return null

  const confirmClass = cn(
    'inline-flex h-11 items-center justify-center gap-2 px-5 text-sm font-bold uppercase tracking-[0.12em] transition-colors duration-280 disabled:pointer-events-none disabled:opacity-60',
    variant === 'danger' && 'bg-rose-600 text-white hover:bg-rose-700',
    variant === 'warning' && 'bg-amber-500 text-white hover:bg-amber-600',
    variant === 'default' && 'bg-primary text-white hover:bg-primary-dark',
  )

  const iconClass = cn(
    'h-10 w-10 shrink-0 flex items-center justify-center',
    variant === 'danger' && 'text-rose-500',
    variant === 'warning' && 'text-amber-500',
    variant === 'default' && 'text-primary',
  )

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={() => !loading && onCancel()}
      />

      {/* Panel */}
      <div className="relative w-full max-w-sm border border-slate-200 bg-white shadow-xl">
        {/* Top accent bar */}
        <div className={cn(
          'h-1 w-full',
          variant === 'danger' && 'bg-rose-500',
          variant === 'warning' && 'bg-amber-500',
          variant === 'default' && 'bg-primary',
        )} />

        <div className="p-6">
          <div className="flex items-start gap-4">
            <span className={iconClass}>
              <AlertTriangle size={24} strokeWidth={2} />
            </span>

            <div className="min-w-0 flex-1">
              <h2
                id="confirm-dialog-title"
                className="font-heading text-lg font-black uppercase tracking-tight text-text"
              >
                {title}
              </h2>
              {description && (
                <p className="mt-2 text-sm leading-relaxed text-text-light">{description}</p>
              )}
            </div>
          </div>

          <div className="mt-6 flex gap-3 justify-end">
            <button
              ref={cancelRef}
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="inline-flex h-11 items-center justify-center gap-2 border border-slate-300 px-5 text-sm font-bold uppercase tracking-[0.12em] text-text transition-colors duration-280 hover:border-slate-400 hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-60"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className={confirmClass}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  {confirmLabel}...
                </span>
              ) : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
