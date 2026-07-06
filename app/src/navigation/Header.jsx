import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { primaryNavItems } from './config.js'
import { useAuthContext } from '../features/auth/context/AuthContext.jsx'
import { cn } from '../utils.js'
import Avatar from '../ui/Avatar.jsx'
import HeaderBrand from './components/HeaderBrand.jsx'
import HeaderNavLink from './components/HeaderNavLink.jsx'
import MobileNavMenu from './components/MobileNavMenu.jsx'
import MobileAccountMenu from './components/MobileAccountMenu.jsx'

function HeaderIconButton({ className, children, ...props }) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex h-11 w-11 items-center justify-center rounded-full border border-primary/12 bg-white text-primary shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:bg-background-light',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

function AccountTrigger({ user, linkedPlayer, onClick, interactive = true }) {
  const fallback = (user?.displayName?.[0] || user?.email?.[0] || '?').toUpperCase()
  const content = (
    <Avatar
      src={linkedPlayer?.avatarUrl || user?.photoURL}
      urls={linkedPlayer?.avatarUrls || null}
      sizeHint={80}
      name={user?.displayName || user?.email || 'User'}
      fallback={fallback}
      className="h-full w-full"
      fallbackClassName="text-sm font-black tracking-[0.12em]"
      alt={user?.displayName || 'User'}
    />
  )

  if (!interactive) {
    return (
      <span className="inline-flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-primary/15 bg-white shadow-sm">
        {content}
      </span>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-primary/15 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30"
      aria-label="Open account menu"
    >
      {content}
    </button>
  )
}

export default function Header() {
  const { user, linkedPlayer, isAuthenticated, logout } = useAuthContext()
  const navigate = useNavigate()
  const location = useLocation()
  const [isNavOpen, setIsNavOpen] = useState(false)
  const [isAccountOpen, setIsAccountOpen] = useState(false)

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsNavOpen(false)
        setIsAccountOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  useEffect(() => {
    if (!isNavOpen && !isAccountOpen) {
      document.body.style.overflow = ''
      return undefined
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isNavOpen, isAccountOpen])

  const closePanels = () => {
    setIsNavOpen(false)
    setIsAccountOpen(false)
  }

  const handleLogout = async () => {
    try {
      await logout()
      closePanels()
      navigate('/')
    } catch (err) {
      console.error('Failed to logout:', err)
    }
  }

  const desktopNavItems = primaryNavItems

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-primary/10 bg-white">
        <div className="mx-auto max-w-7xl px-6">
          <div className="md:hidden">
            <div className="flex h-20 items-center justify-between">
              <HeaderBrand />
              <div className="flex items-center gap-2">
                {isAuthenticated ? (
                  <AccountTrigger
                    user={user}
                    linkedPlayer={linkedPlayer}
                    onClick={() => {
                      setIsNavOpen(false)
                      setIsAccountOpen(true)
                    }}
                  />
                ) : (
                  <Link
                    to="/login"
                    className="inline-flex h-11 items-center justify-center gap-2 border border-primary bg-transparent px-4 text-xs font-bold uppercase tracking-[0.18em] text-primary transition-colors duration-280 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                  >
                    Log in
                  </Link>
                )}
                <HeaderIconButton
                  onClick={() => {
                    setIsAccountOpen(false)
                    setIsNavOpen(true)
                  }}
                  aria-label="Open main menu"
                  className="rounded-none border-primary"
                >
                  <Menu size={20} />
                </HeaderIconButton>
              </div>
            </div>
          </div>

          <div className="hidden h-20 items-center justify-between md:flex relative">
            <div className="shrink-0 z-10 w-48">
              <HeaderBrand />
            </div>

            <nav className="absolute inset-0 flex h-full items-center justify-center gap-2 lg:gap-4 pointer-events-none">
              <div className="flex h-full items-center pointer-events-auto">
                {desktopNavItems.map((item) => (
                  <HeaderNavLink key={item.to} item={item} active={location.pathname === item.to} />
                ))}
              </div>
            </nav>

            <div className="flex items-center gap-3 z-10 w-48 justify-end">
              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={() => setIsAccountOpen(true)}
                  className="inline-flex items-center gap-3 rounded-full border border-primary/12 bg-white py-1.5 pl-1.5 pr-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/25"
                >
                  <AccountTrigger user={user} linkedPlayer={linkedPlayer} interactive={false} />
                  <span className="max-w-[10rem] truncate text-left">
                    <span className="block text-[0.68rem] font-bold uppercase tracking-[0.22em] text-secondary">
                      Account
                    </span>
                    <span className="block text-sm font-semibold text-primary">
                      {linkedPlayer?.name || user?.displayName || user?.email}
                    </span>
                  </span>
                </button>
              ) : (
                <Link
                  to="/login"
                  className="inline-flex h-11 items-center justify-center gap-2 border border-primary bg-transparent px-5 text-sm font-bold uppercase tracking-[0.14em] text-primary transition-colors duration-280 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                >
                  Log in
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      <MobileNavMenu
        open={isNavOpen}
        onClose={() => setIsNavOpen(false)}
        isAuthenticated={isAuthenticated}
      />

      <MobileAccountMenu
        open={isAccountOpen}
        onClose={() => setIsAccountOpen(false)}
        isAuthenticated={isAuthenticated}
        user={user}
        onLogout={handleLogout}
      />
    </>
  )
}
