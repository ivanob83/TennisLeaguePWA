import { Link, useNavigate } from 'react-router-dom'
import { useAuthContext } from '../../features/auth/context/AuthContext.jsx'
import { cn } from '../../lib/utils.js'

export default function Header() {
  const { user, isAuthenticated, logout } = useAuthContext()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/')
    } catch (err) {
      console.error('Failed to logout:', err)
    }
  }

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo / Brand */}
          <Link to="/" className="flex items-center space-x-2">
            <span className="text-2xl">🎾</span>
            <span className="text-xl font-bold text-slate-900">Tennis League</span>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center space-x-6">
            {isAuthenticated ? (
              <>
                <Link
                  to="/dashboard"
                  className="text-slate-600 hover:text-slate-900 font-medium transition-colors"
                >
                  Dashboard
                </Link>
                <Link
                  to="/profile"
                  className="text-slate-600 hover:text-slate-900 font-medium transition-colors"
                >
                  Profile
                </Link>
                
                {/* User Info & Logout */}
                <div className="flex items-center space-x-4 ml-4 pl-4 border-l border-slate-200">
                  <div className="flex items-center space-x-3">
                    {user?.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt={user.displayName || 'User'}
                        className="w-8 h-8 rounded-full border-2 border-slate-200"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-medium text-sm">
                        {(user?.displayName?.[0] || user?.email?.[0] || '?').toUpperCase()}
                      </div>
                    )}
                    <span className="text-sm text-slate-600">
                      {user?.displayName || user?.email}
                    </span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className={cn(
                      "px-4 py-2 rounded-md text-sm font-medium transition-colors",
                      "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    )}
                  >
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-slate-600 hover:text-slate-900 font-medium transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className={cn(
                    "px-4 py-2 rounded-md text-sm font-medium transition-colors",
                    "bg-primary text-white hover:bg-primary-dark"
                  )}
                >
                  Sign Up
                </Link>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  )
}
