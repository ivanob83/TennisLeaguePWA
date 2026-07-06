const STATE_CLASSES = {
  empty: 'bg-white border-slate-200 hover:bg-slate-50',
  selected: 'bg-secondary/20 border-secondary text-secondary-dark',
  consumed:
    'cursor-not-allowed border-slate-300 text-slate-400 ' +
    '[background:repeating-linear-gradient(45deg,#e2e8f0_0_6px,transparent_6px_12px)]',
}

export default function HourCell({ state = 'empty', ariaLabel, onClick }) {
  const isConsumed = state === 'consumed'
  const cls =
    'h-8 border text-[10px] font-semibold uppercase tracking-wide transition-colors ' +
    STATE_CLASSES[state]

  return (
    <button
      type="button"
      onClick={isConsumed ? undefined : onClick}
      disabled={isConsumed}
      aria-label={ariaLabel}
      aria-pressed={state === 'selected'}
      className={cls}
      title={isConsumed ? 'Consumed by scheduled match' : undefined}
    >
      {isConsumed ? '×' : ''}
    </button>
  )
}
