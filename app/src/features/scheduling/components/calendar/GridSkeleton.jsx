import { DEFAULT_HOUR_RANGE } from '../../utils/weekDiff.js'

export default function GridSkeleton({ hourRange = DEFAULT_HOUR_RANGE }) {
  const [hMin, hMax] = hourRange
  const rows = hMax - hMin
  const cells = []
  for (let i = 0; i < rows * 8; i++) cells.push(i)

  return (
    <div className="overflow-x-auto" aria-busy="true" aria-label="Loading availability">
      <div
        className="grid min-w-[640px] gap-px bg-slate-200"
        style={{ gridTemplateColumns: '64px repeat(7, minmax(0, 1fr))' }}
      >
        <div className="bg-slate-50" />
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="h-10 animate-pulse bg-slate-100" />
        ))}
        {cells.map((i) => (
          <div key={i} className="h-8 animate-pulse bg-slate-100" />
        ))}
      </div>
    </div>
  )
}
