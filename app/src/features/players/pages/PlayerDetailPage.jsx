import { useParams, useNavigate } from 'react-router-dom'
import AppLayout from '../../../layouts/AppLayout.jsx'
import {
  SectionTitle,
  Container,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Avatar,
  Badge,
  Loader,
} from '../../../ui/index.js'
import { useFirestoreDoc } from '../../../hooks/useFirestore.js'
import { useAuthContext } from '../../auth/context/AuthContext.jsx'

export default function PlayerDetailPage() {
  const { playerId } = useParams()
  const navigate = useNavigate()
  const { isEditor, linkedPlayer } = useAuthContext()
  const isOwnProfile = linkedPlayer?.id === playerId
  const { data: player, loading } = useFirestoreDoc('players', playerId)

  return (
    <AppLayout>
      <Container className="py-8">
        <div className="mb-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/players')}>
            ← Back to Players
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader />
          </div>
        ) : !player ? (
          <p className="py-16 text-center text-text-light">Player not found.</p>
        ) : (
          <>
            <SectionTitle
              title={player.name}
              subtitle={player.email || 'Player profile'}
              action={
                (isEditor || isOwnProfile) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/players/${playerId}/edit`)}
                  >
                    Edit
                  </Button>
                )
              }
            />

            <div className="mt-8 grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-1">
                <Card>
                  <div className="flex flex-col items-center gap-3 py-4">
                    <Avatar
                      urls={player.avatarUrls || null}
                      src={player.avatarUrl || null}
                      sizeHint={120}
                      name={player.name}
                      className="h-24 w-24 border border-slate-200"
                    />
                    <div className="text-center">
                      <h2 className="font-heading text-lg font-semibold text-text">{player.name}</h2>
                      {player.email && (
                        <p className="text-sm text-text-light">{player.email}</p>
                      )}
                      {player.authUid ? (
                        <Badge variant="finished" className="mt-2">Linked user</Badge>
                      ) : (
                        <Badge variant="neutral" className="mt-2">No account linked</Badge>
                      )}
                    </div>
                  </div>
                </Card>
              </div>

              <div className="lg:col-span-2 space-y-5">
                <Card>
                  <CardHeader>
                    <CardTitle>Season stats</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-primary">—</p>
                        <p className="text-xs uppercase tracking-wide text-text-light">Matches played</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-primary">—</p>
                        <p className="text-xs uppercase tracking-wide text-text-light">Wins</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-primary">—</p>
                        <p className="text-xs uppercase tracking-wide text-text-light">Win rate</p>
                      </div>
                    </div>
                    <p className="mt-4 text-center text-sm text-text-light">
                      Stats will be available once match results are recorded.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Competition history</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-text-light">
                      Competition history will be available in a future sprint.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        )}
      </Container>
    </AppLayout>
  )
}
