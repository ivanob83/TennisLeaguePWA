import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Pencil, Trash2 } from 'lucide-react'
import AppLayout from '../../../layouts/AppLayout.jsx'
import {
  SectionTitle,
  Button,
  Loader,
  Badge,
  Alert,
  Select,
  Container,
} from '../../../ui/index.js'
import { getAllUsers, updateUserRole } from '../../auth/services/userRepository.js'
import { useAuthContext } from '../../auth/context/AuthContext.jsx'
import { useToast } from '../../../context/ToastContext.jsx'

const ROLES = [
  { value: 'player', label: 'Player' },
  { value: 'editor', label: 'Editor' },
  { value: 'superadmin', label: 'Superadmin' },
]

const ROLE_BADGE = {
  superadmin: 'error',
  editor: 'warning',
  player: 'neutral',
}

function formatDate(val) {
  if (!val) return '—'
  const d = val?.toDate ? val.toDate() : new Date(val)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function AdminUsersPage() {
  const navigate = useNavigate()
  const { user, profile, refreshProfile } = useAuthContext()
  const { showToast } = useToast()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(null)
  const [pendingRoles, setPendingRoles] = useState({})
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const data = await getAllUsers()
        setUsers(data)
        const initial = {}
        data.forEach(u => { initial[u.id] = u.role || 'player' })
        setPendingRoles(initial)
      } catch (err) {
        console.error(err)
        setError('Failed to load users.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function handleSaveRole(uid) {
    const newRole = pendingRoles[uid]
    setSaving(uid)
    setError(null)
    try {
      await updateUserRole(uid, newRole)
      setUsers(prev => prev.map(u => u.id === uid ? { ...u, role: newRole } : u))
      if (uid === user?.uid) await refreshProfile()
      showToast({ title: 'Role updated', message: `Role changed to ${newRole}.`, variant: 'success' })
    } catch {
      setError('Failed to update role.')
    } finally {
      setSaving(null)
    }
  }

  const isSelf = (uid) => uid === user?.uid
  const isOwnSuperadmin = (uid) => isSelf(uid) && profile?.role === 'superadmin'

  return (
    <AppLayout>
      <Container className="py-section">
        <SectionTitle
          title="Users"
          subtitle="Manage user accounts and roles."
          action={<Button size="sm" onClick={() => navigate('/admin/users/create')}>+ New User</Button>}
        />

        <div className="mt-8">
          {error && <Alert variant="error" className="mb-6">{error}</Alert>}

          {loading ? (
            <div className="flex justify-center py-16"><Loader /></div>
          ) : users.length === 0 ? (
            <div className="py-16 text-center text-text-light">No users yet.</div>
          ) : (
            <div className="border border-gray-200">
            {/* Table header */}
            <div className="hidden sm:grid grid-cols-[1fr_1fr_160px_auto] gap-4 border-b border-gray-200 bg-background-light px-6 py-3">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-text-light">Name</span>
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-text-light">Email</span>
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-text-light">Role</span>
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-text-light">Actions</span>
            </div>

            {users.map((u, idx) => {
              const roleChanged = pendingRoles[u.id] !== u.role
              const canEditRole = !isOwnSuperadmin(u.id)

              return (
                <div
                  key={u.id}
                  className={`flex flex-wrap items-center gap-4 px-6 py-4 sm:grid sm:grid-cols-[1fr_1fr_160px_auto] ${idx !== users.length - 1 ? 'border-b border-gray-200' : ''}`}
                >
                  {/* Name */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-primary truncate">{u.displayName || '—'}</span>
                      {isSelf(u.id) && (
                        <span className="text-xs font-bold uppercase tracking-[0.14em] text-secondary">you</span>
                      )}
                    </div>
                    <span className="text-xs text-text-light">{formatDate(u.createdAt)}</span>
                  </div>

                  {/* Email */}
                  <span className="text-sm text-text truncate">{u.email}</span>

                  {/* Role */}
                  <div className="flex items-center gap-2">
                    {canEditRole ? (
                      <>
                        <Select
                          value={pendingRoles[u.id] || 'player'}
                          onChange={e => setPendingRoles(prev => ({ ...prev, [u.id]: e.target.value }))}
                          options={ROLES}
                          className="text-xs py-1"
                        />
                        {roleChanged && (
                          <button
                            onClick={() => handleSaveRole(u.id)}
                            disabled={saving === u.id}
                            className="text-xs font-bold text-primary hover:underline disabled:opacity-50 whitespace-nowrap"
                          >
                            {saving === u.id ? '...' : 'Save'}
                          </button>
                        )}
                      </>
                    ) : (
                      <Badge variant={ROLE_BADGE[u.role] || 'neutral'}>{u.role}</Badge>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => navigate(`/admin/users/${u.id}/edit`)}
                      className="inline-flex h-9 w-9 items-center justify-center border border-gray-200 text-text-light transition-colors hover:border-primary hover:text-primary"
                      title="Edit user"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {/* delete handled in edit page */}}
                      disabled={isSelf(u.id)}
                      className="inline-flex h-9 w-9 items-center justify-center border border-gray-200 text-text-light transition-colors hover:border-rose-400 hover:text-rose-500 disabled:cursor-not-allowed disabled:opacity-30"
                      title={isSelf(u.id) ? 'Cannot delete own account' : 'Delete user'}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              )
            })}
            </div>
          )}
        </div>
      </Container>
    </AppLayout>
  )
}
