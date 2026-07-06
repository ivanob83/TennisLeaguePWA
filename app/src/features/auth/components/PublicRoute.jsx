/**
 * PublicRoute Component
 *
 * Wrapper for routes that should redirect authenticated users.
 * For example, login/register pages should redirect to dashboard if already logged in.
 */

import { Navigate } from 'react-router-dom'
import { useAuthContext } from '../context/AuthContext.jsx'
import Loader from '../../../ui/Loader.jsx'

export default function PublicRoute({ children, redirectTo = '/dashboard' }) {
  const { loading, isAuthenticated } = useAuthContext()

  // Show loading spinner while checking auth state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light">
        <div className="text-center">
          <Loader size="lg" className="text-primary" />
          <p className="mt-4 text-slate-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Redirect authenticated users away from public-only pages
  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />
  }

  // Render public content
  return children
}
