import { Link } from 'react-router-dom'
import { LogIn, User } from 'lucide-react'
import { primaryNavItems } from '../config.js'
import HeaderNavLink from './HeaderNavLink.jsx'
import MobilePanel from './MobilePanel.jsx'

export default function MobileNavMenu({ open, onClose, isAuthenticated }) {
  return (
    <MobilePanel open={open} side="left" title="Menu" onClose={onClose}>
      <div className="flex flex-col h-full">
        <nav className="flex-1">
          {primaryNavItems.map((item) => (
            <HeaderNavLink
              key={item.to}
              item={item}
              active={window.location.pathname === item.to}
              onClick={onClose}
              mobile
            />
          ))}
        </nav>

        {!isAuthenticated && (
          <div className="space-y-3 pt-6 pb-2">
            <Link
              to="/login"
              onClick={onClose}
              className="inline-flex w-full h-12 items-center justify-center gap-2 border border-primary bg-transparent text-sm font-bold uppercase tracking-[0.14em] text-primary transition-colors duration-280 hover:bg-primary/5"
            >
              Log in
            </Link>
            <Link
              to="/register"
              onClick={onClose}
              className="inline-flex w-full h-12 items-center justify-center gap-2 bg-primary text-sm font-bold uppercase tracking-[0.14em] text-white transition-colors duration-280 hover:bg-primary-dark"
            >
              Create account
            </Link>
          </div>
        )}
      </div>
    </MobilePanel>
  )
}
