import { useCallback, useEffect, useMemo, useState } from 'react'
import AppLayout from '../../../layouts/AppLayout.jsx'
import { Container, SectionTitle, Alert, ConfirmDialog } from '../../../ui/index.js'
import { useAuthContext } from '../../auth/context/AuthContext.jsx'
import { leaguesRepository, tournamentsRepository } from '../../../infrastructure/firestore.js'
import QuickAvailabilityForm from '../components/QuickAvailabilityForm.jsx'
import AvailabilityTable from '../components/AvailabilityTable.jsx'
import PairingSuggestions from '../components/PairingSuggestions.jsx'
import PlayerCombobox from '../components/PlayerCombobox.jsx'
import WeekCalendarEditor from '../components/calendar/WeekCalendarEditor.jsx'

const TABS = [
  { id: 'calendar', label: 'Calendar entry' },
  { id: 'entry', label: 'Quick entry' },
  { id: 'pairs', label: 'Pairing suggestions' },
]

export default function SchedulingPage() {
  const { isEditor, loading: authLoading } = useAuthContext()
  const [activeTab, setActiveTab] = useState('calendar')
  const [tableRefresh, setTableRefresh] = useState(0)
  const [competitions, setCompetitions] = useState([])
  const [compsLoading, setCompsLoading] = useState(true)
  const [calendarPlayer, setCalendarPlayer] = useState(null)
  const [calendarScopeKey, setCalendarScopeKey] = useState('')
  const [calendarDirty, setCalendarDirty] = useState(false)
  const [pendingCalendarChange, setPendingCalendarChange] = useState(null)

  const handleDirtyChange = useCallback((d) => setCalendarDirty(d), [])

  function attemptPlayerChange(p) {
    if (calendarDirty) {
      setPendingCalendarChange(() => () => setCalendarPlayer(p))
    } else {
      setCalendarPlayer(p)
    }
  }
  function attemptScopeChange(key) {
    if (calendarDirty) {
      setPendingCalendarChange(() => () => setCalendarScopeKey(key))
    } else {
      setCalendarScopeKey(key)
    }
  }
  function confirmCalendarNav() {
    const action = pendingCalendarChange
    setPendingCalendarChange(null)
    setCalendarDirty(false)
    action?.()
  }
  function cancelCalendarNav() {
    setPendingCalendarChange(null)
  }

  useEffect(() => {
    let active = true
    Promise.all([leaguesRepository.getAll(), tournamentsRepository.getAll()])
      .then(([leagues, tournaments]) => {
        if (!active) return
        const opts = []
        for (const l of leagues) {
          if (l.status !== 'active' && l.status !== 'draft') continue
          opts.push({
            value: `leagues:${l.id}`,
            label: `League — ${l.name || l.id}`,
            competitionType: 'leagues',
            competitionId: l.id,
          })
        }
        for (const t of tournaments) {
          if (t.status !== 'active' && t.status !== 'draft') continue
          opts.push({
            value: `tournaments:${t.id}`,
            label: `Tournament — ${t.name || t.id}`,
            competitionType: 'tournaments',
            competitionId: t.id,
          })
        }
        setCompetitions(opts)
      })
      .catch(() => {
        if (active) setCompetitions([])
      })
      .finally(() => {
        if (active) setCompsLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const scopeOptions = useMemo(() => competitions, [competitions])

  if (authLoading) return null

  if (!isEditor) {
    return (
      <AppLayout>
        <Container className="py-8">
          <Alert variant="error">Access restricted to editor+.</Alert>
        </Container>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <Container className="py-8">
        <SectionTitle
          title="Scheduling"
          subtitle="Quickly enter player availability and view pairing suggestions."
        />

        <div className="mt-8">
          <div className="mb-6 flex border-b border-slate-200">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={
                  'border-b-2 px-4 py-2 text-sm font-semibold uppercase tracking-wide transition-colors ' +
                  (activeTab === t.id
                    ? 'border-secondary text-primary'
                    : 'border-transparent text-text-light hover:text-text')
                }
              >
                {t.label}
              </button>
            ))}
          </div>

          {activeTab === 'entry' ? (
            <div className="space-y-6">
              <QuickAvailabilityForm
                scopeOptions={scopeOptions}
                onCreated={() => setTableRefresh((t) => t + 1)}
              />
              <AvailabilityTable refreshKey={tableRefresh} />
            </div>
          ) : null}

          {activeTab === 'calendar' ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-text">Player</label>
                  <PlayerCombobox value={calendarPlayer} onChange={attemptPlayerChange} />
                </div>
                {scopeOptions.length > 0 ? (
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-text">Scope</label>
                    <select
                      value={calendarScopeKey}
                      onChange={(e) => attemptScopeChange(e.target.value)}
                      className="w-full border border-slate-300 bg-white px-field-x py-field-y text-sm text-text"
                    >
                      <option value="">All competitions</option>
                      {scopeOptions.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
              </div>
              <WeekCalendarEditor
                playerId={calendarPlayer?.id || null}
                scope={
                  calendarScopeKey
                    ? scopeOptions.find((s) => s.value === calendarScopeKey) || null
                    : null
                }
                onDirtyChange={handleDirtyChange}
              />
              <ConfirmDialog
                open={Boolean(pendingCalendarChange)}
                title="Discard unsaved changes?"
                description="You have unsaved availability changes. Continue and lose them?"
                confirmLabel="Discard"
                variant="warning"
                onConfirm={confirmCalendarNav}
                onCancel={cancelCalendarNav}
              />
            </div>
          ) : null}

          {activeTab === 'pairs' ? (
            compsLoading ? null : (
              <PairingSuggestions
                competitionOptions={competitions}
                defaultCompetition={competitions[0]?.value || null}
              />
            )
          ) : null}
        </div>
      </Container>
    </AppLayout>
  )
}
