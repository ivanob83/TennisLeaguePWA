import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import AppLayout from '../../../layouts/AppLayout.jsx'
import { SectionTitle, Button, Loader, Card, Badge, Container, ConfirmDialog } from '../../../ui/index.js'
import { useFirestoreDoc } from '../../../hooks/useFirestore.js'
import { useFirestoreCollection } from '../../../hooks/useFirestore.js'
import { useAuthContext } from '../../auth/context/AuthContext.jsx'
import { useToast } from '../../../context/ToastContext.jsx'
import { deleteCompetition } from '../../enrollment/services/competitionDelete.js'
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
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function LeagueDetailPage() {
  const { leagueId } = useParams()
  const navigate = useNavigate()
  const { isEditor, isSuperadmin } = useAuthContext()
  const { showToast } = useToast()
  const { data: league, loading } = useFirestoreDoc('leagues', leagueId)
  const { data: seasons } = useFirestoreCollection('seasons')
  const [activeTab, setActiveTab] = useState('setup')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteCompetition(leagueId, 'leagues')
      showToast({ title: 'League deleted', message: 'Competition and all data removed.', variant: 'success' })
      navigate('/leagues')
    } catch {
      showToast({ title: 'Delete failed', message: 'Please try again.', variant: 'error' })
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  const season = seasons.find(s => s.id === league?.seasonId)
  const isGroupBased = league?.format === 'round_robin' || league?.format === 'round_robin_knockout'
  const hasKnockout = league?.format === 'knockout' || league?.format === 'round_robin_knockout'

  const tabs = [
    ...(isEditor ? [{ id: 'setup', label: 'Setup' }] : []),
    ...(isEditor ? [{ id: 'draw', label: 'Draw' }] : []),
    ...(isGroupBased ? [{ id: 'group_matches', label: 'Group Matches' }] : []),
    ...(isGroupBased ? [{ id: 'standings', label: 'Standings' }] : []),
    ...(hasKnockout ? [{ id: 'knockout', label: 'Knockout' }] : []),
  ]

  const currentTab = tabs.find(t => t.id === activeTab) ? activeTab : tabs[0]?.id

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
              title={league?.name ?? 'League'}
              subtitle={season ? `Season: ${season.name}` : 'League detail'}
              action={
                isEditor && (
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => navigate(`/leagues/${leagueId}/edit`)}>
                      Edit
                    </Button>
                    {isSuperadmin && (
                      <Button size="sm" variant="ghost" className="text-rose-500 hover:text-rose-600" onClick={() => setConfirmDelete(true)}>
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
                {tabs.map(tab => (
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
                        <Badge>{FORMAT_LABEL[league?.format] || league?.format}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-text-light">Season</span>
                        <span className="font-medium text-text">{season?.name || league?.seasonId || '—'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-text-light">Status</span>
                        <Badge variant="neutral">{league?.status || 'draft'}</Badge>
                      </div>
                      {isGroupBased && (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-text-light">Number of groups</span>
                            <span className="font-medium text-text">{league?.numGroups ?? '—'}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-text-light">Players per group</span>
                            <span className="font-medium text-text">{league?.playersPerGroup ?? '—'}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-text-light">Points (W / L)</span>
                            <span className="font-medium text-text">
                              {league?.pointsPerWin ?? 3} / {league?.pointsPerLoss ?? 0}
                            </span>
                          </div>
                          {league?.tierMultipliers?.length > 0 && (
                            <>
                              <div className="border-t border-slate-100 pt-3">
                                <p className="mb-2 text-text-light text-xs uppercase tracking-wide font-medium">Ranking tiers</p>
                                {league.tierMultipliers.map((m, i) => (
                                  <div key={i} className="flex items-center justify-between py-0.5">
                                    <span className="text-text-light">Group {String.fromCharCode(65 + i)}</span>
                                    <span className="font-medium text-text">{Math.round(m * 100)}%</span>
                                  </div>
                                ))}
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-text-light">Promotion / Relegation</span>
                                <span className="font-medium text-text">
                                  ↑ {league?.promotionCount ?? 0} / ↓ {league?.relegationCount ?? 0}
                                </span>
                              </div>
                            </>
                          )}
                        </>
                      )}
                      {league?.rules && (
                        <div className="border-t border-slate-100 pt-3">
                          <p className="mb-1 text-text-light">Rules</p>
                          <p className="text-text">{league.rules}</p>
                        </div>
                      )}
                    </div>
                    {isEditor && (
                      <div className="mt-4 border-t border-slate-100 pt-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/leagues/${leagueId}/edit`)}
                        >
                          Edit league settings
                        </Button>
                      </div>
                    )}
                  </Card>
                </div>
              )}

              {currentTab === 'draw' && (
                <div className="space-y-8">
                  <EnrollmentManager competitionId={leagueId} competitionType="leagues" />
                  <CompetitionDrawTab
                    competitionId={leagueId}
                    competitionType="leagues"
                    competition={league}
                  />
                </div>
              )}

              {currentTab === 'group_matches' && (
                <GroupMatchesTab competitionType="leagues" competitionId={leagueId} competitionName={league?.name} />
              )}

              {currentTab === 'standings' && (
                <GroupStandingsTab competitionType="leagues" competitionId={leagueId} competition={league} />
              )}

              {currentTab === 'knockout' && (
                <KnockoutTab competitionType="leagues" competitionId={leagueId} />
              )}

            </div>
          </>
        )}
      </Container>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete League"
        description={`Delete "${league?.name}" and all its groups, enrollments, and match slots? This cannot be undone.`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </AppLayout>
  )
}
