import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { where } from 'firebase/firestore'
import AppLayout from '../../../layouts/AppLayout.jsx'
import {
  SectionTitle,
  Card,
  Input,
  Button,
  Alert,
  Loader,
  Select,
  Badge,
} from '../../../ui/index.js'
import { getUserById, updateUser } from '../../auth/services/userRepository.js'
import { playersRepository } from '../../../infrastructure/firestore.js'
import { useToast } from '../../../context/ToastContext.jsx'

const ROLES = [
  { value: 'player', label: 'Player' },
  { value: 'editor', label: 'Editor' },
  { value: 'superadmin', label: 'Superadmin' },
]

export default function AdminUserEditPage() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState(null)
  const [errors, setErrors] = useState({})
  const [form, setForm] = useState({ displayName: '', email: '', role: 'player' })

  const [linkedPlayer, setLinkedPlayer] = useState(null)
  const [freePlayers, setFreePlayers] = useState([])
  const [selectedPlayerId, setSelectedPlayerId] = useState('')
  const [linkSaving, setLinkSaving] = useState(false)
  const [linkError, setLinkError] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const [userData, linked, free] = await Promise.all([
          getUserById(userId),
          playersRepository.query([where('authUid', '==', userId)]),
          playersRepository.query([where('authUid', '==', null)]),
        ])

        if (!userData) { setServerError('User not found.'); setLoading(false); return }

        setForm({
          displayName: userData.displayName || '',
          email: userData.email || '',
          role: userData.role || 'player',
        })
        setLinkedPlayer(linked[0] || null)
        setFreePlayers(free)
      } catch {
        setServerError('Failed to load user.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [userId])

  function validate() {
    const e = {}
    if (!form.displayName.trim()) e.displayName = 'Display name is required'
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const fieldErrors = validate()
    if (Object.keys(fieldErrors).length) { setErrors(fieldErrors); return }
    setSubmitting(true)
    setServerError(null)
    try {
      await updateUser(userId, {
        displayName: form.displayName.trim(),
        role: form.role,
      })
      showToast({ title: 'User updated', message: `${form.displayName.trim()} has been updated.`, variant: 'success' })
      navigate('/admin/users')
    } catch {
      setServerError('Failed to update user. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleLink() {
    if (!selectedPlayerId) return
    setLinkSaving(true)
    setLinkError(null)
    try {
      await playersRepository.update(selectedPlayerId, { authUid: userId })
      const player = freePlayers.find(p => p.id === selectedPlayerId)
      setLinkedPlayer({ ...player, authUid: userId })
      setFreePlayers(prev => prev.filter(p => p.id !== selectedPlayerId))
      setSelectedPlayerId('')
      showToast({ title: 'Player linked', message: `${player.name} is now linked to this user.`, variant: 'success' })
    } catch {
      setLinkError('Failed to link player.')
    } finally {
      setLinkSaving(false)
    }
  }

  async function handleUnlink() {
    if (!linkedPlayer) return
    setLinkSaving(true)
    setLinkError(null)
    try {
      await playersRepository.update(linkedPlayer.id, { authUid: null })
      setFreePlayers(prev => [...prev, { ...linkedPlayer, authUid: null }])
      setLinkedPlayer(null)
      showToast({ title: 'Player unlinked', message: 'Player has been unlinked from this user.', variant: 'info' })
    } catch {
      setLinkError('Failed to unlink player.')
    } finally {
      setLinkSaving(false)
    }
  }

  function handleChange(field, value) {
    setForm(p => ({ ...p, [field]: value }))
    setErrors(p => ({ ...p, [field]: undefined }))
  }

  const freePlayerOptions = freePlayers.map(p => ({ value: p.id, label: p.name }))

  return (
    <AppLayout>
      <div className="mx-auto max-w-lg px-6 py-section">
        <div className="mb-8">
          <SectionTitle title="Edit User" subtitle="Update user details and role." />
        </div>

        {serverError && <Alert variant="error" className="mb-6">{serverError}</Alert>}

        {loading ? (
          <div className="flex justify-center py-16"><Loader /></div>
        ) : (
          <div className="space-y-6">
            <Card>
              <form onSubmit={handleSubmit} className="space-y-5">
                <Input
                  label="Display name"
                  name="displayName"
                  placeholder="e.g. John Doe"
                  value={form.displayName}
                  onChange={e => handleChange('displayName', e.target.value)}
                  error={errors.displayName}
                />
                <Input
                  label="Email"
                  name="email"
                  type="email"
                  value={form.email}
                  disabled
                  hint="Email cannot be changed here."
                />
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-text-light">
                    Role
                  </label>
                  <Select
                    value={form.role}
                    onChange={e => handleChange('role', e.target.value)}
                    options={ROLES}
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button type="submit" loading={submitting} loadingLabel="Saving...">
                    Save Changes
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => navigate('/admin/users')}>
                    Cancel
                  </Button>
                </div>
              </form>
            </Card>

            {/* Player link section */}
            <Card>
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-text-light">Linked Player</p>
                  <p className="mt-0.5 text-xs text-text-light">Each user can be linked to one player profile.</p>
                </div>

                {linkError && <Alert variant="error">{linkError}</Alert>}

                {linkedPlayer ? (
                  <div className="flex items-center justify-between gap-4 rounded border border-gray-200 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-text">{linkedPlayer.name}</span>
                      <Badge variant="success">Linked</Badge>
                    </div>
                    <button
                      type="button"
                      onClick={handleUnlink}
                      disabled={linkSaving}
                      className="text-xs font-bold text-rose-500 hover:underline disabled:opacity-50"
                    >
                      {linkSaving ? '...' : 'Unlink'}
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Select
                        value={selectedPlayerId}
                        onChange={e => setSelectedPlayerId(e.target.value)}
                        options={freePlayerOptions}
                        placeholder="Select a player..."
                      />
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleLink}
                      disabled={!selectedPlayerId || linkSaving}
                      loading={linkSaving}
                      loadingLabel="Linking..."
                    >
                      Link
                    </Button>
                  </div>
                )}

                {!linkedPlayer && freePlayers.length === 0 && (
                  <p className="text-xs text-text-light">No unlinked players available.</p>
                )}
              </div>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
