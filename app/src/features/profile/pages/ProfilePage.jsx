import { useState, useEffect } from 'react'
import { updateProfile, updateEmail, updatePassword } from 'firebase/auth'
import { where } from 'firebase/firestore'
import { useAuthContext } from '../../auth/context/AuthContext.jsx'
import { updateUser, getUserById } from '../../auth/services/userRepository.js'
import { playersRepository, connectionRequestsRepository } from '../../../infrastructure/firestore.js'
import { uploadPlayerAvatar } from '../../../infrastructure/avatar.js'
import { useToast } from '../../../context/ToastContext.jsx'
import AppLayout from '../../../layouts/AppLayout.jsx'
import {
  SectionTitle,
  Container,
  Card,
  Input,
  Select,
  Button,
  Alert,
  Badge,
  Loader,
  AvatarUpload,
} from '../../../ui/index.js'

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
          playersRepository.getAll().then(all => all.filter(p => !p.authUid)),
        ])
        const sorted = requests.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0))
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
      <SectionTitle title="Player Account" subtitle="Link your account to a player profile." />
      <div className="mt-6">
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
          placeholder="Choose a player..."
          value={selectedPlayerId}
          onChange={e => setSelectedPlayerId(e.target.value)}
          options={unlinkedPlayers.map(p => ({
            value: p.id,
            label: p.name + (p.email ? ` (${p.email})` : ''),
          }))}
        />
        <Button type="submit" loading={submitting} loadingLabel="Sending..." disabled={!selectedPlayerId}>
          Send Link Request
        </Button>
      </form>
    )
  }
}

export default function ProfilePage() {
  const { user, linkedPlayer, loading: authLoading, refreshProfile } = useAuthContext()
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [userData, setUserData] = useState(null)
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [avatarUrls, setAvatarUrls] = useState(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarError, setAvatarError] = useState(null)

  useEffect(() => {
    if (!user?.uid) return
    async function load() {
      try {
        const data = await getUserById(user.uid)
        setUserData(data)
        setDisplayName(user.displayName || data?.displayName || '')
        setEmail(user.email || '')
      } catch (err) {
        console.error('Failed to load user data:', err)
      }
    }
    load()
  }, [user])

  useEffect(() => {
    setAvatarUrls(linkedPlayer?.avatarUrls || null)
  }, [linkedPlayer])

  async function handleAvatarCrop(imageSrc, croppedAreaPixels) {
    setAvatarUploading(true)
    setAvatarError(null)
    try {
      const urls = await uploadPlayerAvatar(linkedPlayer.id, imageSrc, croppedAreaPixels)
      await playersRepository.update(linkedPlayer.id, { avatarUrls: urls })
      setAvatarUrls(urls)
      await refreshProfile()
    } catch (err) {
      console.error('Avatar upload error:', err)
      setAvatarError('Failed to upload avatar. Please try again.')
    } finally {
      setAvatarUploading(false)
    }
  }

  async function handleAvatarRemove() {
    setAvatarUrls(null)
    await playersRepository.update(linkedPlayer.id, { avatarUrls: null })
    await refreshProfile()
  }

  function handleCancel() {
    setIsEditing(false)
    setDisplayName(user.displayName || userData?.displayName || '')
    setEmail(user.email || '')
    setNewPassword('')
    setConfirmPassword('')
    setError(null)
    setSuccess(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)
    try {
      if (newPassword && newPassword !== confirmPassword) throw new Error('Passwords do not match')
      if (newPassword && newPassword.length < 6) throw new Error('Password must be at least 6 characters')
      if (displayName !== user.displayName) await updateProfile(user, { displayName })
      if (email !== user.email) await updateEmail(user, email)
      if (newPassword) await updatePassword(user, newPassword)
      await updateUser(user.uid, { displayName, email, updatedAt: new Date().toISOString() })
      if (linkedPlayer && displayName !== linkedPlayer.name) {
        await playersRepository.update(linkedPlayer.id, { name: displayName })
      }
      setSuccess('Profile updated successfully!')
      setIsEditing(false)
      setNewPassword('')
      setConfirmPassword('')
      const updatedData = await getUserById(user.uid)
      setUserData(updatedData)
    } catch (err) {
      setError(err.message || 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
      <AppLayout>
        <div className="flex justify-center py-24"><Loader /></div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <Container className="py-8">
        <SectionTitle
          title="Profile"
          subtitle="Manage your account information."
          action={
            !isEditing && (
              <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                Edit Profile
              </Button>
            )
          }
        />

        <div className="mt-8 max-w-lg space-y-5">
          {linkedPlayer && (
            <Card>
              <AvatarUpload
                name={linkedPlayer.name}
                value={avatarUrls}
                onCrop={handleAvatarCrop}
                onRemove={handleAvatarRemove}
                uploading={avatarUploading}
                error={avatarError}
              />
            </Card>
          )}

          {error && <Alert variant="error">{error}</Alert>}
          {success && <Alert variant="success">{success}</Alert>}

          {!isEditing ? (
            <Card>
              <div className="space-y-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-text-light">Display name</span>
                  <span className="font-medium text-text">{user?.displayName || userData?.displayName || '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-light">Email</span>
                  <span className="font-medium text-text">{user?.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-light">Role</span>
                  <Badge variant="neutral" className="capitalize">{userData?.role || 'player'}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-light">Member since</span>
                  <span className="font-medium text-text">
                    {userData?.createdAt ? new Date(userData.createdAt).toLocaleDateString('en-GB') : '—'}
                  </span>
                </div>
              </div>
            </Card>
          ) : (
            <Card>
              <form onSubmit={handleSubmit} className="space-y-5">
                <Input
                  label="Display name"
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="Your display name"
                />
                <Input
                  label="Email"
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                />
                <div className="border-t border-slate-200 pt-4">
                  <p className="mb-4 text-sm font-medium text-text">Change password (optional)</p>
                  <div className="space-y-4">
                    <Input
                      label="New password"
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Leave blank to keep current password"
                    />
                    <Input
                      label="Confirm new password"
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <Button type="submit" loading={loading} loadingLabel="Saving...">
                    Save changes
                  </Button>
                  <Button type="button" variant="ghost" onClick={handleCancel} disabled={loading}>
                    Cancel
                  </Button>
                </div>
              </form>
            </Card>
          )}

          <Card>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-primary">0</p>
                <p className="text-xs uppercase tracking-wide text-text-light">Leagues</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">0</p>
                <p className="text-xs uppercase tracking-wide text-text-light">Matches</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">—</p>
                <p className="text-xs uppercase tracking-wide text-text-light">Win rate</p>
              </div>
            </div>
          </Card>
        </div>

        <PlayerLinkSection user={user} />
      </Container>
    </AppLayout>
  )
}
