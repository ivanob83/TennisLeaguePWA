import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { orderBy, where } from 'firebase/firestore'
import AppLayout from '../../../layouts/AppLayout.jsx'
import {
  Button,
  Loader,
  SectionTitle,
  TournamentCard,
  Container,
} from '../../../ui/index.js'
import { useFirestoreCollection } from '../../../hooks/useFirestore.js'
import { useAuthContext } from '../../auth/context/AuthContext.jsx'

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function CompetitionsPage() {
  const navigate = useNavigate()
  const { user, isEditor } = useAuthContext()
  const [selectedSeasonId, setSelectedSeasonId] = useState('')

  const { data: seasons } = useFirestoreCollection('seasons', [orderBy('startDate', 'desc')])

  const leagueConstraints = selectedSeasonId
    ? [where('seasonId', '==', selectedSeasonId), orderBy('createdAt', 'desc')]
    : [orderBy('createdAt', 'desc')]

  const tournamentConstraints = selectedSeasonId
    ? [where('seasonId', '==', selectedSeasonId), orderBy('startDate', 'asc')]
    : [orderBy('startDate', 'desc')]

  const { data: leagues, loading: leaguesLoading } = useFirestoreCollection('leagues', leagueConstraints)
  const { data: tournaments, loading: tournamentsLoading } = useFirestoreCollection('tournaments', tournamentConstraints)
  const seasonNameById = Object.fromEntries(seasons.map((season) => [season.id, season.name]))

  const canManage = isEditor

  return (
    <AppLayout>
      <Container className="py-8">
        <SectionTitle
          title="Competitions"
          subtitle="Leagues and tournaments grouped by season."
          action={canManage && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => navigate('/leagues/create')}>+ League</Button>
              <Button size="sm" onClick={() => navigate('/tournaments/create')}>+ Tournament</Button>
            </div>
          )}
        />
        <div className="mb-8 mt-8 flex flex-wrap items-center gap-3">
          <label className="text-sm font-medium text-text">Season</label>
          <select
            className="border border-slate-300 bg-white px-3 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            value={selectedSeasonId}
            onChange={(event) => setSelectedSeasonId(event.target.value)}
          >
            <option value="">All seasons</option>
            {seasons.map((season) => (
              <option key={season.id} value={season.id}>{season.name}</option>
            ))}
          </select>
          <Link to="/seasons" className="text-sm text-primary hover:underline">
            View seasons
          </Link>
        </div>

        <section className="mb-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-heading text-lg font-bold text-text">Leagues</h2>
            <Link to="/leagues" className="text-sm text-primary hover:underline">Open leagues page</Link>
          </div>

          {leaguesLoading ? (
            <div className="flex justify-center py-10"><Loader /></div>
          ) : leagues.length === 0 ? (
            <p className="text-sm text-text-light">No leagues for selected season.</p>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {leagues.map((league) => (
                <div key={league.id} className="space-y-2">
                  <TournamentCard
                    tournament={{
                      name: league.name,
                      season: seasonNameById[league.seasonId] || 'Season',
                      status: league.format,
                      image: league.image || null,
                    }}
                  />
                  {canManage ? (
                    <Link
                      to={`/leagues/${league.id}/enroll`}
                      className="inline-block text-sm font-medium text-primary hover:underline"
                    >
                      Setup & Draw →
                    </Link>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-heading text-lg font-bold text-text">Tournaments</h2>
            <Link to="/tournaments" className="text-sm text-primary hover:underline">Open tournaments page</Link>
          </div>

          {tournamentsLoading ? (
            <div className="flex justify-center py-10"><Loader /></div>
          ) : tournaments.length === 0 ? (
            <p className="text-sm text-text-light">No tournaments for selected season.</p>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {tournaments.map((tournament) => (
                <div key={tournament.id} className="space-y-2">
                  <TournamentCard
                    tournament={{
                      ...tournament,
                      season:
                        seasonNameById[tournament.seasonId]
                        || `${formatDate(tournament.startDate)} - ${formatDate(tournament.endDate)}`,
                      status: tournament.format,
                    }}
                  />
                  {canManage ? (
                    <Link
                      to={`/tournaments/${tournament.id}/enroll`}
                      className="inline-block text-sm font-medium text-primary hover:underline"
                    >
                      Setup & Draw →
                    </Link>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </section>
      </Container>
    </AppLayout>
  )
}
