import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../../../layouts/AppLayout.jsx'
import {
  SectionTitle,
  Container,
  Card,
  Input,
  Button,
  Alert,
} from '../../../ui/index.js'
import { seasonsRepository } from '../../../infrastructure/firestore.js'
import { useAuthContext } from '../../auth/context/AuthContext.jsx'
import { useToast } from '../../../context/ToastContext.jsx'

const SUBMIT_TIMEOUT_MS = 2500

export default function SeasonCreatePage() {
  const navigate = useNavigate()
  const { user } = useAuthContext()
  const { showToast } = useToast()
  const [form, setForm] = useState({ name: '', startDate: '', endDate: '' })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState(null)

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
    if (Object.keys(fieldErrors).length) { setErrors(fieldErrors); return }
    setSubmitting(true)
    setServerError(null)
    try {
      const payload = {
        name: form.name.trim(),
        startDate: form.startDate,
        endDate: form.endDate,
        createdBy: user.uid,
        status: 'active',
      }

      const createPromise = seasonsRepository.create(payload)
      const timedResult = await Promise.race([
        createPromise.then(() => 'ok'),
        new Promise((resolve) => setTimeout(() => resolve('timeout'), SUBMIT_TIMEOUT_MS)),
      ])

      // If Firestore ack is delayed but write is already queued locally, unblock UX.
      if (timedResult === 'timeout') {
        createPromise.catch(() => {})
        showToast({
          title: 'Season created',
          message: 'Saving is still syncing in background.',
          variant: 'info',
        })
      } else {
        showToast({
          title: 'Season created',
          message: 'New season is ready.',
          variant: 'success',
        })
      }

      setSubmitting(false)
      navigate('/seasons')
      return
    } catch {
      setServerError('Failed to create season. Please try again.')
    }

    setSubmitting(false)
  }

  function handleChange(field, value) {
    setForm(p => ({ ...p, [field]: value }))
    setErrors(p => ({ ...p, [field]: undefined }))
  }

  return (
    <AppLayout>
      <Container className="py-8">
        <SectionTitle title="New Season" subtitle="Create a yearly competition container." />
        <div className="mt-8 max-w-lg">
        {serverError && <Alert variant="error" className="mb-6">{serverError}</Alert>}
        <Card>
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Season name"
              name="name"
              placeholder="e.g. 2026 or 2026 Spring"
              value={form.name}
              onChange={e => handleChange('name', e.target.value)}
              error={errors.name}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Start date"
                name="startDate"
                type="date"
                value={form.startDate}
                onChange={e => handleChange('startDate', e.target.value)}
                error={errors.startDate}
              />
              <Input
                label="End date"
                name="endDate"
                type="date"
                value={form.endDate}
                onChange={e => handleChange('endDate', e.target.value)}
                error={errors.endDate}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" loading={submitting} loadingLabel="Creating...">
                Create Season
              </Button>
              <Button type="button" variant="ghost" onClick={() => navigate(-1)}>
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
