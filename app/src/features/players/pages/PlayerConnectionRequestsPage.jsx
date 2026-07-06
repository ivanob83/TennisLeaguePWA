import { useState, useEffect } from 'react'
import AppLayout from '../../../layouts/AppLayout.jsx'
import { SectionTitle, Card, Button, Alert, Badge, Select } from '../../../ui/index.js'
import {
  playersRepository,
  connectionRequestsRepository,
} from '../../../infrastructure/firestore.js'
import { useAuthContext } from '../../auth/context/AuthContext.jsx'
import { useToast } from '../../../context/ToastContext.jsx'

const STATUS_BADGE = {
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
}

export default function PlayerConnectionRequestsPage() {
  const { user } = useAuthContext()
  const { showToast } = useToast()
  const [requests, setRequests] = useState([])
  const [unlinkedPlayers, setUnlinkedPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)
  const [error, setError] = useState(null)

  // Direct link form state (admin-initiated)
  const [directUserId, setDirectUserId] = useState('')
  const [directUserEmail, setDirectUserEmail] = useState('')
  const [directPlayerId, setDirectPlayerId] = useState('')
  const [directSubmitting, setDirectSubmitting] = useState(false)
  const [directError, setDirectError] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const [allRequests, unlinkeds] = await Promise.all([
          connectionRequestsRepository.getAll(),
          playersRepository.getAll().then((all) => all.filter((p) => !p.authUid)),
        ])
        const sorted = allRequests.sort((a, b) => {
          const at = a.createdAt?.seconds ?? 0
          const bt = b.createdAt?.seconds ?? 0
          return bt - at
        })
        setRequests(sorted)
        setUnlinkedPlayers(unlinkeds)
      } catch (err) {
        console.error(err)
        setError('Failed to load requests.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function handleApprove(request) {
    setActionLoading(request.id)
    setError(null)
    try {
      await Promise.all([
        playersRepository.update(request.playerId, {
          authUid: request.userId,
          name: request.userName,
        }),
        connectionRequestsRepository.update(request.id, {
          status: 'approved',
          resolvedAt: new Date(),
          resolvedBy: user.uid,
        }),
      ])
      setRequests((prev) =>
        prev.map((r) => (r.id === request.id ? { ...r, status: 'approved' } : r)),
      )
      setUnlinkedPlayers((prev) => prev.filter((p) => p.id !== request.playerId))
      showToast({
        title: 'Approved',
        message: `${request.playerName} linked to ${request.userName}.`,
        variant: 'success',
      })
    } catch {
      setError('Failed to approve request.')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleReject(request) {
    setActionLoading(request.id)
    setError(null)
    try {
      await connectionRequestsRepository.update(request.id, {
        status: 'rejected',
        resolvedAt: new Date(),
        resolvedBy: user.uid,
      })
      setRequests((prev) =>
        prev.map((r) => (r.id === request.id ? { ...r, status: 'rejected' } : r)),
      )
      showToast({
        title: 'Rejected',
        message: `Request from ${request.userName} rejected.`,
        variant: 'info',
      })
    } catch {
      setError('Failed to reject request.')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleDirectLink(e) {
    e.preventDefault()
    if (!directPlayerId || !directUserId.trim()) return
    setDirectSubmitting(true)
    setDirectError(null)
    try {
      const player = unlinkedPlayers.find((p) => p.id === directPlayerId)
      await playersRepository.update(directPlayerId, { authUid: directUserId.trim() })
      await connectionRequestsRepository.create({
        playerId: directPlayerId,
        playerName: player.name,
        userId: directUserId.trim(),
        userEmail: directUserEmail.trim() || null,
        userName: directUserEmail.trim() || directUserId.trim(),
        status: 'approved',
        resolvedAt: new Date(),
        resolvedBy: user.uid,
      })
      setUnlinkedPlayers((prev) => prev.filter((p) => p.id !== directPlayerId))
      setRequests((prev) => [
        {
          id: '_direct_' + Date.now(),
          playerName: player.name,
          userName: directUserEmail.trim() || directUserId.trim(),
          status: 'approved',
          createdAt: null,
        },
        ...prev,
      ])
      setDirectPlayerId('')
      setDirectUserId('')
      setDirectUserEmail('')
      showToast({
        title: 'Linked',
        message: `${player.name} has been linked to the user.`,
        variant: 'success',
      })
    } catch {
      setDirectError('Failed to link player. Check the User ID and try again.')
    } finally {
      setDirectSubmitting(false)
    }
  }

  const pending = requests.filter((r) => r.status === 'pending')
  const resolved = requests.filter((r) => r.status !== 'pending')

  return (
    <AppLayout>
      <SectionTitle
        title="Connection Requests"
        subtitle="Approve or reject player account link requests."
      />
      <div className="mx-auto max-w-2xl px-6 py-8 space-y-10">
        {error && <Alert variant="error">{error}</Alert>}

        {/* Pending requests */}
        <section>
          <h2 className="text-xs font-bold uppercase tracking-[0.22em] text-secondary mb-4">
            Pending ({pending.length})
          </h2>
          {loading && <p className="text-sm text-text-light">Loading...</p>}
          {!loading && pending.length === 0 && (
            <p className="text-sm text-text-light">No pending requests.</p>
          )}
          <div className="space-y-3">
            {pending.map((r) => (
              <Card key={r.id}>
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-black text-primary truncate">{r.playerName}</p>
                    <p className="text-sm text-text-light truncate">
                      Requested by <span className="font-semibold">{r.userName}</span>
                      {r.userEmail && r.userEmail !== r.userName && ` · ${r.userEmail}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      onClick={() => handleApprove(r)}
                      loading={actionLoading === r.id}
                      loadingLabel="..."
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReject(r)}
                      disabled={actionLoading === r.id}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Admin-initiated direct link */}
        <section>
          <h2 className="text-xs font-bold uppercase tracking-[0.22em] text-secondary mb-4">
            Link directly (admin)
          </h2>
          <Card>
            <form onSubmit={handleDirectLink} className="space-y-4">
              <Select
                label="Player profile"
                value={directPlayerId}
                onChange={(e) => setDirectPlayerId(e.target.value)}
                options={[
                  { value: '', label: 'Select unlinked player...' },
                  ...unlinkedPlayers.map((p) => ({
                    value: p.id,
                    label: p.name + (p.email ? ` (${p.email})` : ''),
                  })),
                ]}
              />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-[0.14em] text-text mb-1.5">
                    Firebase User ID <span className="text-secondary">*</span>
                  </label>
                  <input
                    type="text"
                    value={directUserId}
                    onChange={(e) => setDirectUserId(e.target.value)}
                    placeholder="uid from Firebase Auth"
                    className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-[0.14em] text-text mb-1.5">
                    User email (optional)
                  </label>
                  <input
                    type="email"
                    value={directUserEmail}
                    onChange={(e) => setDirectUserEmail(e.target.value)}
                    placeholder="for display only"
                    className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  />
                </div>
              </div>
              {directError && <Alert variant="error">{directError}</Alert>}
              <Button
                type="submit"
                loading={directSubmitting}
                loadingLabel="Linking..."
                disabled={!directPlayerId || !directUserId.trim()}
              >
                Link Player to User
              </Button>
            </form>
          </Card>
        </section>

        {/* Resolved requests */}
        {resolved.length > 0 && (
          <section>
            <h2 className="text-xs font-bold uppercase tracking-[0.22em] text-secondary mb-4">
              Resolved ({resolved.length})
            </h2>
            <div className="space-y-2">
              {resolved.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between border border-gray-200 px-4 py-3"
                >
                  <div className="min-w-0">
                    <span className="font-semibold text-primary">{r.playerName}</span>
                    <span className="text-sm text-text-light ml-2">· {r.userName}</span>
                  </div>
                  <Badge variant={STATUS_BADGE[r.status]}>{r.status}</Badge>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </AppLayout>
  )
}
