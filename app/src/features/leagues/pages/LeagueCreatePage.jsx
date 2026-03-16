import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { orderBy } from 'firebase/firestore'
import AppLayout from '../../../layouts/AppLayout.jsx'
import {
  SectionTitle,
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
  const { data: seasons, loading: seasonsLoading } = useFirestoreCollection('seasons', [orderBy('startDate', 'desc')])
  const [form, setForm] = useState({
    seasonId: '',
    name: '',
    format: '',
    numGroups: '',
    playersPerGroup: '',
    rules: '',
  })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState(null)

  function validate() {
    const e = {}
    const needsGroups = form.format === 'round_robin' || form.format === 'round_robin_knockout'
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
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const fieldErrors = validate()
    if (Object.keys(fieldErrors).length) { setErrors(fieldErrors); return }
    setSubmitting(true)
    setServerError(null)
    try {
      const payload = {
        seasonId: form.seasonId,
        name: form.name.trim(),
        format: form.format,
        numGroups:
          form.format === 'round_robin' || form.format === 'round_robin_knockout'
            ? Number(form.numGroups)
            : null,
        playersPerGroup:
          form.format === 'round_robin' || form.format === 'round_robin_knockout'
            ? Number(form.playersPerGroup)
            : null,
        rules: form.rules.trim() || null,
        organizerId: user.uid,
        status: 'draft',
      }

      const createPromise = leaguesRepository.create(payload)
      const timedResult = await Promise.race([
        createPromise.then(() => 'ok'),
        new Promise((resolve) => setTimeout(() => resolve('timeout'), SUBMIT_TIMEOUT_MS)),
      ])

      // If backend ack is slow, continue with optimistic UX and let write finish.
      if (timedResult === 'timeout') {
        createPromise.catch(() => {})
        showToast({
          title: 'League created',
          message: 'Saving is still syncing in background.',
          variant: 'info',
        })
      } else {
        showToast({
          title: 'League created',
          message: 'Competition is ready for setup and draw.',
          variant: 'success',
        })
      }

      setSubmitting(false)
      navigate('/competitions')
      return
    } catch {
      setServerError('Failed to create league. Please try again.')
    }

    setSubmitting(false)
  }

  function handleChange(field, value) {
    setForm(p => ({ ...p, [field]: value }))
    setErrors(p => ({ ...p, [field]: undefined }))
  }

  const seasonOptions = seasons.map(s => ({ value: s.id, label: s.name }))

  return (
    <AppLayout>
      <SectionTitle title="New League" subtitle="Set up a new league within a season." />
      <div className="mx-auto max-w-lg px-6 py-8">
        {serverError && <Alert variant="error" className="mb-6">{serverError}</Alert>}
        {seasonsLoading ? (
          <div className="flex justify-center py-16"><Loader /></div>
        ) : seasons.length === 0 ? (
          <Alert variant="info">
            No seasons exist yet.{' '}
            <a href="/seasons/create" className="font-medium underline">Create a season first.</a>
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
                onChange={e => handleChange('seasonId', e.target.value)}
                error={errors.seasonId}
              />
              <Input
                label="League name"
                name="name"
                placeholder="e.g. Spring Open League 2026"
                value={form.name}
                onChange={e => handleChange('name', e.target.value)}
                error={errors.name}
              />
              <Select
                label="Format"
                name="format"
                placeholder="Select a format"
                options={FORMAT_OPTIONS}
                value={form.format}
                onChange={e => handleChange('format', e.target.value)}
                error={errors.format}
              />
              {(form.format === 'round_robin' || form.format === 'round_robin_knockout') && (
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Number of groups"
                    name="numGroups"
                    type="number"
                    min="1"
                    value={form.numGroups}
                    onChange={e => handleChange('numGroups', e.target.value)}
                    error={errors.numGroups}
                  />
                  <Input
                    label="Players per group"
                    name="playersPerGroup"
                    type="number"
                    min="2"
                    value={form.playersPerGroup}
                    onChange={e => handleChange('playersPerGroup', e.target.value)}
                    error={errors.playersPerGroup}
                  />
                </div>
              )}
              <Input
                label="Rules (optional)"
                name="rules"
                placeholder="Any specific rules or notes..."
                value={form.rules}
                onChange={e => handleChange('rules', e.target.value)}
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
    </AppLayout>
  )
}
