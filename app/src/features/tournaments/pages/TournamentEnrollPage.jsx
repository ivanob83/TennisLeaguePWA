import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import AppLayout from '../../../layouts/AppLayout.jsx'
import { SectionTitle, Button, Loader, Card, Badge } from '../../../ui/index.js'
import { useFirestoreDoc } from '../../../hooks/useFirestore.js'
import EnrollmentManager from '../../enrollment/components/EnrollmentManager.jsx'
import CompetitionDrawTab from '../../enrollment/components/CompetitionDrawTab.jsx'

const FORMAT_LABEL = {
  round_robin: 'Round Robin',
  knockout: 'Knockout',
  round_robin_knockout: 'Round Robin + Knockout',
}

export default function TournamentEnrollPage() {
  const { tournamentId } = useParams()
  const navigate = useNavigate()
  const { data: tournament, loading } = useFirestoreDoc('tournaments', tournamentId)
  const [activeTab, setActiveTab] = useState('setup')

  const isGroupFormat =
    tournament?.format === 'round_robin' || tournament?.format === 'round_robin_knockout'

  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl px-6 py-section">
        <div className="mb-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/tournaments')}>
            ← Back to Tournaments
          </Button>
        </div>
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader />
          </div>
        ) : (
          <>
            <div className="mb-8">
              <SectionTitle title="Tournament Setup" subtitle={tournament?.name ?? 'Tournament'} />
            </div>

            <div className="mb-6 flex gap-3 border-b border-slate-200 pb-3">
              <Button
                size="sm"
                variant={activeTab === 'setup' ? 'primary' : 'outline'}
                onClick={() => setActiveTab('setup')}
              >
                Setup
              </Button>
              <Button
                size="sm"
                variant={activeTab === 'draw' ? 'primary' : 'outline'}
                onClick={() => setActiveTab('draw')}
              >
                Draw
              </Button>
            </div>

            {activeTab === 'setup' ? (
              <Card>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-text-light">Format</span>
                    <Badge>{FORMAT_LABEL[tournament?.format] || tournament?.format}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-text-light">Season ID</span>
                    <span className="font-medium text-text">{tournament?.seasonId || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-text-light">Date range</span>
                    <span className="font-medium text-text">
                      {tournament?.startDate || '—'} - {tournament?.endDate || '—'}
                    </span>
                  </div>
                  {isGroupFormat && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-text-light">Groups</span>
                        <span className="font-medium text-text">{tournament?.numGroups || 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-text-light">Players per group</span>
                        <span className="font-medium text-text">
                          {tournament?.playersPerGroup || 0}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </Card>
            ) : (
              <div className="space-y-8">
                <EnrollmentManager competitionId={tournamentId} competitionType="tournaments" />
                <CompetitionDrawTab
                  competitionId={tournamentId}
                  competitionType="tournaments"
                  competition={tournament}
                />
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  )
}
