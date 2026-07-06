import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
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
  ImageUpload,
} from '../../../ui/index.js'
import { tournamentsRepository } from '../../../infrastructure/firestore.js'
import { uploadCompetitionImage } from '../../../infrastructure/avatar.js'
import { useFirestoreDoc } from '../../../hooks/useFirestore.js'
import { useFirestoreCollection } from '../../../hooks/useFirestore.js'
import { useToast } from '../../../context/ToastContext.jsx'

const FORMAT_OPTIONS = [
  { value: 'round_robin', label: 'Round Robin' },
  { value: 'knockout', label: 'Knockout' },
  { value: 'round_robin_knockout', label: 'Round Robin + Knockout' },
]

const SUBMIT_TIMEOUT_MS = 2500

export default function TournamentEditPage() {
  const { tournamentId } = useParams()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { data: tournament, loading: tournamentLoading } = useFirestoreDoc(
    'tournaments',
    tournamentId,
  )
  const { data: seasons } = useFirestoreCollection('seasons', [orderBy('startDate', 'desc')])
  const [form, setForm] = useState(null)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState(null)
  const [imageUrls, setImageUrls] = useState(null)
  const [imageUploading, setImageUploading] = useState(false)
  const [imageError, setImageError] = useState(null)

  useEffect(() => {
    if (tournament && !form) {
      setForm({
        name: tournament.name || '',
        seasonId: tournament.seasonId || '',
        format: tournament.format || '',
        numGroups: tournament.numGroups != null ? String(tournament.numGroups) : '',
        playersPerGroup:
          tournament.playersPerGroup != null ? String(tournament.playersPerGroup) : '',
        startDate: tournament.startDate || '',
        endDate: tournament.endDate || '',
        rules: tournament.rules || '',
      })
      setImageUrls(tournament.imageUrls || null)
    }
  }, [tournament, form])

  function validate() {
    const e = {}
    if (!form.name.trim()) e.name = 'Tournament name is required'
    if (!form.seasonId) e.seasonId = 'Please select a season'
    if (!form.format) e.format = 'Please select a format'
    const needsGroups = form.format === 'round_robin' || form.format === 'round_robin_knockout'
    if (needsGroups) {
      const ng = Number(form.numGroups)
      const ppg = Number(form.playersPerGroup)
      if (!form.numGroups || Number.isNaN(ng) || ng < 1)
        e.numGroups = 'Enter number of groups (min 1)'
      if (!form.playersPerGroup || Number.isNaN(ppg) || ppg < 2)
        e.playersPerGroup = 'Enter players per group (min 2)'
    }
    if (!form.startDate) e.startDate = 'Start date is required'
    if (!form.endDate) e.endDate = 'End date is required'
    if (form.startDate && form.endDate && form.endDate <= form.startDate) {
      e.endDate = 'End date must be after start date'
    }
    const selectedSeason = seasons.find((s) => s.id === form.seasonId)
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

  async function handleImageCrop(imageSrc, croppedAreaPixels) {
    setImageUploading(true)
    setImageError(null)
    try {
      const urls = await uploadCompetitionImage(tournamentId, imageSrc, croppedAreaPixels)
      setImageUrls(urls)
    } catch (err) {
      console.error(err)
      setImageError('Failed to upload image. Please try again.')
    } finally {
      setImageUploading(false)
    }
  }

  function handleRemoveImage() {
    setImageUrls(null)
    setImageError(null)
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
      const needsGroups = form.format === 'round_robin' || form.format === 'round_robin_knockout'
      const payload = {
        name: form.name.trim(),
        seasonId: form.seasonId,
        format: form.format,
        numGroups: needsGroups ? Number(form.numGroups) : null,
        playersPerGroup: needsGroups ? Number(form.playersPerGroup) : null,
        startDate: form.startDate,
        endDate: form.endDate,
        rules: form.rules.trim() || null,
        imageUrls: imageUrls || null,
      }
      const updatePromise = tournamentsRepository.update(tournamentId, payload)
      const result = await Promise.race([
        updatePromise.then(() => 'ok'),
        new Promise((resolve) => setTimeout(() => resolve('timeout'), SUBMIT_TIMEOUT_MS)),
      ])
      if (result === 'timeout') {
        updatePromise.catch(() => {})
        showToast({
          title: 'Tournament updated',
          message: 'Saving in background.',
          variant: 'info',
        })
      } else {
        showToast({ title: 'Tournament updated', message: 'Changes saved.', variant: 'success' })
      }
      setSubmitting(false)
      navigate(`/tournaments/${tournamentId}`)
      return
    } catch {
      setServerError('Failed to update tournament. Please try again.')
    }
    setSubmitting(false)
  }

  function handleChange(field, value) {
    setForm((p) => ({ ...p, [field]: value }))
    setErrors((p) => ({ ...p, [field]: undefined }))
  }

  if (tournamentLoading || !form) {
    return (
      <AppLayout>
        <div className="flex justify-center py-24">
          <Loader />
        </div>
      </AppLayout>
    )
  }

  const seasonOptions = seasons.map((s) => ({ value: s.id, label: s.name }))
  const needsGroups = form.format === 'round_robin' || form.format === 'round_robin_knockout'

  return (
    <AppLayout>
      <Container className="py-8">
        <div className="mb-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/tournaments/${tournamentId}`)}
          >
            ← Back to Tournament
          </Button>
        </div>
        <SectionTitle title="Edit Tournament" subtitle={tournament?.name} />
        <div className="mt-8 max-w-lg">
          {serverError && (
            <Alert variant="error" className="mb-6">
              {serverError}
            </Alert>
          )}
          <Card>
            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                label="Tournament name"
                name="name"
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                error={errors.name}
              />
              <Select
                label="Season"
                name="seasonId"
                placeholder="Select a season"
                options={seasonOptions}
                value={form.seasonId}
                onChange={(e) => handleChange('seasonId', e.target.value)}
                error={errors.seasonId}
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
              {needsGroups && (
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
                value={form.rules}
                onChange={(e) => handleChange('rules', e.target.value)}
              />
              <ImageUpload
                value={imageUrls}
                onCrop={handleImageCrop}
                onRemove={handleRemoveImage}
                uploading={imageUploading}
                error={imageError}
                disabled={submitting}
              />
              <div className="flex gap-3 pt-2">
                <Button type="submit" loading={submitting} loadingLabel="Saving...">
                  Save changes
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => navigate(`/tournaments/${tournamentId}`)}
                >
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
