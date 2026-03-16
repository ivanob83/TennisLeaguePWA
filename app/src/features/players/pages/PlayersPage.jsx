import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Pencil, Trash2 } from 'lucide-react'
import AppLayout from '../../../layouts/AppLayout.jsx'
import {
  SectionTitle,
  Button,
  Loader,
  Alert,
  Avatar,
  Container,
  ConfirmDialog,
} from '../../../ui/index.js'
import { playersRepository } from '../../../infrastructure/firestore.js'
import { useAuthContext } from '../../auth/context/AuthContext.jsx'
import { useToast } from '../../../context/ToastContext.jsx'

export default function PlayersPage() {
  const navigate = useNavigate()
  const { isEditor } = useAuthContext()
  const { showToast } = useToast()
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [confirmPlayer, setConfirmPlayer] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const data = await playersRepository.getAll()
        data.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
        setPlayers(data)
      } catch (err) {
        console.error(err)
        setError('Failed to load players.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function handleDeleteConfirm() {
    if (!confirmPlayer) return
    setDeleting(true)
    try {
      await playersRepository.delete(confirmPlayer.id)
      setPlayers(prev => prev.filter(p => p.id !== confirmPlayer.id))
      showToast({ title: 'Deleted', message: `${confirmPlayer.name} removed.`, variant: 'success' })
      setConfirmPlayer(null)
    } catch {
      showToast({ title: 'Error', message: 'Failed to delete player.', variant: 'error' })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <AppLayout>
      <Container className="py-8">
        <SectionTitle
          title="Players"
          subtitle="All registered players."
          action={isEditor && (
            <Button size="sm" onClick={() => navigate('/players/create')}>+ New Player</Button>
          )}
        />
        <div className="mt-8">
          {error && <Alert variant="error" className="mb-6">{error}</Alert>}
          {loading ? (
            <div className="flex justify-center py-16"><Loader /></div>
          ) : players.length === 0 ? (
            <div className="py-16 text-center text-text-light">No players yet.</div>
          ) : (
            <div className="border border-gray-200">
              <div className="hidden sm:grid grid-cols-[40px_1fr_auto] gap-4 border-b border-gray-200 bg-background-light px-6 py-3">
                <span />
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-text-light">Name</span>
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-text-light">Actions</span>
              </div>
              {players.map((player, idx) => (
                <div
                  key={player.id}
                  className={`flex flex-wrap items-center gap-4 px-6 py-4 sm:grid sm:grid-cols-[40px_1fr_auto] ${idx !== players.length - 1 ? 'border-b border-gray-200' : ''}`}
                >
                  <Avatar
                    urls={player.avatarUrls || null}
                    src={player.avatarUrl || null}
                    sizeHint={80}
                    name={player.name}
                    className="h-9 w-9 border border-gray-200"
                  />
                  <div className="min-w-0">
                    <span className="font-semibold text-primary truncate block">{player.name}</span>
                    {player.authUid && (
                      <span className="text-xs font-bold uppercase tracking-[0.12em] text-secondary">linked</span>
                    )}
                  </div>
                  {isEditor && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => navigate(`/players/${player.id}/edit`)}
                        className="inline-flex h-9 w-9 items-center justify-center border border-gray-200 text-text-light transition-colors hover:border-primary hover:text-primary"
                        title="Edit player"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmPlayer(player)}
                        className="inline-flex h-9 w-9 items-center justify-center border border-gray-200 text-text-light transition-colors hover:border-rose-400 hover:text-rose-500"
                        title="Delete player"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Container>

      <ConfirmDialog
        open={!!confirmPlayer}
        title="Delete player"
        description={confirmPlayer ? `"${confirmPlayer.name}" will be permanently deleted. This cannot be undone.` : ''}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmPlayer(null)}
      />
    </AppLayout>
  )
}
