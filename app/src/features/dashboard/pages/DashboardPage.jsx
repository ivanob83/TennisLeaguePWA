import { useAuthContext } from '../../auth/context/AuthContext.jsx'
import { Link } from 'react-router-dom'
import AppLayout from '../../../layouts/AppLayout.jsx'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  SectionTitle,
  Container,
} from '../../../ui/index.js'

export default function DashboardPage() {
  const { user, loading } = useAuthContext()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-600">Loading...</p>
      </div>
    )
  }

  return (
    <AppLayout>
      <Container className="py-section">
        <SectionTitle
          title="Dashboard"
          subtitle={`Welcome back, ${user?.email || 'User'}!`}
        />
        <div className="mt-8">

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>My Leagues</CardTitle>
              <CardDescription>View and manage your leagues</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-primary">0</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Upcoming Matches</CardTitle>
              <CardDescription>Your scheduled matches</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-primary">0</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ranking</CardTitle>
              <CardDescription>Your current position</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-primary">-</p>
            </CardContent>
          </Card>
        </div>

        </div>

        <div className="mt-8">
          <Link to="/profile" className="text-primary hover:text-primary-dark">
            View Profile →
          </Link>
        </div>
      </Container>
    </AppLayout>
  )
}
