/**
 * ProtectedRoute Component
 *
 * Wrapper for routes that require authentication.
 * Redirects to /login if user is not authenticated.
 */

import { Navigate } from 'react-router-dom'
import { useAuthContext } from '../context/AuthContext.jsx'
import Loader from '../../../ui/Loader.jsx'

export default function ProtectedRoute({ children }) {
  const { user, loading, isAuthenticated } = useAuthContext()

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

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // Render protected content
  return children
}
