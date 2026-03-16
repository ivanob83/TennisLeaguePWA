import { cva } from 'class-variance-authority'
import { cn } from '../utils.js'

const alertVariants = cva('border px-4 py-3 text-sm', {
  variants: {
    variant: {
      error: 'border-rose-200 bg-rose-50 text-rose-700',
      success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      info: 'border-sky-200 bg-sky-50 text-sky-700',
    },
  },
  defaultVariants: {
    variant: 'info',
  },
})

export default function Alert({ variant, className, children }) {
  return <div className={cn(alertVariants({ variant }), className)}>{children}</div>
}
