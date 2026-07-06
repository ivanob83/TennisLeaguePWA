import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '../../../../ui/index.js'
import { addDays, formatWeekLabel, mondayOf } from '../../utils/weekRange.js'

export default function WeekHeader({ weekStart, onChange }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange(addDays(weekStart, -7))}
          aria-label="Previous week"
        >
          <ChevronLeft size={16} />
        </Button>
        <Button variant="outline" size="sm" onClick={() => onChange(mondayOf(new Date()))}>
          Today
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange(addDays(weekStart, 7))}
          aria-label="Next week"
        >
          <ChevronRight size={16} />
        </Button>
      </div>
      <div className="font-heading text-sm font-semibold text-text">
        Week: {formatWeekLabel(weekStart)}
      </div>
    </div>
  )
}
