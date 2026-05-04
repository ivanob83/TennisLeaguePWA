import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { orderBy } from 'firebase/firestore'
import { Pencil, Trash2 } from 'lucide-react'
import AppLayout from '../../../layouts/AppLayout.jsx'
import {
  SectionTitle,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  ConfirmDialog,
  Loader,
  Container,
} from '../../../ui/index.js'
import { useFirestoreCollection } from '../../../hooks/useFirestore.js'
import { useAuthContext } from '../../auth/context/AuthContext.jsx'
import { useToast } from '../../../context/ToastContext.jsx'
import { seasonsRepository } from '../../../infrastructure/firestore.js'

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function SeasonsPage() {
  const navigate = useNavigate()
  const { isEditor, isSuperadmin } = useAuthContext()
  const { showToast } = useToast()
  const { data: seasons, loading } = useFirestoreCollection('seasons', [orderBy('startDate', 'desc')])
  const [confirmId, setConfirmId] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const confirmSeason = seasons.find(s => s.id === confirmId)

  async function handleDelete() {
    setDeleting(true)
    try {
      await seasonsRepository.delete(confirmId)
      showToast({ title: 'Season deleted', variant: 'success' })
      setConfirmId(null)
    } catch {
      showToast({ title: 'Delete failed', message: 'Please try again.', variant: 'error' })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <AppLayout>
      <Container className="py-8">
        <SectionTitle
          title="Seasons"
          subtitle="Yearly competition sessions."
          action={<Button size="sm" onClick={() => navigate('/seasons/create')}>+ New Season</Button>}
        />
        <div className="mt-8">
          {loading ? (
            <div className="flex justify-center py-16"><Loader /></div>
          ) : seasons.length === 0 ? (
            <p className="py-16 text-center text-text-light">No seasons yet. Create your first session.</p>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {seasons.map(season => (
                <Card key={season.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>{season.name}</CardTitle>
                      {isEditor && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => navigate(`/seasons/${season.id}/edit`)}
                            className="inline-flex h-8 w-8 items-center justify-center text-text-light transition-colors hover:text-primary"
                            title="Edit season"
                          >
                            <Pencil size={14} />
                          </button>
                          {isSuperadmin && (
                            <button
                              type="button"
                              onClick={() => setConfirmId(season.id)}
                              className="inline-flex h-8 w-8 items-center justify-center text-text-light transition-colors hover:text-rose-500"
                              title="Delete season"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-text-light">
                      {formatDate(season.startDate)} - {formatDate(season.endDate)}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </Container>

      <ConfirmDialog
        open={!!confirmId}
        title="Delete Season"
        description={`Delete "${confirmSeason?.name}"? This will not automatically delete leagues or tournaments inside it.`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmId(null)}
      />
    </AppLayout>
  )
}
