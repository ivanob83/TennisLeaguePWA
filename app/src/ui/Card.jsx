import { cn } from '../utils.js'

export default function Card({ className, children }) {
  return (
    <article className={cn('border border-slate-200 bg-white p-card-x', className)}>
      {children}
    </article>
  )
}

export function CardHeader({ className, children }) {
  return <header className={cn('mb-4', className)}>{children}</header>
}

export function CardTitle({ className, children }) {
  return <h3 className={cn('font-heading text-lg font-bold text-text', className)}>{children}</h3>
}

export function CardDescription({ className, children }) {
  return <p className={cn('mt-1 text-sm text-text-light', className)}>{children}</p>
}

export function CardContent({ className, children }) {
  return <div className={cn('', className)}>{children}</div>
}

export function CardFooter({ className, children }) {
  return <footer className={cn('mt-5', className)}>{children}</footer>
}
