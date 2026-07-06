import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { orderBy } from 'firebase/firestore'
import AppLayout from '../../../layouts/AppLayout.jsx'
import {
  SectionTitle,
  Container,
  Card,
  Input,
  Select,
  Button,
  Alert,
  Loader,
} from '../../../ui/index.js'
import { leaguesRepository } from '../../../infrastructure/firestore.js'
import { useFirestoreCollection } from '../../../hooks/useFirestore.js'
import { useAuthContext } from '../../auth/context/AuthContext.jsx'
import { useToast } from '../../../context/ToastContext.jsx'
import { createCompetitionSlots } from '../../enrollment/services/competitionSlots.js'

const SUBMIT_TIMEOUT_MS = 2500

const FORMAT_OPTIONS = [
  { value: 'round_robin', label: 'Round Robin' },
  { value: 'knockout', label: 'Knockout' },
  { value: 'round_robin_knockout', label: 'Round Robin + Knockout' },
]

export default function LeagueCreatePage() {
  const navigate = useNavigate()
  const { user } = useAuthContext()
  const { showToast } = useToast()
  const { data: seasons, loading: seasonsLoading } = useFirestoreCollection('seasons', [
    orderBy('startDate', 'desc'),
  ])
  const [form, setForm] = useState({
    seasonId: '',
    name: '',
    format: '',
    numGroups: '',
    playersPerGroup: '',
    numPlayers: '',
    pointsPerWin: '3',
    pointsPerLoss: '0',
    tiered: false,
    tierMultipliers: [],
    promotionCount: '2',
    relegationCount: '2',
    rules: '',
  })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState(null)

  function validate() {
    const e = {}
    const needsGroups = form.format === 'round_robin' || form.format === 'round_robin_knockout'
    const needsPlayers = form.format === 'knockout'
    if (!form.seasonId) e.seasonId = 'Please select a season'
    if (!form.name.trim()) e.name = 'League name is required'
    if (!form.format) e.format = 'Please select a format'
    if (needsGroups) {
      const ng = Number(form.numGroups)
      const ppg = Number(form.playersPerGroup)
      if (!form.numGroups || Number.isNaN(ng) || ng < 1) {
        e.numGroups = 'Enter number of groups (min 1)'
      }
      if (!form.playersPerGroup || Number.isNaN(ppg) || ppg < 2) {
        e.playersPerGroup = 'Enter players per group (min 2)'
      }
    }
    if (needsPlayers) {
      const np = Number(form.numPlayers)
      if (!form.numPlayers || Number.isNaN(np) || np < 2 || np % 2 !== 0) {
        e.numPlayers = 'Enter number of players (min 2, must be even)'
      }
    }
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const fieldErrors = validate()
    if (Object.keys(fieldErrors).length) {
      setErrors(fieldErrors)
      return
    }
    setSubmitting(true)
    setServerError(null)
    try {
      const isRR = form.format === 'round_robin' || form.format === 'round_robin_knockout'
      const isKO = form.format === 'knockout'
      const numGroups = isRR ? Number(form.numGroups) : null
      const tierMultipliers =
        isRR && form.tiered && form.tierMultipliers.length ? form.tierMultipliers.map(Number) : null
      const payload = {
        seasonId: form.seasonId,
        name: form.name.trim(),
        format: form.format,
        numGroups,
        playersPerGroup: isRR ? Number(form.playersPerGroup) : null,
        pointsPerWin: isRR ? Number(form.pointsPerWin) : null,
        pointsPerLoss: isRR ? Number(form.pointsPerLoss) : null,
        numPlayers: isKO ? Number(form.numPlayers) : null,
        seededPlayerIds: isKO ? Array(Number(form.numPlayers)).fill(null) : null,
        tierMultipliers,
        promotionCount: isRR && form.tiered ? Number(form.promotionCount) : null,
        relegationCount: isRR && form.tiered ? Number(form.relegationCount) : null,
        rules: form.rules.trim() || null,
        organizerId: user.uid,
        status: 'draft',
      }

      const league = await leaguesRepository.create(payload)
      await createCompetitionSlots(payload, league.id, 'leagues')

      showToast({
        title: 'League created',
        message: 'Match slots generated — ready for draw and scheduling.',
        variant: 'success',
      })

      setSubmitting(false)
      navigate(`/leagues/${league.id}`)
      return
    } catch {
      setServerError('Failed to create league. Please try again.')
    }

    setSubmitting(false)
  }

  function handleChange(field, value) {
    setForm((p) => ({ ...p, [field]: value }))
    setErrors((p) => ({ ...p, [field]: undefined }))
  }

  const seasonOptions = seasons.map((s) => ({ value: s.id, label: s.name }))

  return (
    <AppLayout>
      <Container className="py-8">
        <SectionTitle title="New League" subtitle="Set up a new league within a season." />
        <div className="mt-8 max-w-lg">
          {serverError && (
            <Alert variant="error" className="mb-6">
              {serverError}
            </Alert>
          )}
          {seasonsLoading ? (
            <div className="flex justify-center py-16">
              <Loader />
            </div>
          ) : seasons.length === 0 ? (
            <Alert variant="info">
              No seasons exist yet.{' '}
              <a href="/seasons/create" className="font-medium underline">
                Create a season first.
              </a>
            </Alert>
          ) : (
            <Card>
              <form onSubmit={handleSubmit} className="space-y-5">
                <Select
                  label="Season"
                  name="seasonId"
                  placeholder="Select a season"
                  options={seasonOptions}
                  value={form.seasonId}
                  onChange={(e) => handleChange('seasonId', e.target.value)}
                  error={errors.seasonId}
                />
                <Input
                  label="League name"
                  name="name"
                  placeholder="e.g. Spring Open League 2026"
                  value={form.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  error={errors.name}
                />
                <Select
                  label="Format"
                  name="format"
                  placeholder="Select a format"
                  options={FORMAT_OPTIONS}
                  value={form.format}
                  onChange={(e) => handleChange('format', e.target.value)}
                  error={errors.format}
                />
                {(form.format === 'round_robin' || form.format === 'round_robin_knockout') && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="Number of groups"
                        name="numGroups"
                        type="number"
                        min="1"
                        value={form.numGroups}
                        onChange={(e) => {
                          const n = Number(e.target.value)
                          handleChange('numGroups', e.target.value)
                          if (form.tiered && n > 0) {
                            const prev = form.tierMultipliers
                            const next = Array.from({ length: n }, (_, i) => prev[i] ?? '')
                            setForm((p) => ({ ...p, tierMultipliers: next }))
                          }
                        }}
                        error={errors.numGroups}
                      />
                      <Input
                        label="Players per group"
                        name="playersPerGroup"
                        type="number"
                        min="2"
                        value={form.playersPerGroup}
                        onChange={(e) => handleChange('playersPerGroup', e.target.value)}
                        error={errors.playersPerGroup}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="Points per win"
                        name="pointsPerWin"
                        type="number"
                        min="0"
                        value={form.pointsPerWin}
                        onChange={(e) => handleChange('pointsPerWin', e.target.value)}
                      />
                      <Input
                        label="Points per loss"
                        name="pointsPerLoss"
                        type="number"
                        min="0"
                        value={form.pointsPerLoss}
                        onChange={(e) => handleChange('pointsPerLoss', e.target.value)}
                      />
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-primary"
                        checked={form.tiered}
                        onChange={(e) => {
                          const checked = e.target.checked
                          const n = Number(form.numGroups) || 0
                          setForm((p) => ({
                            ...p,
                            tiered: checked,
                            tierMultipliers:
                              checked && n > 0
                                ? Array.from({ length: n }, (_, i) => p.tierMultipliers[i] ?? '')
                                : [],
                          }))
                        }}
                      />
                      <span className="text-sm text-text">
                        Tiered groups (different ranking multipliers per group)
                      </span>
                    </label>

                    {form.tiered && (
                      <div className="rounded-md border border-slate-200 p-4 space-y-3">
                        <p className="text-xs font-medium text-text-light uppercase tracking-wide">
                          Ranking multipliers
                        </p>
                        {form.tierMultipliers.map((val, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <span className="text-sm text-text-light w-16">
                              Group {String.fromCharCode(65 + i)}
                            </span>
                            <Input
                              type="number"
                              min="0"
                              max="1"
                              step="0.05"
                              placeholder="e.g. 0.75"
                              value={val}
                              onChange={(e) => {
                                const next = [...form.tierMultipliers]
                                next[i] = e.target.value
                                setForm((p) => ({ ...p, tierMultipliers: next }))
                              }}
                              className="flex-1"
                            />
                          </div>
                        ))}
                        <div className="grid grid-cols-2 gap-4 pt-2">
                          <Input
                            label="Promotion (top N)"
                            type="number"
                            min="0"
                            value={form.promotionCount}
                            onChange={(e) => handleChange('promotionCount', e.target.value)}
                          />
                          <Input
                            label="Relegation (bottom N)"
                            type="number"
                            min="0"
                            value={form.relegationCount}
                            onChange={(e) => handleChange('relegationCount', e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}
                {form.format === 'knockout' && (
                  <Input
                    label="Number of players (bracket size)"
                    name="numPlayers"
                    type="number"
                    min="2"
                    step="2"
                    placeholder="e.g. 8, 16, 32"
                    value={form.numPlayers}
                    onChange={(e) => handleChange('numPlayers', e.target.value)}
                    error={errors.numPlayers}
                  />
                )}
                <Input
                  label="Rules (optional)"
                  name="rules"
                  placeholder="Any specific rules or notes..."
                  value={form.rules}
                  onChange={(e) => handleChange('rules', e.target.value)}
                />
                <div className="flex gap-3 pt-2">
                  <Button type="submit" loading={submitting} loadingLabel="Creating...">
                    Create League
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => navigate(-1)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </Card>
          )}
        </div>
      </Container>
    </AppLayout>
  )
}
