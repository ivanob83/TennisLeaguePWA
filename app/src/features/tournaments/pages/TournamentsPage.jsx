import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { where, orderBy } from 'firebase/firestore'
import AppLayout from '../../../layouts/AppLayout.jsx'
import {
  SectionTitle,
  Button,
  Loader,
  TournamentCard,
  Container,
} from '../../../ui/index.js'
import { useFirestoreCollection } from '../../../hooks/useFirestore.js'
import { useAuthContext } from '../../auth/context/AuthContext.jsx'

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function TournamentsPage() {
  const navigate = useNavigate()
  const { isEditor } = useAuthContext()
  const [selectedSeasonId, setSelectedSeasonId] = useState('')

  const { data: seasons } = useFirestoreCollection('seasons', [orderBy('startDate', 'desc')])
  const tournamentConstraints = selectedSeasonId
    ? [where('seasonId', '==', selectedSeasonId), orderBy('startDate', 'asc')]
    : [orderBy('startDate', 'desc')]
  const { data: tournaments, loading } = useFirestoreCollection('tournaments', tournamentConstraints)
  const seasonNameById = Object.fromEntries(seasons.map((season) => [season.id, season.name]))

  const canManage = isEditor

  return (
    <AppLayout>
      <Container className="py-8">
        <SectionTitle
          title="Tournaments"
          subtitle="Short-format competitions within a season."
          action={canManage && <Button size="sm" onClick={() => navigate('/tournaments/create')}>+ New Tournament</Button>}
        />
        <div className="mb-6 mt-8 flex flex-wrap items-center gap-3">
          <label className="text-sm font-medium text-text">Season</label>
          <select
            className="border border-slate-300 bg-white px-3 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            value={selectedSeasonId}
            onChange={e => setSelectedSeasonId(e.target.value)}
          >
            <option value="">All seasons</option>
            {seasons.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          {canManage && (
            <Link to="/seasons/create" className="text-sm text-primary hover:underline">
              + New Season
            </Link>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader /></div>
        ) : tournaments.length === 0 ? (
          <div className="py-16 text-center text-text-light">
            {selectedSeasonId ? 'No tournaments in this season yet.' : 'No tournaments created yet.'}
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {tournaments.map(t => (
              <div key={t.id} className="space-y-2">
                <TournamentCard
                  tournament={{
                    ...t,
                    season: seasonNameById[t.seasonId] || `${formatDate(t.startDate)} - ${formatDate(t.endDate)}`,
                    status: t.format,
                  }}
                />
                {canManage && (
                  <Link
                    to={`/tournaments/${t.id}/enroll`}
                    className="inline-block text-sm font-medium text-primary hover:underline"
                  >
                    Setup & Draw →
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </Container>
    </AppLayout>
  )
}
