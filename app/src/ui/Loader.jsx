import { cn } from '../utils.js'

const sizeClasses = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-[3px]',
  lg: 'h-8 w-8 border-4',
}

export default function Loader({ size = 'md', className, label }) {
  return (
    <span
      className={cn(
        'inline-block animate-spin rounded-full border-solid border-current border-r-transparent',
        sizeClasses[size] || sizeClasses.md,
        className,
      )}
      role="status"
      aria-live="polite"
      aria-label={label || 'Loading'}
    />
  )
}
