import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { updateProfile, updateEmail, updatePassword } from 'firebase/auth'
import { where } from 'firebase/firestore'
import { useAuthContext } from '../../auth/context/AuthContext.jsx'
import { updateUser, getUserById } from '../../auth/services/userRepository.js'
import { playersRepository, connectionRequestsRepository } from '../../../infrastructure/firestore.js'
import { useToast } from '../../../context/ToastContext.jsx'
import AppLayout from '../../../layouts/AppLayout.jsx'
import { SectionTitle, Card, Select, Button, Alert, Badge } from '../../../ui/index.js'
import { cn } from '../../../utils.js'

function PlayerLinkSection({ user }) {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [linkedPlayer, setLinkedPlayer] = useState(null)
  const [latestRequest, setLatestRequest] = useState(null)
  const [unlinkedPlayers, setUnlinkedPlayers] = useState([])
  const [selectedPlayerId, setSelectedPlayerId] = useState('')
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!user?.uid) return
    async function load() {
      try {
        const linked = await playersRepository.query([where('authUid', '==', user.uid)])
        if (linked.length > 0) {
          setLinkedPlayer(linked[0])
          setLoading(false)
          return
        }

        const [requests, allPlayers] = await Promise.all([
          connectionRequestsRepository.query([where('userId', '==', user.uid)]),
          playersRepository.query([where('authUid', '==', null)]),
        ])

        const sorted = requests.sort((a, b) => {
          const at = a.createdAt?.seconds ?? 0
          const bt = b.createdAt?.seconds ?? 0
          return bt - at
        })
        setLatestRequest(sorted[0] || null)
        setUnlinkedPlayers(allPlayers)
      } catch (err) {
        console.error('PlayerLinkSection load error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user?.uid])

  async function handleRequest(e) {
    e.preventDefault()
    if (!selectedPlayerId) return
    setSubmitting(true)
    setError(null)
    try {
      const player = unlinkedPlayers.find(p => p.id === selectedPlayerId)
      await connectionRequestsRepository.create({
        playerId: selectedPlayerId,
        playerName: player.name,
        userId: user.uid,
        userEmail: user.email,
        userName: user.displayName || user.email,
        status: 'pending',
        resolvedAt: null,
        resolvedBy: null,
      })
      setLatestRequest({ status: 'pending', playerName: player.name })
      showToast({ title: 'Request sent', message: 'Waiting for admin approval.', variant: 'success' })
    } catch {
      setError('Failed to send request. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return null

  return (
    <div className="mt-8">
      <div className="mb-4">
        <SectionTitle title="Player Account" subtitle="Link your account to a player profile to access match history and stats." />
      </div>
      <Card>
        {linkedPlayer && (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-secondary mb-1">Linked player</p>
              <p className="text-lg font-black text-primary">{linkedPlayer.name}</p>
              {linkedPlayer.email && <p className="text-sm text-text-light">{linkedPlayer.email}</p>}
            </div>
            <Badge variant="success">Connected</Badge>
          </div>
        )}

        {!linkedPlayer && latestRequest?.status === 'pending' && (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-secondary mb-1">Pending request</p>
              <p className="text-base font-semibold text-primary">{latestRequest.playerName}</p>
            </div>
            <Badge variant="warning">Awaiting approval</Badge>
          </div>
        )}

        {!linkedPlayer && latestRequest?.status === 'rejected' && (
          <div className="space-y-4">
            <Alert variant="warning">
              Your previous request for <strong>{latestRequest.playerName}</strong> was rejected. You can submit a new request below.
            </Alert>
            {renderRequestForm()}
          </div>
        )}

        {!linkedPlayer && !latestRequest && renderRequestForm()}

        {error && <Alert variant="error" className="mt-4">{error}</Alert>}
      </Card>
    </div>
  )

  function renderRequestForm() {
    if (unlinkedPlayers.length === 0) {
      return (
        <p className="text-sm text-text-light">
          No unlinked player profiles available. Contact the admin to create your player profile.
        </p>
      )
    }
    return (
      <form onSubmit={handleRequest} className="space-y-4">
        <Select
          label="Select your player profile"
          value={selectedPlayerId}
          onChange={e => setSelectedPlayerId(e.target.value)}
          options={[
            { value: '', label: 'Choose a player...' },
            ...unlinkedPlayers.map(p => ({ value: p.id, label: p.name + (p.email ? ` (${p.email})` : '') })),
          ]}
        />
        <Button type="submit" loading={submitting} loadingLabel="Sending..." disabled={!selectedPlayerId}>
          Send Link Request
        </Button>
      </form>
    )
  }
}

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuthContext()
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
    <AppLayout>
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="bg-white border border-slate-200 p-8">
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
                  "px-4 py-2 text-sm font-medium transition-colors",
                  "bg-primary text-white hover:bg-primary-dark"
                )}
              >
                Edit Profile
              </button>
            )}
          </div>

          {/* Success/Error Messages */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200">
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
                    "w-full px-4 py-2 border border-slate-300",
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
                    "w-full px-4 py-2 border border-slate-300",
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
                        "w-full px-4 py-2 border border-slate-300",
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
                        "w-full px-4 py-2 border border-slate-300",
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
                    "flex-1 px-4 py-2 text-sm font-medium transition-colors",
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
                    "flex-1 px-4 py-2 text-sm font-medium transition-colors",
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

        <PlayerLinkSection user={user} />

        {/* Additional Profile Stats (placeholder for future) */}
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <div className="bg-white border border-slate-200 p-6">
            <h3 className="text-sm font-medium text-slate-600">Leagues Joined</h3>
            <p className="mt-2 text-3xl font-bold text-slate-900">0</p>
          </div>
          <div className="bg-white border border-slate-200 p-6">
            <h3 className="text-sm font-medium text-slate-600">Matches Played</h3>
            <p className="mt-2 text-3xl font-bold text-slate-900">0</p>
          </div>
          <div className="bg-white border border-slate-200 p-6">
            <h3 className="text-sm font-medium text-slate-600">Win Rate</h3>
            <p className="mt-2 text-3xl font-bold text-slate-900">-</p>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
