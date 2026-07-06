import { X } from 'lucide-react'
import { cn } from '../../utils.js'
import HeaderBrand from './HeaderBrand.jsx'

export default function MobilePanel({ open, side = 'left', title, children, onClose }) {
  return (
    <>
      <div
        onClick={onClose}
        className={cn(
          'fixed inset-0 z-40 bg-primary/30 backdrop-blur-[2px] transition-opacity duration-300',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      />
      <aside
        className={cn(
          'fixed top-0 z-50 flex h-full w-[88vw] max-w-[24rem] flex-col bg-white transition-all duration-300',
          side === 'left' ? 'left-0' : 'right-0',
          open
            ? [
                'translate-x-0 opacity-100 shadow-[0_24px_80px_rgba(3,54,41,0.22)]',
                side === 'left' ? 'border-r border-gray-200' : 'border-l border-gray-200',
              ]
            : [
                'pointer-events-none opacity-0 shadow-none border-transparent',
                side === 'left' ? '-translate-x-full' : 'translate-x-full',
              ],
        )}
      >
        <div className="flex items-start justify-between border-b border-gray-200 px-5 py-5">
          <HeaderBrand onClick={onClose} />
          <button
            onClick={onClose}
            aria-label="Close panel"
            className="p-2 text-gray-400 hover:text-primary transition-colors"
          >
            <X size={24} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
      </aside>
    </>
  )
}
