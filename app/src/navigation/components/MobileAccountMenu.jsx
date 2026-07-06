import { useState } from 'react'
import { Link } from 'react-router-dom'
import { LogOut, UserCircle2, LogIn, User, ChevronDown, ShieldCheck } from 'lucide-react'
import Avatar from '../../ui/Avatar.jsx'
import HeaderNavLink from './HeaderNavLink.jsx'
import MobilePanel from './MobilePanel.jsx'
import { adminNavItems } from '../config.js'
import { useAuthContext } from '../../features/auth/context/AuthContext.jsx'

export default function MobileAccountMenu({ open, onClose, isAuthenticated, user, onLogout }) {
  const { isSuperadmin, isEditor, linkedPlayer } = useAuthContext()
  const [adminOpen, setAdminOpen] = useState(false)

  const visibleAdminItems = adminNavItems.filter((item) => !item.superadminOnly || isSuperadmin)

  return (
    <MobilePanel open={open} side="right" title="Account" onClose={onClose}>
      {isAuthenticated ? (
        <div className="flex flex-col h-full">
          {/* User info */}
          <div className="border border-gray-200 bg-[#fafafa] p-5 mb-6">
            <div className="flex items-center gap-4">
              <Avatar
                src={linkedPlayer?.avatarUrl || user?.photoURL}
                urls={linkedPlayer?.avatarUrls || null}
                sizeHint={80}
                name={user?.displayName || user?.email || 'User'}
                fallback={(user?.displayName?.[0] || user?.email?.[0] || '?').toUpperCase()}
                className="h-14 w-14 border border-gray-200 shadow-sm"
                fallbackClassName="text-xl font-black text-text"
              />
              <div className="min-w-0">
                <p className="text-[0.68rem] font-bold uppercase tracking-[0.26em] text-secondary">
                  Signed in as
                </p>
                <p className="mt-1 truncate text-lg font-black text-primary">
                  {linkedPlayer?.name || user?.displayName || user?.email}
                </p>
                <p className="truncate text-xs font-semibold text-text-light">{user?.email}</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 space-y-1">
            <Link
              to="/profile"
              onClick={onClose}
              className="flex w-full items-center gap-3 px-4 py-3 text-sm font-bold uppercase tracking-[0.14em] text-primary transition-colors hover:bg-background-light"
            >
              <UserCircle2 size={18} className="text-secondary shrink-0" />
              Profile
            </Link>

            {/* Admin section */}
            {isEditor && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setAdminOpen((o) => !o)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-background-light"
                >
                  <div className="flex items-center gap-3">
                    <ShieldCheck size={18} className="text-secondary shrink-0" />
                    <span className="text-sm font-bold uppercase tracking-[0.14em] text-primary">
                      Admin
                    </span>
                  </div>
                  <ChevronDown
                    size={16}
                    className={`text-text-light transition-transform duration-200 ${adminOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {adminOpen && (
                  <div className="ml-4 border-l border-gray-200 pl-2 space-y-0.5">
                    {visibleAdminItems.map((item) => (
                      <HeaderNavLink
                        key={item.to}
                        item={item}
                        active={window.location.pathname === item.to}
                        onClick={onClose}
                        mobile
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </nav>

          <div className="pt-6 pb-2 border-t border-gray-200 mt-6">
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex w-full h-12 items-center justify-center gap-2 border border-secondary bg-transparent text-sm font-bold uppercase tracking-[0.14em] text-secondary transition-colors duration-280 hover:bg-secondary/5"
            >
              <LogOut size={16} className="mr-2" />
              Log out
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col h-full">
          <div className="border border-gray-200 bg-[#fafafa] p-5 mb-8">
            <span className="flex h-12 w-12 items-center justify-center bg-white border border-gray-200 text-primary shadow-sm mb-4">
              <UserCircle2 size={24} />
            </span>
            <h3 className="text-lg font-black uppercase tracking-[0.08em] text-primary">
              Account access
            </h3>
            <p className="mt-2 text-sm leading-h text-text-light">
              Sign in to access your dashboard, profile and upcoming account features.
            </p>
          </div>

          <Link
            to="/login"
            onClick={onClose}
            className="inline-flex w-full h-12 items-center justify-center gap-2 border border-primary bg-transparent text-sm font-bold uppercase tracking-[0.14em] text-primary transition-colors duration-280 hover:bg-primary/5 mb-3"
          >
            <LogIn size={16} className="mr-2" />
            Log in
          </Link>

          <Link
            to="/register"
            onClick={onClose}
            className="inline-flex w-full h-12 items-center justify-center gap-2 bg-primary text-sm font-bold uppercase tracking-[0.14em] text-white transition-colors duration-280 hover:bg-primary-dark"
          >
            <User size={16} className="mr-2" />
            Create account
          </Link>
        </div>
      )}
    </MobilePanel>
  )
}
