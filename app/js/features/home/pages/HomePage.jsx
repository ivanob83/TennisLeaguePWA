import { Link } from 'react-router-dom'
import { useAuthContext } from '../../auth/context/AuthContext.jsx'
import Header from '../../../shared/components/Header.jsx'

export default function HomePage() {
  const { user, isAuthenticated } = useAuthContext()

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background-light">
      <div className="mx-auto max-w-4xl px-6 py-16">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-5xl font-bold text-slate-900">
            🎾 Tennis League PWA
          </h1>
          <p className="mt-4 text-xl text-slate-600">
            Track matches, rankings, and league updates
          </p>
        </div>

        {/* CTA */}
        <div className="mt-12 flex justify-center gap-4">
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className="px-6 py-3 bg-primary text-white font-medium rounded-md hover:bg-primary-dark transition-colors"
            >
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="px-6 py-3 bg-primary text-white font-medium rounded-md hover:bg-primary-dark transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-6 py-3 bg-white text-slate-900 font-medium rounded-md border border-slate-300 hover:bg-background-light transition-colors"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>

        {/* Features */}
        <div className="mt-16 grid gap-8 md:grid-cols-3">
          <div className="text-center">
            <div className="text-4xl mb-4">📅</div>
            <h3 className="text-lg font-semibold text-slate-900">Schedule Matches</h3>
            <p className="mt-2 text-sm text-slate-600">
              Organize rounds and track your upcoming games
            </p>
          </div>
          <div className="text-center">
            <div className="text-4xl mb-4">🏆</div>
            <h3 className="text-lg font-semibold text-slate-900">Track Rankings</h3>
            <p className="mt-2 text-sm text-slate-600">
              Live standings and player performance stats
            </p>
          </div>
          <div className="text-center">
            <div className="text-4xl mb-4">📱</div>
            <h3 className="text-lg font-semibold text-slate-900">Offline Ready</h3>
            <p className="mt-2 text-sm text-slate-600">
              Works even without internet connection
            </p>
          </div>
        </div>
      </div>
    </main>
    </>
  )
}
