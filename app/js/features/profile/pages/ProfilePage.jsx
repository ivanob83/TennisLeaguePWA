import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { updateProfile, updateEmail, updatePassword } from 'firebase/auth'
import { useAuthContext } from '../../auth/context/AuthContext.jsx'
import { updateUser, getUserById } from '../../auth/services/userRepository.js'
import Header from '../../../shared/components/Header.jsx'
import { cn } from '../../../lib/utils.js'

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuthContext()
  const navigate = useNavigate()
  
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [userData, setUserData] = useState(null)
  
  // Form fields
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Load user data from Firestore
  useEffect(() => {
    const loadUserData = async () => {
      if (user?.uid) {
        try {
          const data = await getUserById(user.uid)
          setUserData(data)
          setDisplayName(user.displayName || data?.displayName || '')
          setEmail(user.email || '')
        } catch (err) {
          console.error('Failed to load user data:', err)
        }
      }
    }
    loadUserData()
  }, [user])

  const handleCancel = () => {
    setIsEditing(false)
    setDisplayName(user.displayName || userData?.displayName || '')
    setEmail(user.email || '')
    setNewPassword('')
    setConfirmPassword('')
    setError(null)
    setSuccess(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    try {
      // Validate password match if changing password
      if (newPassword && newPassword !== confirmPassword) {
        throw new Error('Passwords do not match')
      }

      if (newPassword && newPassword.length < 6) {
        throw new Error('Password must be at least 6 characters')
      }

      // Update display name in Firebase Auth
      if (displayName !== user.displayName) {
        await updateProfile(user, { displayName })
      }

      // Update email in Firebase Auth
      if (email !== user.email) {
        await updateEmail(user, email)
      }

      // Update password if provided
      if (newPassword) {
        await updatePassword(user, newPassword)
      }

      // Update Firestore user document
      await updateUser(user.uid, {
        displayName,
        email,
        updatedAt: new Date().toISOString(),
      })

      setSuccess('Profile updated successfully!')
      setIsEditing(false)
      setNewPassword('')
      setConfirmPassword('')

      // Refresh user data
      const updatedData = await getUserById(user.uid)
      setUserData(updatedData)
    } catch (err) {
      console.error('Profile update error:', err)
      setError(err.message || 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-600">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background-light">
      <Header />
      
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="bg-white rounded-lg shadow-md p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Profile</h1>
              <p className="mt-2 text-slate-600">
                Manage your account information
              </p>
            </div>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className={cn(
                  "px-4 py-2 rounded-md text-sm font-medium transition-colors",
                  "bg-primary text-white hover:bg-primary-dark"
                )}
              >
                Edit Profile
              </button>
            )}
          </div>

          {/* Success/Error Messages */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-600">{success}</p>
            </div>
          )}

          {/* View Mode */}
          {!isEditing && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Display Name
                </label>
                <p className="text-slate-900">
                  {user?.displayName || userData?.displayName || 'Not set'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Email
                </label>
                <p className="text-slate-900">{user?.email}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Role
                </label>
                <p className="text-slate-900 capitalize">
                  {userData?.role || 'player'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Account Created
                </label>
                <p className="text-slate-900">
                  {userData?.createdAt 
                    ? new Date(userData.createdAt).toLocaleDateString()
                    : 'N/A'
                  }
                </p>
              </div>
            </div>
          )}

          {/* Edit Mode */}
          {isEditing && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label 
                  htmlFor="displayName" 
                  className="block text-sm font-medium text-slate-700 mb-2"
                >
                  Display Name
                </label>
                <input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className={cn(
                    "w-full px-4 py-2 border border-slate-300 rounded-md",
                    "focus:outline-none focus:ring-2 focus:ring-primary"
                  )}
                  placeholder="Your display name"
                />
              </div>

              <div>
                <label 
                  htmlFor="email" 
                  className="block text-sm font-medium text-slate-700 mb-2"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={cn(
                    "w-full px-4 py-2 border border-slate-300 rounded-md",
                    "focus:outline-none focus:ring-2 focus:ring-primary"
                  )}
                  placeholder="your@email.com"
                  required
                />
              </div>

              <div className="pt-4 border-t border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">
                  Change Password (optional)
                </h3>

                <div className="space-y-4">
                  <div>
                    <label 
                      htmlFor="newPassword" 
                      className="block text-sm font-medium text-slate-700 mb-2"
                    >
                      New Password
                    </label>
                    <input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className={cn(
                        "w-full px-4 py-2 border border-slate-300 rounded-md",
                        "focus:outline-none focus:ring-2 focus:ring-primary"
                      )}
                      placeholder="Leave blank to keep current password"
                    />
                  </div>

                  <div>
                    <label 
                      htmlFor="confirmPassword" 
                      className="block text-sm font-medium text-slate-700 mb-2"
                    >
                      Confirm New Password
                    </label>
                    <input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={cn(
                        "w-full px-4 py-2 border border-slate-300 rounded-md",
                        "focus:outline-none focus:ring-2 focus:ring-primary"
                      )}
                      placeholder="Confirm new password"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className={cn(
                    "flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors",
                    "bg-primary text-white hover:bg-primary-dark",
                    loading && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={loading}
                  className={cn(
                    "flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors",
                    "bg-slate-100 text-slate-700 hover:bg-slate-200",
                    loading && "opacity-50 cursor-not-allowed"
                  )}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Additional Profile Stats (placeholder for future) */}
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-slate-600">Leagues Joined</h3>
            <p className="mt-2 text-3xl font-bold text-slate-900">0</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-slate-600">Matches Played</h3>
            <p className="mt-2 text-3xl font-bold text-slate-900">0</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-slate-600">Win Rate</h3>
            <p className="mt-2 text-3xl font-bold text-slate-900">-</p>
          </div>
        </div>
      </div>
    </div>
  )
}
