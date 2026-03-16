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

export default function LeaguesPage() {
  const navigate = useNavigate()
  const { isEditor } = useAuthContext()
  const [selectedSeasonId, setSelectedSeasonId] = useState('')

  const { data: seasons } = useFirestoreCollection('seasons', [orderBy('startDate', 'desc')])
  const leagueConstraints = selectedSeasonId
    ? [where('seasonId', '==', selectedSeasonId), orderBy('createdAt', 'desc')]
    : [orderBy('createdAt', 'desc')]
  const { data: leagues, loading } = useFirestoreCollection('leagues', leagueConstraints)
  const seasonNameById = Object.fromEntries(seasons.map((season) => [season.id, season.name]))

  const canManage = isEditor

  return (
    <AppLayout>
      <Container className="py-8">
        <SectionTitle
          title="Leagues"
          subtitle="Tennis leagues organised by season."
          action={canManage && <Button size="sm" onClick={() => navigate('/leagues/create')}>+ New League</Button>}
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
        ) : leagues.length === 0 ? (
          <div className="py-16 text-center text-text-light">
            {selectedSeasonId ? 'No leagues in this season yet.' : 'No leagues created yet.'}
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {leagues.map(league => (
              <div key={league.id} className="space-y-2">
                <TournamentCard
                  tournament={{
                    name: league.name,
                    season: seasonNameById[league.seasonId] || 'Season',
                    status: league.format,
                    image: league.image || null,
                  }}
                />
                {canManage && (
                  <Link
                    to={`/leagues/${league.id}/enroll`}
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
