import { useNavigate } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { orderBy } from 'firebase/firestore'
import AppLayout from '../../../layouts/AppLayout.jsx'
import {
  Button,
  Loader,
  SectionTitle,
  TournamentCard,
  Container,
  Card,
} from '../../../ui/index.js'
import { useFirestoreCollection } from '../../../hooks/useFirestore.js'
import { useAuthContext } from '../../auth/context/AuthContext.jsx'

export default function CompetitionsPage() {
  const navigate = useNavigate()
  const { isEditor } = useAuthContext()

  const { data: seasons, loading: seasonsLoading } = useFirestoreCollection('seasons', [orderBy('startDate', 'desc')])
  const { data: leagues, loading: leaguesLoading } = useFirestoreCollection('leagues', [orderBy('createdAt', 'desc')])
  const { data: tournaments, loading: tournamentsLoading } = useFirestoreCollection('tournaments', [orderBy('createdAt', 'desc')])

  const loading = seasonsLoading || leaguesLoading || tournamentsLoading

  const all = [
    ...leagues.map(l => ({ ...l, _type: 'leagues' })),
    ...tournaments.map(t => ({ ...t, _type: 'tournaments' })),
  ]

  // Group by seasonId
  const bySeason = {}
  for (const item of all) {
    const sid = item.seasonId || '__none__'
    if (!bySeason[sid]) bySeason[sid] = []
    bySeason[sid].push(item)
  }

  // Season order from Firestore (already sorted startDate desc)
  const seasonOrder = seasons.map(s => s.id)
  const seasonById = Object.fromEntries(seasons.map(s => [s.id, s]))

  // Seasons that have competitions, in order; unseasoned at the end
  const orderedSeasonIds = [
    ...seasonOrder.filter(id => bySeason[id]),
    ...(bySeason['__none__'] ? ['__none__'] : []),
  ]

  function sortItems(items) {
    return [...items].sort((a, b) => {
      const oa = a.displayOrder ?? Infinity
      const ob = b.displayOrder ?? Infinity
      if (oa !== ob) return oa - ob
      const ta = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0)
      const tb = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0)
      return tb - ta
    })
  }

  return (
    <AppLayout>
      <Container className="py-8">
        <SectionTitle
          title="Competitions"
          subtitle="All leagues and tournaments grouped by season."
          action={isEditor && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => navigate('/leagues/create')}>+ League</Button>
              <Button size="sm" onClick={() => navigate('/tournaments/create')}>+ Tournament</Button>
            </div>
          )}
        />

        <div className="mt-8 space-y-10">
          {loading ? (
            <div className="flex justify-center py-16"><Loader /></div>
          ) : orderedSeasonIds.length === 0 ? (
            <Card>
              <p className="text-sm text-text-light">No competitions yet.</p>
            </Card>
          ) : (
            orderedSeasonIds.map(sid => {
              const season = seasonById[sid]
              const items = bySeason[sid]
              return (
                <section key={sid}>
                  <h2 className="mb-4 font-heading text-lg font-bold text-text">
                    {season ? season.name : 'No Season'}
                  </h2>
                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {sortItems(items).map(item => (
                      <Link key={item.id} to={`/${item._type}/${item.id}`}>
                        <TournamentCard
                          tournament={{
                            name: item.name,
                            season: item._type === 'leagues' ? 'League' : 'Tournament',
                            status: item.format,
                            image: item.imageUrls?.[800] || item.imageUrls?.[400] || null,
                          }}
                        />
                      </Link>
                    ))}
                  </div>
                </section>
              )
            })
          )}
        </div>
      </Container>
    </AppLayout>
  )
}
