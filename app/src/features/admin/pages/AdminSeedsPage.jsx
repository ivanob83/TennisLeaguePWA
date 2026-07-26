import { Link } from 'react-router-dom'
import { FlaskConical, Wrench } from 'lucide-react'
import AppLayout from '../../../layouts/AppLayout.jsx'
import { SectionTitle, Container, Card, Badge, Button } from '../../../ui/index.js'
import { useAuthContext } from '../../auth/context/AuthContext.jsx'

const SEEDS = [
  {
    id: 'playopen-2022',
    name: 'PLAYOPEN Jun 2022',
    description:
      'Round Robin + Knockout. 16 players, 4 groups of 4. All group results + SF and Final entered.',
    path: '/admin/seed/playopen-2022',
    tags: ['tournament', 'round_robin_knockout'],
  },
  {
    id: 'play-liga-2025',
    name: 'PLAYOFF 2025',
    description:
      'Round Robin + Knockout. 8 players, 2 groups of 4. All group results + SF and Final entered.',
    path: '/admin/seed/play-liga-2025',
    tags: ['league', 'round_robin_knockout'],
  },
  {
    id: 'play-liga-2025-ciklus1',
    name: 'Play Liga 2025 — Ciklus 1',
    description:
      'Round Robin, 3 tiered groups (A=100%, B=75%, C=50%). 7+8+8 players. Promotion/relegation top/bottom 2.',
    path: '/admin/seed/play-liga-2025-ciklus1',
    tags: ['league', 'round_robin', 'tiered'],
  },
  {
    id: 'play-liga-2025-ciklus2',
    name: 'Play Liga 2025 — Ciklus 2',
    description:
      'Round Robin, 3 tiered groups (A=100%, B=75%, C=50%). 7+8+7 players. 3pts/1pt format.',
    path: '/admin/seed/play-liga-2025-ciklus2',
    tags: ['league', 'round_robin', 'tiered'],
  },
  {
    id: 'play-liga-2025-ciklus3',
    name: 'Play Liga 2025 — Ciklus 3',
    description:
      'Round Robin, 3 tiered groups (A=100%, B=75%, C=50%). 8+8+6 players. 3pts/1pt format.',
    path: '/admin/seed/play-liga-2025-ciklus3',
    tags: ['league', 'round_robin', 'tiered'],
  },
  {
    id: 'play-liga-2026-ciklus2',
    name: 'Play Liga 2026 — Ciklus 2',
    description:
      'Round Robin, 2 tiered groups (Grupa 1=100%, Grupa 2=75%). 10+10 players. Prazan raspored (not scheduled). Roster iz Ciklusa 1.',
    path: '/admin/seed/play-liga-2026-ciklus2',
    tags: ['league', 'round_robin', 'tiered'],
  },
]

export default function AdminSeedsPage() {
  const { isSuperadmin } = useAuthContext()

  if (!isSuperadmin) {
    return (
      <AppLayout>
        <Container className="py-8">
          <p className="text-sm text-text-light">Access denied.</p>
        </Container>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <Container className="py-8">
        <SectionTitle
          title="Seed Data"
          subtitle="Predefined datasets for testing and demo purposes. Run only once per environment."
        />
        <div className="mt-8 max-w-2xl space-y-3">
          {SEEDS.map((seed) => (
            <Card key={seed.id}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <FlaskConical size={15} className="shrink-0 text-text-light" />
                    <p className="font-heading text-sm font-semibold text-text">{seed.name}</p>
                  </div>
                  <p className="mt-1 text-xs text-text-light">{seed.description}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {seed.tags.map((tag) => (
                      <Badge key={tag} variant="neutral" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Link to={seed.path} className="shrink-0">
                  <Button size="sm" variant="outline">
                    Run
                  </Button>
                </Link>
              </div>
            </Card>
          ))}

          <div className="pt-4 border-t border-slate-200">
            <p className="mb-3 text-xs font-medium text-text-light uppercase tracking-wide">
              Utilities
            </p>
            <Card>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Wrench size={15} className="shrink-0 text-text-light" />
                    <p className="font-heading text-sm font-semibold text-text">Dedupe Players</p>
                  </div>
                  <p className="mt-1 text-xs text-text-light">
                    Pronađi i obriši duplirane igrače iz baze (isti naziv). Čuva najstariji zapis.
                  </p>
                </div>
                <Link to="/admin/dedupe-players" className="shrink-0">
                  <Button size="sm" variant="outline">
                    Run
                  </Button>
                </Link>
              </div>
            </Card>
            <Card>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Wrench size={15} className="shrink-0 text-text-light" />
                    <p className="font-heading text-sm font-semibold text-text">
                      Dodaj Filipa (Ciklus 2)
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-text-light">
                    One-time migracija: dodaje novog igrača „Filip“ u Grupu 1 lige Play Liga 2026
                    Ciklus 2. Generiše samo nove mečeve; postojeći žreb i rezultati ostaju.
                  </p>
                </div>
                <Link to="/admin/migrate/add-filip-ciklus2" className="shrink-0">
                  <Button size="sm" variant="outline">
                    Run
                  </Button>
                </Link>
              </div>
            </Card>
            <Card>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Wrench size={15} className="shrink-0 text-text-light" />
                    <p className="font-heading text-sm font-semibold text-text">Orphan Matches</p>
                  </div>
                  <p className="mt-1 text-xs text-text-light">
                    Pronađi mečeve koji referenciraju player ID-eve koji više ne postoje (nastali
                    nakon seed + merge operacija). Nudi inline popravku.
                  </p>
                </div>
                <Link to="/admin/orphan-matches" className="shrink-0">
                  <Button size="sm" variant="outline">
                    Run
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </Container>
    </AppLayout>
  )
}
