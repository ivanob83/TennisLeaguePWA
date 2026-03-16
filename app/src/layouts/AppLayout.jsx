import Header from '../navigation/Header.jsx'
import { cn } from '../utils.js'

export default function AppLayout({
  children,
  className,
  contentClassName,
  withHeader = true,
}) {
  return (
    <div className={cn('min-h-screen bg-white text-text', className)}>
      {withHeader ? <Header /> : null}
      <main className={cn('min-h-[calc(100vh-6rem)] bg-white', contentClassName)}>{children}</main>
    </div>
  )
}