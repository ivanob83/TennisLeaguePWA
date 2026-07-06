import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import AppLayout from '../../../layouts/AppLayout.jsx'
import { SectionTitle, Container, Card, Input, Button, Alert, Loader } from '../../../ui/index.js'
import { seasonsRepository } from '../../../infrastructure/firestore.js'
import { useFirestoreDoc } from '../../../hooks/useFirestore.js'
import { useToast } from '../../../context/ToastContext.jsx'

const SUBMIT_TIMEOUT_MS = 2500

export default function SeasonEditPage() {
  const { seasonId } = useParams()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { data: season, loading: seasonLoading } = useFirestoreDoc('seasons', seasonId)
  const [form, setForm] = useState(null)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState(null)

  useEffect(() => {
    if (season && !form) {
      setForm({
        name: season.name || '',
        startDate: season.startDate || '',
        endDate: season.endDate || '',
      })
    }
  }, [season, form])

  function validate() {
    const e = {}
    if (!form.name.trim()) e.name = 'Season name is required'
    if (!form.startDate) e.startDate = 'Start date is required'
    if (!form.endDate) e.endDate = 'End date is required'
    if (form.startDate && form.endDate && form.endDate <= form.startDate) {
      e.endDate = 'End date must be after start date'
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
      const payload = {
        name: form.name.trim(),
        startDate: form.startDate,
        endDate: form.endDate,
      }
      const updatePromise = seasonsRepository.update(seasonId, payload)
      const result = await Promise.race([
        updatePromise.then(() => 'ok'),
        new Promise((resolve) => setTimeout(() => resolve('timeout'), SUBMIT_TIMEOUT_MS)),
      ])
      if (result === 'timeout') {
        updatePromise.catch(() => {})
        showToast({ title: 'Season updated', message: 'Saving in background.', variant: 'info' })
      } else {
        showToast({ title: 'Season updated', message: 'Changes saved.', variant: 'success' })
      }
      setSubmitting(false)
      navigate('/seasons')
      return
    } catch {
      setServerError('Failed to update season. Please try again.')
    }
    setSubmitting(false)
  }

  function handleChange(field, value) {
    setForm((p) => ({ ...p, [field]: value }))
    setErrors((p) => ({ ...p, [field]: undefined }))
  }

  if (seasonLoading || !form) {
    return (
      <AppLayout>
        <div className="flex justify-center py-24">
          <Loader />
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <Container className="py-8">
        <div className="mb-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/seasons')}>
            ← Back to Seasons
          </Button>
        </div>
        <SectionTitle title="Edit Season" subtitle={season?.name} />
        <div className="mt-8 max-w-lg">
          {serverError && (
            <Alert variant="error" className="mb-6">
              {serverError}
            </Alert>
          )}
          <Card>
            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                label="Season name"
                name="name"
                placeholder="e.g. 2026 or 2026 Spring"
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                error={errors.name}
              />
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
              <div className="flex gap-3 pt-2">
                <Button type="submit" loading={submitting} loadingLabel="Saving...">
                  Save changes
                </Button>
                <Button type="button" variant="ghost" onClick={() => navigate('/seasons')}>
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </Container>
    </AppLayout>
  )
}
