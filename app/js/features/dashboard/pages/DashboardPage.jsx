import { useAuthContext } from '../../auth/context/AuthContext.jsx'
import { Link } from 'react-router-dom'
import Header from '../../../shared/components/Header.jsx'

export default function DashboardPage() {
  const { user, loading } = useAuthContext()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-600">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background-light">
      <Header />
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="mt-2 text-slate-600">
            Welcome back, {user?.email || 'User'}!
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Placeholder cards */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-slate-900">My Leagues</h3>
            <p className="mt-2 text-sm text-slate-600">View and manage your leagues</p>
            <p className="mt-4 text-2xl font-bold text-primary">0</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-slate-900">Upcoming Matches</h3>
            <p className="mt-2 text-sm text-slate-600">Your scheduled matches</p>
            <p className="mt-4 text-2xl font-bold text-primary">0</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-slate-900">Ranking</h3>
            <p className="mt-2 text-sm text-slate-600">Your current position</p>
            <p className="mt-4 text-2xl font-bold text-primary">-</p>
          </div>
        </div>

        <div className="mt-8">
          <Link to="/profile" className="text-primary hover:text-primary-dark">
            View Profile →
          </Link>
        </div>
      </div>
    </div>
  )
}
