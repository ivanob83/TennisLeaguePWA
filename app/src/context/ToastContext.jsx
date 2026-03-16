import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const ToastContext = createContext(null)

function ToastItem({ toast, onDismiss }) {
  const variantStyles = {
    success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    error: 'border-rose-200 bg-rose-50 text-rose-800',
    info: 'border-sky-200 bg-sky-50 text-sky-800',
  }

  return (
    <div className={`border px-4 py-3 shadow-sm ${variantStyles[toast.variant] || variantStyles.info}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold">{toast.title}</p>
          {toast.message ? <p className="mt-1 text-xs opacity-90">{toast.message}</p> : null}
        </div>
        <button
          type="button"
          onClick={() => onDismiss(toast.id)}
          className="text-xs font-semibold uppercase tracking-wide opacity-70 hover:opacity-100"
          aria-label="Dismiss notification"
        >
          Close
        </button>
      </div>
    </div>
  )
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismissToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const showToast = useCallback(({ title, message = '', variant = 'info', duration = 3500 }) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

    setToasts((current) => [...current, { id, title, message, variant }])

    if (duration > 0) {
      window.setTimeout(() => {
        dismissToast(id)
      }, duration)
    }

    return id
  }, [dismissToast])

  const value = useMemo(() => ({ showToast, dismissToast }), [showToast, dismissToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-24 z-[60] w-full max-w-sm space-y-2 sm:right-6">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastItem toast={toast} onDismiss={dismissToast} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}
