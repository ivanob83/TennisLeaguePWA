import { Link, useNavigate } from 'react-router-dom'
import AppLayout from '../../../layouts/AppLayout.jsx'
import { Container, SectionTitle, Card, Button, Loader } from '../../../ui/index.js'
import { useFirestoreCollection } from '../../../hooks/useFirestore.js'
import { useAuthContext } from '../../auth/context/AuthContext.jsx'
import { orderBy } from 'firebase/firestore'

function formatDate(val) {
  if (!val) return ''
  const d = val?.toDate ? val.toDate() : new Date(val)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function NewsPage() {
  const navigate = useNavigate()
  const { isEditor } = useAuthContext()
  const { data: articles, loading } = useFirestoreCollection('news', [orderBy('createdAt', 'desc')])

  return (
    <AppLayout>
      <Container className="py-8">
        <SectionTitle
          title="News"
          subtitle="Announcements and updates"
          action={
            isEditor && (
              <Button size="sm" onClick={() => navigate('/news/create')}>
                New article
              </Button>
            )
          }
        />

        <div className="mt-8">
          {loading ? (
            <div className="flex justify-center py-16"><Loader /></div>
          ) : !articles.length ? (
            <Card>
              <p className="text-sm text-text-light">No news articles yet.</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {articles.map(article => (
                <Link
                  key={article.id}
                  to={`/news/${article.id}`}
                  className="block transition-colors hover:bg-background-light"
                >
                  <Card>
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="font-heading text-base font-semibold text-text">
                          {article.title}
                        </h3>
                        <p className="mt-1 line-clamp-2 text-sm text-text-light">
                          {article.content}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-text-light">
                        {formatDate(article.createdAt)}
                      </span>
                    </div>
                    {article.authorName && (
                      <p className="mt-2 text-xs text-text-light">By {article.authorName}</p>
                    )}
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </Container>
    </AppLayout>
  )
}
