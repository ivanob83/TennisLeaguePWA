import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import AppLayout from '../../../layouts/AppLayout.jsx'
import {
  SectionTitle,
  Button,
  Loader,
  Card,
  Badge,
  Container,
  ConfirmDialog,
} from '../../../ui/index.js'
import { useFirestoreDoc } from '../../../hooks/useFirestore.js'
import { useFirestoreCollection } from '../../../hooks/useFirestore.js'
import { useAuthContext } from '../../auth/context/AuthContext.jsx'
import { useToast } from '../../../context/ToastContext.jsx'
import { deleteCompetition } from '../../enrollment/services/competitionDelete.js'
import { tournamentEnrollmentRepository } from '../../../infrastructure/firestore.js'
import { recalculateRankings } from '../../rankings/services/rankingService.js'
import EnrollmentManager from '../../enrollment/components/EnrollmentManager.jsx'
import CompetitionDrawTab from '../../enrollment/components/CompetitionDrawTab.jsx'
import GroupMatchesTab from '../../enrollment/components/GroupMatchesTab.jsx'
import GroupStandingsTab from '../../enrollment/components/GroupStandingsTab.jsx'
import KnockoutTab from '../../enrollment/components/KnockoutTab.jsx'

const FORMAT_LABEL = {
  round_robin: 'Round Robin',
  knockout: 'Knockout',
  round_robin_knockout: 'Round Robin + Knockout',
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function TournamentDetailPage() {
  const { tournamentId } = useParams()
  const navigate = useNavigate()
  const { isEditor, isSuperadmin } = useAuthContext()
  const { showToast } = useToast()
  const { data: tournament, loading } = useFirestoreDoc('tournaments', tournamentId)
  const { data: seasons } = useFirestoreCollection('seasons')
  const [activeTab, setActiveTab] = useState('setup')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [recalculating, setRecalculating] = useState(false)

  async function handleRecalculateRankings() {
    setRecalculating(true)
    try {
      const enrollments = await tournamentEnrollmentRepository(tournamentId).getAll()
      await recalculateRankings('tournaments', tournamentId, enrollments)
      showToast({
        title: 'Rankings updated',
        message: 'Rankings recalculated successfully.',
        variant: 'success',
      })
    } catch (err) {
      showToast({ title: 'Recalculation failed', message: err.message, variant: 'error' })
    } finally {
      setRecalculating(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteCompetition(tournamentId, 'tournaments')
      showToast({
        title: 'Tournament deleted',
        message: 'Competition and all data removed.',
        variant: 'success',
      })
      navigate('/tournaments')
    } catch {
      showToast({ title: 'Delete failed', message: 'Please try again.', variant: 'error' })
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  const season = seasons.find((s) => s.id === tournament?.seasonId)
  const isGroupBased =
    tournament?.format === 'round_robin' || tournament?.format === 'round_robin_knockout'
  const hasKnockout =
    tournament?.format === 'knockout' || tournament?.format === 'round_robin_knockout'

  const tabs = [
    ...(isEditor ? [{ id: 'setup', label: 'Setup' }] : []),
    ...(isEditor ? [{ id: 'draw', label: 'Draw' }] : []),
    ...(isGroupBased ? [{ id: 'group_matches', label: 'Group Matches' }] : []),
    ...(isGroupBased ? [{ id: 'standings', label: 'Standings' }] : []),
    ...(hasKnockout ? [{ id: 'knockout', label: 'Knockout' }] : []),
  ]

  const currentTab = tabs.find((t) => t.id === activeTab) ? activeTab : tabs[0]?.id

  return (
    <AppLayout>
      <Container className="py-8">
        <div className="mb-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/competitions')}>
            ← Back to Competitions
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader />
          </div>
        ) : (
          <>
            <SectionTitle
              title={tournament?.name ?? 'Tournament'}
              subtitle={season ? `Season: ${season.name}` : 'Tournament detail'}
              action={
                isEditor && (
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      loading={recalculating}
                      loadingLabel="Recalculating..."
                      onClick={handleRecalculateRankings}
                    >
                      Recalculate Rankings
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/tournaments/${tournamentId}/edit`)}
                    >
                      Edit
                    </Button>
                    {isSuperadmin && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-rose-500 hover:text-rose-600"
                        onClick={() => setConfirmDelete(true)}
                      >
                        <Trash2 size={15} />
                        Delete
                      </Button>
                    )}
                  </div>
                )
              }
            />

            <div className="mt-6 border-b border-slate-200">
              <div className="flex gap-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      currentTab === tab.id
                        ? 'border-b-2 border-secondary text-secondary'
                        : 'text-text-light hover:text-text'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6">
              {currentTab === 'setup' && (
                <div className="max-w-lg">
                  <Card>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-text-light">Format</span>
                        <Badge>{FORMAT_LABEL[tournament?.format] || tournament?.format}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-text-light">Season</span>
                        <span className="font-medium text-text">
                          {season?.name || tournament?.seasonId || '—'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-text-light">Date range</span>
                        <span className="font-medium text-text">
                          {formatDate(tournament?.startDate)} – {formatDate(tournament?.endDate)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-text-light">Status</span>
                        <Badge variant="neutral">{tournament?.status || 'draft'}</Badge>
                      </div>
                      {isGroupBased && (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-text-light">Number of groups</span>
                            <span className="font-medium text-text">
                              {tournament?.numGroups ?? '—'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-text-light">Players per group</span>
                            <span className="font-medium text-text">
                              {tournament?.playersPerGroup ?? '—'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-text-light">Points (W / L)</span>
                            <span className="font-medium text-text">
                              {tournament?.pointsPerWin ?? 3} / {tournament?.pointsPerLoss ?? 0}
                            </span>
                          </div>
                        </>
                      )}
                      {tournament?.rules && (
                        <div className="border-t border-slate-100 pt-3">
                          <p className="mb-1 text-text-light">Rules</p>
                          <p className="text-text">{tournament.rules}</p>
                        </div>
                      )}
                    </div>
                    {isEditor && (
                      <div className="mt-4 border-t border-slate-100 pt-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/tournaments/${tournamentId}/edit`)}
                        >
                          Edit tournament settings
                        </Button>
                      </div>
                    )}
                  </Card>
                </div>
              )}

              {currentTab === 'draw' && (
                <div className="space-y-8">
                  <EnrollmentManager competitionId={tournamentId} competitionType="tournaments" />
                  <CompetitionDrawTab
                    competitionId={tournamentId}
                    competitionType="tournaments"
                    competition={tournament}
                  />
                </div>
              )}

              {currentTab === 'group_matches' && (
                <GroupMatchesTab
                  competitionType="tournaments"
                  competitionId={tournamentId}
                  competitionName={tournament?.name}
                />
              )}

              {currentTab === 'standings' && (
                <GroupStandingsTab
                  competitionType="tournaments"
                  competitionId={tournamentId}
                  competition={tournament}
                />
              )}

              {currentTab === 'knockout' && (
                <KnockoutTab competitionType="tournaments" competitionId={tournamentId} />
              )}
            </div>
          </>
        )}
      </Container>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete Tournament"
        description={`Delete "${tournament?.name}" and all its groups, enrollments, and match slots? This cannot be undone.`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </AppLayout>
  )
}
