import { Fragment } from 'react'
import { addDays, cellKey } from '../../utils/weekRange.js'
import HourCell from './HourCell.jsx'

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function formatDayHeader(date) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}`
}

function formatHour(h) {
  return `${String(h).padStart(2, '0')}:00`
}

export default function HourGrid({
  weekStart,
  hourRange,
  selectedCells,
  consumedCells,
  onCellClick,
  onDayClick,
  onHourClick,
}) {
  const [hMin, hMax] = hourRange
  const hours = []
  for (let h = hMin; h < hMax; h++) hours.push(h)

  const days = []
  for (let i = 0; i < 7; i++) days.push(addDays(weekStart, i))

  const interactive = Boolean(onCellClick)

  return (
    <div className="overflow-x-auto">
      <div
        className="grid min-w-[640px] gap-px bg-slate-200 text-center"
        style={{ gridTemplateColumns: '64px repeat(7, minmax(0, 1fr))' }}
      >
        <div className="bg-slate-50" />
        {days.map((d, i) => (
          <button
            key={i}
            type="button"
            onClick={(e) => {
              if (!onDayClick) return
              if (!(e.metaKey || e.ctrlKey)) return
              onDayClick(i)
            }}
            disabled={!onDayClick}
            title={onDayClick ? 'Cmd/Ctrl+click to toggle entire day' : undefined}
            className={
              'bg-slate-50 px-1 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-text ' +
              (onDayClick ? 'hover:bg-slate-100' : '')
            }
          >
            <div>{DAY_LABELS[i]}</div>
            <div className="text-[10px] font-normal text-text-light">{formatDayHeader(d)}</div>
          </button>
        ))}

        {hours.map((h) => (
          <Fragment key={h}>
            <button
              type="button"
              onClick={onHourClick ? () => onHourClick(h) : undefined}
              disabled={!onHourClick}
              title={onHourClick ? 'Click to toggle this hour for the whole week' : undefined}
              className={
                'flex items-center justify-end bg-slate-50 px-2 text-[10px] font-semibold text-text-light ' +
                (onHourClick ? 'hover:bg-slate-100' : '')
              }
            >
              {formatHour(h)}
            </button>
            {days.map((d, i) => {
              const key = cellKey(d, h)
              const state = consumedCells.has(key)
                ? 'consumed'
                : selectedCells.has(key)
                  ? 'selected'
                  : 'empty'
              return (
                <HourCell
                  key={i}
                  state={state}
                  ariaLabel={`${d.toDateString()} ${formatHour(h)}, ${state}`}
                  onClick={interactive ? () => onCellClick(key) : undefined}
                />
              )
            })}
          </Fragment>
        ))}
      </div>
    </div>
  )
}
