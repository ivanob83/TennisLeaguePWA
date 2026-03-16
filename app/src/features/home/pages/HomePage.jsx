import { Link } from 'react-router-dom'
import { useAuthContext } from '../../auth/context/AuthContext.jsx'
import AppLayout from '../../../layouts/AppLayout.jsx'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  SectionTitle,
} from '../../../ui/index.js'

export default function HomePage() {
  const { isAuthenticated } = useAuthContext()

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl px-6 py-section">
        <SectionTitle
          className="justify-center text-center"
          title="Tennis League PWA"
          subtitle="Track matches, rankings, and league updates"
          eyebrow="Welcome"
        />

        {/* CTA */}
        <div className="mt-12 flex justify-center gap-4">
          {isAuthenticated ? (
            <Link to="/dashboard">
              <Button size="lg">Go to Dashboard</Button>
            </Link>
          ) : (
            <>
              <Link to="/login">
                <Button size="lg">Sign In</Button>
              </Link>
              <Link to="/register">
                <Button variant="outline" size="lg">Sign Up</Button>
              </Link>
            </>
          )}
        </div>

        {/* Features */}
        <div className="mt-16 grid gap-8 md:grid-cols-3">
          <Card className="text-center">
            <CardHeader>
              <p className="mb-4 text-4xl">📅</p>
              <CardTitle>Schedule Matches</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Organize rounds and track your upcoming games
              </CardDescription>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardHeader>
              <p className="mb-4 text-4xl">🏆</p>
              <CardTitle>Track Rankings</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Live standings and player performance stats
              </CardDescription>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardHeader>
              <p className="mb-4 text-4xl">📱</p>
              <CardTitle>Offline Ready</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Works even without internet connection
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  )
}
