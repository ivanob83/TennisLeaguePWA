import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { cn } from '../../utils.js'

export default function HeaderNavLink({ item, active, onClick, mobile = false }) {
  const Icon = item.icon

  return (
    <Link
      to={item.to}
      onClick={onClick}
      className={cn(
        'transition-colors duration-200 group',
        mobile
          ? [
              'flex items-center justify-between border-b border-gray-200 px-2 py-4',
              active ? 'text-secondary' : 'bg-white text-text hover:text-secondary',
            ]
          : [
              'relative flex h-full items-center px-4 text-sm font-black uppercase tracking-[0.14em]',
              active ? 'text-secondary' : 'text-primary hover:text-secondary',
            ],
      )}
    >
      {mobile ? (
        <>
          <span className="flex items-center gap-3">
            <span
              className={cn(
                'flex items-center justify-center',
                active ? 'text-secondary' : 'text-primary group-hover:text-secondary',
              )}
            >
              <Icon size={20} className="stroke-[2.5px]" />
            </span>
            <span className="text-[15px] font-bold uppercase tracking-[0.14em]">{item.label}</span>
          </span>
          <ChevronRight size={20} className={cn(active ? 'text-secondary' : 'text-gray-300')} />
        </>
      ) : (
        <>
          {item.label}
          <span
            className={cn(
              'absolute inset-x-2 bottom-0 h-[4px] transition-colors duration-200',
              active ? 'bg-secondary' : 'bg-transparent group-hover:bg-secondary',
            )}
          />
        </>
      )}
    </Link>
  )
}
