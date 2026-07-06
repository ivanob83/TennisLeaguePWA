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
  AvatarUpload,
} from '../../../ui/index.js'
import { playersRepository } from '../../../infrastructure/firestore.js'
import { uploadPlayerAvatar } from '../../../infrastructure/avatar.js'
import { useAuthContext } from '../../auth/context/AuthContext.jsx'
import { useToast } from '../../../context/ToastContext.jsx'

const SUBMIT_TIMEOUT_MS = 2500

export default function PlayerCreatePage() {
  const navigate = useNavigate()
  const { user } = useAuthContext()
  const { showToast } = useToast()

  const [name, setName] = useState('')
  const [nameError, setNameError] = useState(null)
  const [avatarUrls, setAvatarUrls] = useState(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarError, setAvatarError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState(null)

  // Called by AvatarUpload after user confirms crop.
  // At this point we don't have a playerId yet — we use a temp key and re-upload after create,
  // OR we create the player first with a placeholder, then upload, then update.
  // Simpler: upload to a temp path using uid + timestamp, then move on submit.
  // Simplest: generate a stable tempId client-side and always use it.
  const [tempId] = useState(() => `tmp_${user.uid}_${Date.now()}`)

  async function handleCrop(imageSrc, croppedAreaPixels) {
    setAvatarUploading(true)
    setAvatarError(null)
    try {
      const urls = await uploadPlayerAvatar(tempId, imageSrc, croppedAreaPixels)
      setAvatarUrls(urls)
    } catch (err) {
      console.error(err)
      setAvatarError('Failed to upload avatar. Please try again.')
    } finally {
      setAvatarUploading(false)
    }
  }

  function handleRemoveAvatar() {
    setAvatarUrls(null)
    setAvatarError(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) {
      setNameError('Player name is required')
      return
    }
    setNameError(null)
    setSubmitting(true)
    setServerError(null)

    try {
      const payload = {
        name: name.trim(),
        avatarUrls: avatarUrls || null,
        authUid: null,
        createdBy: user.uid,
      }

      const createPromise = playersRepository.create(payload)
      const timedResult = await Promise.race([
        createPromise.then(() => 'ok'),
        new Promise((resolve) => setTimeout(() => resolve('timeout'), SUBMIT_TIMEOUT_MS)),
      ])

      if (timedResult === 'timeout') {
        createPromise.catch(() => {})
        showToast({
          title: 'Player created',
          message: 'Saving is still syncing in background.',
          variant: 'info',
        })
      } else {
        showToast({
          title: 'Player created',
          message: `${name.trim()} has been added.`,
          variant: 'success',
        })
      }

      navigate('/players')
    } catch {
      setServerError('Failed to create player. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AppLayout>
      <Container className="py-8">
        <SectionTitle title="New Player" subtitle="Add a player to the system." />
        <div className="mt-8 max-w-lg">
          {serverError && (
            <Alert variant="error" className="mb-6">
              {serverError}
            </Alert>
          )}
          <Card>
            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                label="Full name"
                name="name"
                placeholder="e.g. Novak Djokovic"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  if (nameError) setNameError(null)
                }}
                error={nameError}
              />

              <AvatarUpload
                name={name}
                value={avatarUrls}
                onCrop={handleCrop}
                onRemove={handleRemoveAvatar}
                uploading={avatarUploading}
                error={avatarError}
                disabled={submitting}
              />

              <div className="flex gap-3 pt-2">
                <Button type="submit" loading={submitting} loadingLabel="Creating...">
                  Create Player
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
