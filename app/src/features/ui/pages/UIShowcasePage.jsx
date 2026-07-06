import { useState } from 'react'
import AppLayout from '../../../layouts/AppLayout.jsx'
import {
  Badge,
  Button,
  Checkbox,
  Input,
  MatchCard,
  NewsCard,
  PlayerCard,
  RadioGroup,
  SectionTitle,
  Select,
  TournamentCard,
} from '../../../ui/index.js'

const SAMPLE_MATCH = {
  phaseLabel: "Men's Singles",
  leagueName: 'ATP Finals - Turin, Italy',
  round: 'Round Robin',
  status: 'completed',
  duration: '5h29',
  subtitle: 'Court Philippe-Chatrier - Final',
  scheduledAt: '12 Mar 2026, 18:00',
  court: 'Court Philippe-Chatrier',
  entrants: [
    {
      name: 'J.Sinner',
      seed: 1,
      country: 'IT',
      isWinner: false,
      sets: [
        { value: 6 },
        { value: 7, superscript: 7 },
        { value: 4, muted: true },
        { value: 6, superscript: 3, muted: true },
        { value: 6, superscript: 2, muted: true },
      ],
    },
    {
      name: 'C.Alcaraz',
      seed: 2,
      country: 'ES',
      isWinner: true,
      sets: [
        { value: 4, muted: true },
        { value: 6, superscript: 4, muted: true },
        { value: 6 },
        { value: 7, superscript: 7 },
        { value: 7, superscript: 10 },
      ],
    },
  ],
}

const SAMPLE_MATCH_SCHEDULED = {
  ...SAMPLE_MATCH,
  status: 'scheduled',
  scheduledAt: '14 Mar 2026, 16:00',
  entrants: SAMPLE_MATCH.entrants.map((entrant) => ({
    ...entrant,
    isWinner: false,
  })),
}

const SAMPLE_MATCH_NOT_SCHEDULED = {
  ...SAMPLE_MATCH_SCHEDULED,
  status: 'not_scheduled',
  scheduledAt: null,
}

const SAMPLE_MATCH_IN_PROGRESS = {
  ...SAMPLE_MATCH,
  status: 'in_progress',
  scheduledAt: '12 Mar 2026, 18:00',
}

const SAMPLE_MATCH_COMPLETED = {
  ...SAMPLE_MATCH,
  status: 'completed',
}

const SAMPLE_TOURNAMENT = {
  name: 'Spring Clay Open 2026',
  season: 'Season 2026',
  status: 'in_progress',
  image:
    'https://images.prismic.io/fft-rg-commun-news/aX9jv90YXLCxVPWP_CarlosAlcaraz-Photocalltroph%C3%A9eOpend%27Australie2026-CorinneDubreuilFFT.JPG?auto=format%2Ccompress&rect=0%2C1%2C3000%2C1997&w=760&h=506',
}

const SAMPLE_NEWS = {
  category: 'WTA/ATP',
  title: 'Pegula makes a statement in Dubai',
  image:
    'https://images.prismic.io/fft-rg-commun-news/aX9jv90YXLCxVPWP_CarlosAlcaraz-Photocalltroph%C3%A9eOpend%27Australie2026-CorinneDubreuilFFT.JPG?auto=format%2Ccompress&rect=0%2C1%2C3000%2C1997&w=760&h=506',
  author: 'League Organizer',
  publishedAt: '11 Mar 2026',
  readTime: '3 min read',
  body: 'Quarterfinal matches are now scheduled. Please verify availability and report conflicts before 20:00.',
}

const SAMPLE_PLAYER = {
  name: 'Carlos Alcaraz',
  rank: 1,
  countryCode: 'ES',
  country: 'Spain',
  age: 22,
  hand: 'Right Handed',
}

export default function UIShowcasePage() {
  const [radioValue, setRadioValue] = useState('scheduled')

  return (
    <AppLayout>
      <div className="mx-auto max-w-6xl px-6 py-section space-y-10">
        <SectionTitle
          eyebrow="Design System"
          title="UI Component Showcase"
          subtitle="Reference page for reusable primitives and domain cards."
          action={
            <Button variant="secondary" size="sm">
              Preview State
            </Button>
          }
        />

        <section className="space-y-4">
          <SectionTitle title="Button Variants" />
          <div className="flex flex-wrap gap-3">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button loading>Loading</Button>
            <Button disabled>Disabled</Button>
          </div>
        </section>

        <section className="space-y-4">
          <SectionTitle title="Form Fields" />
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="League Name" placeholder="Clay Masters" hint="Visible to all players" />
            <Select
              label="Season"
              placeholder="Choose season"
              options={[
                { value: '2026-spring', label: '2026 Spring' },
                { value: '2026-summer', label: '2026 Summer' },
              ]}
            />
            <Checkbox label="Enable automatic ranking updates" name="autoupdate" />
            <RadioGroup
              label="Match Status"
              name="matchStatus"
              value={radioValue}
              onChange={(event) => setRadioValue(event.target.value)}
              options={[
                { value: 'not_scheduled', label: 'Not Scheduled' },
                { value: 'scheduled', label: 'Scheduled' },
                { value: 'in_progress', label: 'In Progress' },
                { value: 'finished', label: 'Finished' },
              ]}
            />
          </div>
        </section>

        <section className="space-y-4">
          <SectionTitle title="Badges" />
          <div className="flex flex-wrap gap-2">
            <Badge variant="scheduled">not scheduled</Badge>
            <Badge variant="scheduled">scheduled</Badge>
            <Badge variant="in_progress">in progress</Badge>
            <Badge variant="finished">finished</Badge>
            <Badge variant="disputed">disputed</Badge>
            <Badge variant="cancelled">cancelled</Badge>
            <Badge variant="walkover">walkover</Badge>
          </div>
        </section>

        <section className="space-y-4">
          <SectionTitle
            title="Cards"
            subtitle="Match, tournament, news, and player card variants."
          />
          <div className="grid gap-4 md:grid-cols-2">
            <MatchCard match={SAMPLE_MATCH_NOT_SCHEDULED} />
            <MatchCard match={SAMPLE_MATCH_SCHEDULED} />
            <MatchCard match={SAMPLE_MATCH_IN_PROGRESS} />
            <MatchCard match={SAMPLE_MATCH_COMPLETED} />
            <TournamentCard tournament={SAMPLE_TOURNAMENT} />
            <NewsCard news={SAMPLE_NEWS} />
            <PlayerCard player={SAMPLE_PLAYER} />
          </div>
        </section>
      </div>
    </AppLayout>
  )
}
