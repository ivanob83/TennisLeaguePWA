/**
 * App Root Component
 *
 * Sets up routing, authentication context, and main layout.
 * All page components are lazy-loaded for faster FCP.
 */

import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './features/auth/context/AuthContext.jsx'
import { ToastProvider } from './context/ToastContext.jsx'
import ProtectedRoute from './features/auth/components/ProtectedRoute.jsx'
import PublicRoute from './features/auth/components/PublicRoute.jsx'
import { Loader } from './ui/index.js'

// ─── Lazy pages ──────────────────────────────────────────────────────────────

const HomePage                    = lazy(() => import('./features/home/pages/HomePage.jsx'))
const LoginPage                   = lazy(() => import('./features/auth/pages/LoginPage.jsx'))
const RegisterPage                = lazy(() => import('./features/auth/pages/RegisterPage.jsx'))
const DashboardPage               = lazy(() => import('./features/dashboard/pages/DashboardPage.jsx'))
const ProfilePage                 = lazy(() => import('./features/profile/pages/ProfilePage.jsx'))
const UIShowcasePage              = lazy(() => import('./features/ui/pages/UIShowcasePage.jsx'))
const CompetitionsPage            = lazy(() => import('./features/competitions/pages/CompetitionsPage.jsx'))
const SeasonsPage                 = lazy(() => import('./features/seasons/pages/SeasonsPage.jsx'))
const SeasonCreatePage            = lazy(() => import('./features/seasons/pages/SeasonCreatePage.jsx'))
const SeasonEditPage              = lazy(() => import('./features/seasons/pages/SeasonEditPage.jsx'))
const LeaguesPage                 = lazy(() => import('./features/leagues/pages/LeaguesPage.jsx'))
const LeagueCreatePage            = lazy(() => import('./features/leagues/pages/LeagueCreatePage.jsx'))
const LeagueEnrollPage            = lazy(() => import('./features/leagues/pages/LeagueEnrollPage.jsx'))
const LeagueDetailPage            = lazy(() => import('./features/leagues/pages/LeagueDetailPage.jsx'))
const LeagueEditPage              = lazy(() => import('./features/leagues/pages/LeagueEditPage.jsx'))
const TournamentsPage             = lazy(() => import('./features/tournaments/pages/TournamentsPage.jsx'))
const TournamentCreatePage        = lazy(() => import('./features/tournaments/pages/TournamentCreatePage.jsx'))
const TournamentEnrollPage        = lazy(() => import('./features/tournaments/pages/TournamentEnrollPage.jsx'))
const TournamentDetailPage        = lazy(() => import('./features/tournaments/pages/TournamentDetailPage.jsx'))
const TournamentEditPage          = lazy(() => import('./features/tournaments/pages/TournamentEditPage.jsx'))
const PlayersPage                 = lazy(() => import('./features/players/pages/PlayersPage.jsx'))
const PlayerCreatePage            = lazy(() => import('./features/players/pages/PlayerCreatePage.jsx'))
const PlayerEditPage              = lazy(() => import('./features/players/pages/PlayerEditPage.jsx'))
const PlayerDetailPage            = lazy(() => import('./features/players/pages/PlayerDetailPage.jsx'))
const PlayerConnectionRequestsPage = lazy(() => import('./features/players/pages/PlayerConnectionRequestsPage.jsx'))
const MatchDetailPage             = lazy(() => import('./features/matches/pages/MatchDetailPage.jsx'))
const RankingsPage                = lazy(() => import('./features/rankings/pages/RankingsPage.jsx'))
const NewsPage                    = lazy(() => import('./features/news/pages/NewsPage.jsx'))
const NewsCreatePage              = lazy(() => import('./features/news/pages/NewsCreatePage.jsx'))
const NewsDetailPage              = lazy(() => import('./features/news/pages/NewsDetailPage.jsx'))
const AdminUsersPage              = lazy(() => import('./features/admin/pages/AdminUsersPage.jsx'))
const AdminUserEditPage           = lazy(() => import('./features/admin/pages/AdminUserEditPage.jsx'))
const AdminUserCreatePage         = lazy(() => import('./features/admin/pages/AdminUserCreatePage.jsx'))
const AdminSeedsPage              = lazy(() => import('./features/admin/pages/AdminSeedsPage.jsx'))
const AdminDedupePlayersPage      = lazy(() => import('./features/admin/pages/AdminDedupePlayersPage.jsx'))
const AdminFixTieredLeaguePage    = lazy(() => import('./features/admin/pages/AdminFixTieredLeaguePage.jsx'))
const AdminOrphanMatchesPage      = lazy(() => import('./features/admin/pages/AdminOrphanMatchesPage.jsx'))
const SeedPlayopen2022Page        = lazy(() => import('./features/admin/pages/SeedPlayopen2022Page.jsx'))
const SeedPlayLiga2025Page        = lazy(() => import('./features/admin/pages/SeedPlayLiga2025Page.jsx'))
const SeedPlayLiga2025Ciklus1Page = lazy(() => import('./features/admin/pages/SeedPlayLiga2025Ciklus1Page.jsx'))
const SeedPlayLiga2025Ciklus2Page = lazy(() => import('./features/admin/pages/SeedPlayLiga2025Ciklus2Page.jsx'))
const SeedPlayLiga2025Ciklus3Page = lazy(() => import('./features/admin/pages/SeedPlayLiga2025Ciklus3Page.jsx'))

