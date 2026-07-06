import { useParams, useNavigate } from 'react-router-dom'
import AppLayout from '../../../layouts/AppLayout.jsx'
import { Container, Card, Button, Loader } from '../../../ui/index.js'
import { useFirestoreDoc } from '../../../hooks/useFirestore.js'
import { useAuthContext } from '../../auth/context/AuthContext.jsx'
import { useToast } from '../../../context/ToastContext.jsx'
import { newsRepository } from '../../../infrastructure/firestore.js'

function formatDate(val) {
  if (!val) return ''
  const d = val?.toDate ? val.toDate() : new Date(val)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function NewsDetailPage() {
  const { articleId } = useParams()
  const navigate = useNavigate()
  const { isEditor } = useAuthContext()
  const { showToast } = useToast()
  const { data: article, loading } = useFirestoreDoc('news', articleId)

  async function handleDelete() {
    if (!window.confirm('Delete this article?')) return
    try {
      await newsRepository.delete(articleId)
      showToast({ title: 'Article deleted', variant: 'success' })
      navigate('/news')
    } catch {
      showToast({ title: 'Delete failed', message: 'Please try again.', variant: 'error' })
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex justify-center py-24">
          <Loader />
        </div>
      </AppLayout>
    )
  }

  if (!article) {
    return (
      <AppLayout>
        <Container className="py-8">
          <p className="py-16 text-center text-text-light">Article not found.</p>
        </Container>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <Container className="py-8">
        <div className="mb-2 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate('/news')}>
            ← Back to News
          </Button>
          {isEditor && (
            <Button
              variant="ghost"
              size="sm"
              className="text-rose-500 hover:text-rose-600"
              onClick={handleDelete}
            >
              Delete
            </Button>
          )}
        </div>

        <div className="mt-4 max-w-2xl">
          <Card>
            <p className="mb-1 text-xs text-text-light">
              {formatDate(article.createdAt)}
              {article.authorName && ` · ${article.authorName}`}
            </p>
            <h1 className="font-heading text-2xl font-bold text-text">{article.title}</h1>
            <div className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-text">
              {article.content}
            </div>
          </Card>
        </div>
      </Container>
    </AppLayout>
  )
}
