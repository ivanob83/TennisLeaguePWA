import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../../../layouts/AppLayout.jsx'
import { Container, SectionTitle, Card, Button, Input, Alert } from '../../../ui/index.js'
import { useAuthContext } from '../../auth/context/AuthContext.jsx'
import { useToast } from '../../../context/ToastContext.jsx'
import { newsRepository } from '../../../infrastructure/firestore.js'

export default function NewsCreatePage() {
  const navigate = useNavigate()
  const { user, profile, isEditor } = useAuthContext()
  const { showToast } = useToast()

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  if (!isEditor) {
    return (
      <AppLayout>
        <Container className="py-8">
          <Alert variant="error">You do not have permission to create news articles.</Alert>
        </Container>
      </AppLayout>
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim()) {
      setError('Title is required.')
      return
    }
    if (!content.trim()) {
      setError('Content is required.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      await newsRepository.create({
        title: title.trim(),
        content: content.trim(),
        authorId: user?.uid || null,
        authorName: profile?.displayName || user?.email || null,
      })
      showToast({
        title: 'Article published',
        message: 'News article created.',
        variant: 'success',
      })
      navigate('/news')
    } catch (err) {
      setError('Failed to publish article. Please try again.')
      setSaving(false)
    }
  }

  return (
    <AppLayout>
      <Container className="py-8">
        <div className="mb-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/news')}>
            ← Back to News
          </Button>
        </div>

        <SectionTitle title="New Article" subtitle="Publish an announcement" />

        <div className="mt-8 max-w-lg">
          <Card>
            {error && (
              <Alert variant="error" className="mb-4">
                {error}
              </Alert>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Article title"
                required
              />
              <div>
                <label className="mb-1 block text-sm font-medium text-text">Content</label>
                <textarea
                  className="w-full border border-slate-200 bg-white px-3 py-2 text-sm text-text placeholder-text-light focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  rows={8}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write the article content..."
                  required
                />
              </div>
              <div className="border-t border-slate-100 pt-4">
                <Button type="submit" loading={saving} loadingLabel="Publishing...">
                  Publish article
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </Container>
    </AppLayout>
  )
}
