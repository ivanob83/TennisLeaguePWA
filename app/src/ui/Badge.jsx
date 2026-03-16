import { cva } from 'class-variance-authority'
import { cn } from '../utils.js'

const badgeVariants = cva(
  'inline-flex items-center border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide',
  {
    variants: {
      variant: {
        neutral: 'border-slate-300 bg-slate-100 text-slate-700',
        success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        warning: 'border-amber-200 bg-amber-50 text-amber-800',
        error: 'border-rose-200 bg-rose-50 text-rose-700',
        scheduled: 'border-sky-200 bg-sky-50 text-sky-700',
        in_progress: 'border-amber-200 bg-amber-50 text-amber-800',
        finished: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        disputed: 'border-rose-200 bg-rose-50 text-rose-700',
        cancelled: 'border-slate-300 bg-slate-100 text-slate-500',
        walkover: 'border-violet-200 bg-violet-50 text-violet-700',
      },
    },
    defaultVariants: {
      variant: 'neutral',
    },
  }
)

export default function Badge({ variant = 'neutral', className, children }) {
  return <span className={cn(badgeVariants({ variant }), className)}>{children}</span>
}
