import { cn } from '../utils.js'

export default function Input({ label, error, hint, id, className, ...props }) {
  const inputId = id || props.name

  return (
    <div className="space-y-1.5">
      {label ? (
        <label htmlFor={inputId} className="block text-sm font-medium text-text">
          {label}
        </label>
      ) : null}
      <input
        id={inputId}
        className={cn(
          'w-full border border-slate-300 bg-white px-field-x py-field-y text-sm text-text transition-colors duration-280',
          'focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30',
          error && 'border-rose-400 focus:border-rose-500 focus:ring-rose-200',
          className,
        )}
        {...props}
      />
      {error ? <p className="text-xs font-medium text-rose-600">{error}</p> : null}
      {!error && hint ? <p className="text-xs text-text-lighter">{hint}</p> : null}
    </div>
  )
}