// ─── Fallback ────────────────────────────────────────────────────────────────

function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader />
    </div>
  )
}

// ─── App ─────────────────────────────────────────────────────────────────────

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <LoginPage />
                </PublicRoute>
              }
            />
            <Route
              path="/register"
              element={
                <PublicRoute>
                  <RegisterPage />
                </PublicRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route path="/competitions" element={<CompetitionsPage />} />
            <Route
              path="/seasons"
              element={
                <ProtectedRoute>
                  <SeasonsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/seasons/create"
              element={
                <ProtectedRoute>
                  <SeasonCreatePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/seasons/:seasonId/edit"
              element={
                <ProtectedRoute>
                  <SeasonEditPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/leagues"
              element={
                <ProtectedRoute>
                  <LeaguesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/leagues/create"
              element={
                <ProtectedRoute>
                  <LeagueCreatePage />
                </ProtectedRoute>
              }
            />
            <Route path="/leagues/:leagueId" element={<LeagueDetailPage />} />
            <Route
              path="/leagues/:leagueId/edit"
              element={
                <ProtectedRoute>
                  <LeagueEditPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/leagues/:leagueId/enroll"
              element={
                <ProtectedRoute>
                  <LeagueEnrollPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tournaments"
              element={
                <ProtectedRoute>
                  <TournamentsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tournaments/create"
              element={
                <ProtectedRoute>
                  <TournamentCreatePage />
                </ProtectedRoute>
              }
            />
            <Route path="/tournaments/:tournamentId" element={<TournamentDetailPage />} />
            <Route
              path="/tournaments/:tournamentId/edit"
              element={
                <ProtectedRoute>
                  <TournamentEditPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tournaments/:tournamentId/enroll"
              element={
                <ProtectedRoute>
                  <TournamentEnrollPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/players"
              element={
                <ProtectedRoute>
                  <PlayersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/players/create"
              element={
                <ProtectedRoute>
                  <PlayerCreatePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/players/:playerId"
              element={
                <ProtectedRoute>
                  <PlayerDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/players/:playerId/edit"
              element={
                <ProtectedRoute>
                  <PlayerEditPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute>
                  <AdminUsersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users/create"
              element={
                <ProtectedRoute>
                  <AdminUserCreatePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users/:userId/edit"
              element={
                <ProtectedRoute>
                  <AdminUserEditPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/connection-requests"
              element={
                <ProtectedRoute>
                  <PlayerConnectionRequestsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/seeds"
              element={
                <ProtectedRoute>
                  <AdminSeedsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/seed/playopen-2022"
              element={
                <ProtectedRoute>
                  <SeedPlayopen2022Page />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/seed/play-liga-2025"
              element={
                <ProtectedRoute>
                  <SeedPlayLiga2025Page />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/seed/play-liga-2025-ciklus1"
              element={
                <ProtectedRoute>
                  <SeedPlayLiga2025Ciklus1Page />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/seed/play-liga-2025-ciklus2"
              element={
                <ProtectedRoute>
                  <SeedPlayLiga2025Ciklus2Page />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/seed/play-liga-2025-ciklus3"
              element={
                <ProtectedRoute>
                  <SeedPlayLiga2025Ciklus3Page />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/dedupe-players"
              element={
                <ProtectedRoute>
                  <AdminDedupePlayersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/fix-tiered-league"
              element={
                <ProtectedRoute>
                  <AdminFixTieredLeaguePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/orphan-matches"
              element={
                <ProtectedRoute>
                  <AdminOrphanMatchesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/:competitionType/:competitionId/rounds/:roundId/matches/:matchId"
              element={
                <ProtectedRoute>
                  <MatchDetailPage />
                </ProtectedRoute>
              }
            />
            <Route path="/rankings" element={<RankingsPage />} />
            <Route path="/news" element={<NewsPage />} />
            <Route
              path="/news/create"
              element={
                <ProtectedRoute>
                  <NewsCreatePage />
                </ProtectedRoute>
              }
            />
            <Route path="/news/:articleId" element={<NewsDetailPage />} />
            <Route path="/ui-showcase" element={<UIShowcasePage />} />
          </Routes>
        </Suspense>
      </ToastProvider>
    </AuthProvider>
  )
}

export default App
