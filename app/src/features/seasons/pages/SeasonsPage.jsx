import { useNavigate } from 'react-router-dom'
import { orderBy } from 'firebase/firestore'
import AppLayout from '../../../layouts/AppLayout.jsx'
import {
  SectionTitle,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Loader,
  Container,
} from '../../../ui/index.js'
import { useFirestoreCollection } from '../../../hooks/useFirestore.js'

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
  const { data: seasons, loading } = useFirestoreCollection('seasons', [orderBy('startDate', 'desc')])

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
                    <CardTitle>{season.name}</CardTitle>
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
    </AppLayout>
  )
}
