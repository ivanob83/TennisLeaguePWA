import { cva } from 'class-variance-authority'
import { cn } from '../utils.js'
import Loader from './Loader.jsx'

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 font-medium transition-colors duration-280',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
    'disabled:pointer-events-none disabled:opacity-60',
  ],
  {
    variants: {
      variant: {
        primary: 'bg-primary text-white hover:bg-primary-dark',
        secondary: 'bg-secondary text-white hover:bg-secondary-dark',
        outline: 'border border-primary text-primary hover:bg-primary/5',
        ghost: 'text-primary hover:bg-primary/10',
        success: 'bg-success text-white hover:opacity-90',
      },
      size: {
        sm: 'h-9 px-3 text-sm',
        md: 'h-11 px-4 text-sm',
        lg: 'h-12 px-6 text-base',
      },
      fullWidth: {
        true: 'w-full',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
)

export default function Button({
  className,
  variant,
  size,
  fullWidth = false,
  loading = false,
  loadingLabel = 'Loading...',
  disabled,
  children,
  ...props
}) {
  return (
    <button
      className={cn(buttonVariants({ variant, size, fullWidth }), className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <Loader size="sm" className="text-current" label={loadingLabel} />
          <span>{loadingLabel}</span>
        </>
      ) : (
        children
      )}
    </button>
  )
}
