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
import { tournamentsRepository } from '../../../infrastructure/firestore.js'
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

export default function TournamentCreatePage() {
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
    startDate: '',
    endDate: '',
    rules: '',
  })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState(null)

  const selectedSeason = seasons.find((s) => s.id === form.seasonId) ?? null

  function validate() {
    const e = {}
    const needsGroups = form.format === 'round_robin' || form.format === 'round_robin_knockout'
    const needsPlayers = form.format === 'knockout'
    if (!form.seasonId) e.seasonId = 'Please select a season'
    if (!form.name.trim()) e.name = 'Tournament name is required'
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
    if (!form.startDate) e.startDate = 'Start date is required'
    if (!form.endDate) e.endDate = 'End date is required'
    if (form.startDate && form.endDate && form.endDate <= form.startDate) {
      e.endDate = 'End date must be after start date'
    }
    if (selectedSeason) {
      if (form.startDate && form.startDate < selectedSeason.startDate) {
        e.startDate = 'Start date must be within the selected season'
      }
      if (form.endDate && form.endDate > selectedSeason.endDate) {
        e.endDate = 'End date must be within the selected season'
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
      const payload = {
        seasonId: form.seasonId,
        name: form.name.trim(),
        format: form.format,
        numGroups: isRR ? Number(form.numGroups) : null,
        playersPerGroup: isRR ? Number(form.playersPerGroup) : null,
        pointsPerWin: isRR ? Number(form.pointsPerWin) : null,
        pointsPerLoss: isRR ? Number(form.pointsPerLoss) : null,
        numPlayers: isKO ? Number(form.numPlayers) : null,
        seededPlayerIds: isKO ? Array(Number(form.numPlayers)).fill(null) : null,
        startDate: form.startDate,
        endDate: form.endDate,
        rules: form.rules.trim() || null,
        organizerId: user.uid,
        status: 'draft',
      }

      const tournament = await tournamentsRepository.create(payload)
      await createCompetitionSlots(payload, tournament.id, 'tournaments')

      showToast({
        title: 'Tournament created',
        message: 'Match slots generated — ready for draw and scheduling.',
        variant: 'success',
      })

      setSubmitting(false)
      navigate(`/tournaments/${tournament.id}`)
      return
    } catch {
      setServerError('Failed to create tournament. Please try again.')
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
        <SectionTitle title="New Tournament" subtitle="Create a tournament within a season." />
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
                  label="Tournament name"
                  name="name"
                  placeholder="e.g. Summer Slam 2026"
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
                        onChange={(e) => handleChange('numGroups', e.target.value)}
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
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Start date"
                    name="startDate"
                    type="date"
                    value={form.startDate}
                    onChange={(e) => handleChange('startDate', e.target.value)}
                    error={errors.startDate}
                  />
                  <Input
                    label="End date"
                    name="endDate"
                    type="date"
                    value={form.endDate}
                    onChange={(e) => handleChange('endDate', e.target.value)}
                    error={errors.endDate}
                  />
                </div>
                <Input
                  label="Rules (optional)"
                  name="rules"
                  placeholder="Any specific rules or notes..."
                  value={form.rules}
                  onChange={(e) => handleChange('rules', e.target.value)}
                />
                <div className="flex gap-3 pt-2">
                  <Button type="submit" loading={submitting} loadingLabel="Creating...">
                    Create Tournament
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
