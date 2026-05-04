import { useState, useEffect, useMemo } from 'react'
import { Trash2 } from 'lucide-react'
import {
  Card,
  Input,
  Button,
  Alert,
  Loader,
  Badge,
} from '../../../ui/index.js'
import { useFirestoreCollection } from '../../../hooks/useFirestore.js'
import {
  leagueEnrollmentRepository,
  tournamentEnrollmentRepository,
  playersRepository,
} from '../../../infrastructure/firestore.js'
import { useAuthContext } from '../../auth/context/AuthContext.jsx'

/**
 * Shared enrollment manager used by both LeagueDetailPage and TournamentDetailPage.
 * @param {{ competitionId: string, competitionType: 'leagues'|'tournaments' }} props
 */
export default function EnrollmentManager({ competitionId, competitionType }) {
  const { user } = useAuthContext()
  const enrollmentPath = `${competitionType}/${competitionId}/enrollments`
  const repo = competitionType === 'leagues'
    ? leagueEnrollmentRepository(competitionId)
    : tournamentEnrollmentRepository(competitionId)

  const { data: enrollments, loading: enrollmentsLoading } = useFirestoreCollection(enrollmentPath)

  const [allPlayers, setAllPlayers] = useState([])
  const [playersLoading, setPlayersLoading] = useState(false)
  const [showList, setShowList] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [enrolling, setEnrolling] = useState(null)
  const [removingId, setRemovingId] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!showList || allPlayers.length > 0) return
    setPlayersLoading(true)
    playersRepository.getAll()
      .then(setAllPlayers)
      .catch(() => setError('Failed to load players.'))
      .finally(() => setPlayersLoading(false))
  }, [showList])

  const enrolledPlayerIds = useMemo(
    () => new Set(enrollments.map(en => en.playerId)),
    [enrollments]
  )

  const filteredPlayers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return allPlayers.filter(p => {
      if (enrolledPlayerIds.has(p.id)) return false
      if (!q) return true
      return (p.name || '').toLowerCase().includes(q)
    })
  }, [allPlayers, searchQuery, enrolledPlayerIds])

  async function handleEnroll(player) {
    setEnrolling(player.id)
    setError(null)
    try {
      await repo.create({
        playerId: player.id,
        playerName: player.name || player.email || player.id,
        playerEmail: player.email || null,
        status: 'active',
        enrolledAt: new Date().toISOString(),
        enrolledBy: user.uid,
      })
    } catch {
      setError('Failed to enroll player. Please try again.')
    } finally {
      setEnrolling(null)
    }
  }

  async function handleRemove(enrollmentId) {
    setRemovingId(enrollmentId)
    try {
      await repo.delete(enrollmentId)
    } catch {
      // silently ignore
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <div className="space-y-8">
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-heading text-base font-semibold text-text">Add Player</h3>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowList(v => !v)
              setSearchQuery('')
              setError(null)
            }}
          >
            {showList ? 'Hide list' : 'Show list'}
          </Button>
        </div>

        {showList && (
          <>
            <Input
              placeholder="Filter by name..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="mb-3"
            />
            {error && <Alert variant="error" className="mb-3">{error}</Alert>}
            {playersLoading ? (
              <div className="flex justify-center py-6"><Loader /></div>
            ) : filteredPlayers.length === 0 ? (
              <p className="py-4 text-center text-sm text-text-light">
                {searchQuery ? 'No players match your search.' : 'All players are already enrolled.'}
              </p>
            ) : (
              <div className="max-h-64 divide-y divide-slate-100 overflow-y-auto border border-slate-200">
                {filteredPlayers.map(player => (
                  <div key={player.id} className="flex items-center justify-between px-3 py-2.5">
                    <div>
                      <p className="text-sm font-medium text-text">{player.name || '—'}</p>
                      {player.email && (
                        <p className="text-xs text-text-light">{player.email}</p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      loading={enrolling === player.id}
                      loadingLabel="..."
                      onClick={() => handleEnroll(player)}
                    >
                      Enroll
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </Card>

      <div>
        <h3 className="mb-4 font-heading text-base font-semibold text-text">
          Enrolled Players ({enrollmentsLoading ? '…' : enrollments.length})
        </h3>
        {enrollmentsLoading ? (
          <div className="flex justify-center py-10"><Loader /></div>
        ) : enrollments.length === 0 ? (
          <p className="text-sm text-text-light">No players enrolled yet.</p>
        ) : (
          <div className="divide-y divide-slate-200 border border-slate-200">
            {enrollments.map(en => (
              <div key={en.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-text">{en.playerName}</p>
                  {en.playerEmail && (
                    <p className="text-xs text-text-light">{en.playerEmail}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={en.status === 'active' ? 'finished' : 'cancelled'}>
                    {en.status}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemove(en.id)}
                    disabled={removingId === en.id}
                    className="text-slate-400 hover:text-rose-500"
                    aria-label="Remove player"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
