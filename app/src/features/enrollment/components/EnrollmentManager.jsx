import { useState } from 'react'
import { where } from 'firebase/firestore'
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
  usersRepository,
} from '../../../infrastructure/firestore.js'
import { useAuthContext } from '../../auth/context/AuthContext.jsx'

/**
 * Shared enrollment manager used by both LeagueEnrollPage and TournamentEnrollPage.
 * @param {{ competitionId: string, competitionType: 'leagues'|'tournaments' }} props
 */
export default function EnrollmentManager({ competitionId, competitionType }) {
  const { user } = useAuthContext()
  const enrollmentPath = `${competitionType}/${competitionId}/enrollments`
  const repo = competitionType === 'leagues'
    ? leagueEnrollmentRepository(competitionId)
    : tournamentEnrollmentRepository(competitionId)

  const { data: enrollments, loading } = useFirestoreCollection(enrollmentPath)
  const [email, setEmail] = useState('')
  const [foundUser, setFoundUser] = useState(null)
  const [searchError, setSearchError] = useState(null)
  const [searching, setSearching] = useState(false)
  const [enrolling, setEnrolling] = useState(false)
  const [removingId, setRemovingId] = useState(null)

  async function handleSearch(e) {
    e.preventDefault()
    if (!email.trim()) return
    setSearching(true)
    setFoundUser(null)
    setSearchError(null)
    try {
      const results = await usersRepository.query([where('email', '==', email.trim().toLowerCase())])
      if (results.length === 0) {
        setSearchError('No user found with that email address.')
      } else {
        const found = results[0]
        const playerId = found.uid || found.id
        const alreadyEnrolled = enrollments.some(en => en.playerId === playerId)
        if (alreadyEnrolled) {
          setSearchError('This player is already enrolled.')
        } else {
          setFoundUser(found)
        }
      }
    } catch {
      setSearchError('Search failed. Please try again.')
    } finally {
      setSearching(false)
    }
  }

  async function handleEnroll() {
    if (!foundUser) return
    setEnrolling(true)
    try {
      await repo.create({
        playerId: foundUser.uid || foundUser.id,
        playerName: foundUser.displayName || foundUser.email,
        playerEmail: foundUser.email,
        status: 'active',
        enrolledAt: new Date().toISOString(),
        enrolledBy: user.uid,
      })
      setEmail('')
      setFoundUser(null)
    } catch {
      setSearchError('Failed to enroll player. Please try again.')
    } finally {
      setEnrolling(false)
    }
  }

  async function handleRemove(enrollmentId) {
    setRemovingId(enrollmentId)
    try {
      await repo.delete(enrollmentId)
    } catch {
      // silently ignore — player stays in list, admin can retry
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <div className="space-y-8">
      <Card>
        <h3 className="mb-4 font-heading text-base font-semibold text-text">Add Player</h3>
        <form onSubmit={handleSearch} className="flex gap-3">
          <Input
            name="email"
            placeholder="Player email address"
            type="email"
            value={email}
            onChange={e => {
              setEmail(e.target.value)
              setFoundUser(null)
              setSearchError(null)
            }}
            className="flex-1"
          />
          <Button type="submit" variant="outline" size="sm" loading={searching} loadingLabel="Searching...">
            Search
          </Button>
        </form>
        {searchError && <Alert variant="error" className="mt-3">{searchError}</Alert>}
        {foundUser && (
          <div className="mt-4 flex items-center justify-between border border-slate-200 bg-[#fafafa] p-3">
            <div>
              <p className="text-sm font-medium text-text">{foundUser.displayName || '—'}</p>
              <p className="text-xs text-text-light">{foundUser.email}</p>
            </div>
            <Button size="sm" loading={enrolling} loadingLabel="Enrolling..." onClick={handleEnroll}>
              Enroll
            </Button>
          </div>
        )}
      </Card>

      <div>
        <h3 className="mb-4 font-heading text-base font-semibold text-text">
          Enrolled Players ({loading ? '…' : enrollments.length})
        </h3>
        {loading ? (
          <div className="flex justify-center py-10"><Loader /></div>
        ) : enrollments.length === 0 ? (
          <p className="text-sm text-text-light">No players enrolled yet.</p>
        ) : (
          <div className="divide-y divide-slate-200 border border-slate-200">
            {enrollments.map(en => (
              <div key={en.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-text">{en.playerName}</p>
                  <p className="text-xs text-text-light">{en.playerEmail}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={en.status === 'active' ? 'finished' : 'cancelled'}>
                    {en.status}
                  </Badge>
                  <button
                    onClick={() => handleRemove(en.id)}
                    disabled={removingId === en.id}
                    className="text-slate-400 transition-colors hover:text-rose-500 disabled:opacity-50"
                    aria-label="Remove player"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
