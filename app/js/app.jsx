/**
 * App Root Component
 * 
 * Sets up routing, authentication context, and main layout
 */

import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './features/auth/context/AuthContext.jsx'
import ProtectedRoute from './shared/components/ProtectedRoute.jsx'
import PublicRoute from './shared/components/PublicRoute.jsx'
import HomePage from './features/home/pages/HomePage.jsx'
import LoginPage from './features/auth/pages/LoginPage.jsx'
import RegisterPage from './features/auth/pages/RegisterPage.jsx'
import DashboardPage from './features/dashboard/pages/DashboardPage.jsx'
import ProfilePage from './features/profile/pages/ProfilePage.jsx'

function App() {
  return (
    <AuthProvider>
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
        {/* Additional routes will be added here */}
      </Routes>
    </AuthProvider>
  )
}

export default App
