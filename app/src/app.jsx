/**
 * App Root Component
 * 
 * Sets up routing, authentication context, and main layout
 */

import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './features/auth/context/AuthContext.jsx'
import { ToastProvider } from './context/ToastContext.jsx'
import ProtectedRoute from './features/auth/components/ProtectedRoute.jsx'
import PublicRoute from './features/auth/components/PublicRoute.jsx'
import HomePage from './features/home/pages/HomePage.jsx'
import LoginPage from './features/auth/pages/LoginPage.jsx'
import RegisterPage from './features/auth/pages/RegisterPage.jsx'
import DashboardPage from './features/dashboard/pages/DashboardPage.jsx'
import ProfilePage from './features/profile/pages/ProfilePage.jsx'
import UIShowcasePage from './features/ui/pages/UIShowcasePage.jsx'
import CompetitionsPage from './features/competitions/pages/CompetitionsPage.jsx'
import SeasonCreatePage from './features/seasons/pages/SeasonCreatePage.jsx'
import SeasonsPage from './features/seasons/pages/SeasonsPage.jsx'
import LeaguesPage from './features/leagues/pages/LeaguesPage.jsx'
import LeagueCreatePage from './features/leagues/pages/LeagueCreatePage.jsx'
import LeagueEnrollPage from './features/leagues/pages/LeagueEnrollPage.jsx'
import TournamentsPage from './features/tournaments/pages/TournamentsPage.jsx'
import TournamentCreatePage from './features/tournaments/pages/TournamentCreatePage.jsx'
import TournamentEnrollPage from './features/tournaments/pages/TournamentEnrollPage.jsx'
import PlayersPage from './features/players/pages/PlayersPage.jsx'
import PlayerCreatePage from './features/players/pages/PlayerCreatePage.jsx'
import PlayerEditPage from './features/players/pages/PlayerEditPage.jsx'
import PlayerConnectionRequestsPage from './features/players/pages/PlayerConnectionRequestsPage.jsx'
import AdminUsersPage from './features/admin/pages/AdminUsersPage.jsx'
import AdminUserEditPage from './features/admin/pages/AdminUserEditPage.jsx'
import AdminUserCreatePage from './features/admin/pages/AdminUserCreatePage.jsx'

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
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
          <Route
            path="/competitions"
            element={
              <ProtectedRoute>
                <CompetitionsPage />
              </ProtectedRoute>
            }
          />
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
          <Route path="/ui-showcase" element={<UIShowcasePage />} />
        </Routes>
      </ToastProvider>
    </AuthProvider>
  )
}

export default App
