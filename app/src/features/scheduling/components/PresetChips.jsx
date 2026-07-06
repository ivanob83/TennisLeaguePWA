import { PRESETS } from '../utils/datePresets.js'

/**
 * Render preset chips. `onPick(preset)` fires with the full preset object so
 * the caller can call `preset.build()` to obtain windows.
 */
export default function PresetChips({ onPick, disabled = false }) {
  return (
    <div className="flex flex-wrap gap-2">
      {PRESETS.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => onPick(p)}
          disabled={disabled}
          className="border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-text transition-colors duration-200 hover:border-primary hover:bg-primary/5 disabled:pointer-events-none disabled:opacity-60"
        >
          {p.label}
        </button>
      ))}
    </div>
  )
}
