import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AppLayout from '../../../layouts/AppLayout.jsx'
import {
  SectionTitle,
  Container,
  Card,
  Input,
  Button,
  Alert,
  Loader,
  AvatarUpload,
} from '../../../ui/index.js'
import { playersRepository } from '../../../infrastructure/firestore.js'
import { uploadPlayerAvatar } from '../../../infrastructure/avatar.js'
import { useToast } from '../../../context/ToastContext.jsx'
import { useAuthContext } from '../../auth/context/AuthContext.jsx'

export default function PlayerEditPage() {
  const { playerId } = useParams()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { isEditor, linkedPlayer } = useAuthContext()
  const isOwnProfile = linkedPlayer?.id === playerId

  if (!isEditor && !isOwnProfile) {
    return (
      <AppLayout>
        <Container className="py-8">
          <p className="text-sm text-text-light">You don't have permission to edit this player.</p>
        </Container>
      </AppLayout>
    )
  }

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState(null)

  const [name, setName] = useState('')
  const [nameError, setNameError] = useState(null)
  const [avatarUrls, setAvatarUrls] = useState(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarError, setAvatarError] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const player = await playersRepository.getById(playerId)
        if (!player) { setServerError('Player not found.'); setLoading(false); return }
        setName(player.name || '')
        setAvatarUrls(player.avatarUrls || null)
      } catch {
        setServerError('Failed to load player.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [playerId])

  async function handleCrop(imageSrc, croppedAreaPixels) {
    setAvatarUploading(true)
    setAvatarError(null)
    try {
      const urls = await uploadPlayerAvatar(playerId, imageSrc, croppedAreaPixels)
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
    if (!name.trim()) { setNameError('Player name is required'); return }
    setNameError(null)
    setSubmitting(true)
    setServerError(null)
    try {
      await playersRepository.update(playerId, {
        name: name.trim(),
        avatarUrls: avatarUrls || null,
      })
      showToast({ title: 'Player updated', message: `${name.trim()} has been saved.`, variant: 'success' })
      navigate('/players')
    } catch {
      setServerError('Failed to update player. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AppLayout>
      <Container className="py-8">
        <SectionTitle title="Edit Player" subtitle="Update player details." />
        <div className="mt-8 max-w-lg">
          {serverError && <Alert variant="error" className="mb-6">{serverError}</Alert>}

          {loading ? (
            <div className="flex justify-center py-16"><Loader /></div>
          ) : (
            <Card>
              <form onSubmit={handleSubmit} className="space-y-5">
                <Input
                  label="Full name"
                  name="name"
                  placeholder="e.g. Novak Djokovic"
                  value={name}
                  onChange={e => { setName(e.target.value); if (nameError) setNameError(null) }}
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
                  <Button type="submit" loading={submitting} loadingLabel="Saving...">
                    Save Changes
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => navigate('/players')}>
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
