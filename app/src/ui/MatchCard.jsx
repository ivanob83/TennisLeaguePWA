import Card, {
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from './Card.jsx'
import Button from './Button.jsx'
import Avatar from './Avatar.jsx'

function normalizeStatus(status) {
  if (status === 'completed') return 'finished'
  return status || 'scheduled'
}

function statusLabel(status) {
  return String(status || 'scheduled').replace('_', ' ').toUpperCase()
}

function scheduleMeta(status, match) {
  if (status === 'not_scheduled') return 'DATE TBD'
  return match.scheduledAt || match.dateTime || 'DATE TBD'
}

const STATUS_STYLES = {
  not_scheduled: {
    badge: 'border-slate-400 text-slate-500 bg-transparent',
    rowWinner: 'font-medium text-[#404040]',
    rowDefault: 'font-medium text-[#a0a0a0]',
    showWinnerIcon: false,
  },
  scheduled: {
    badge: 'border-primary text-primary bg-transparent',
    rowWinner: 'font-medium text-[#404040]',
    rowDefault: 'font-medium text-[#a0a0a0]',
    showWinnerIcon: false,
  },
  in_progress: {
    badge: 'border-secondary text-secondary bg-secondary/5',
    rowWinner: 'font-semibold text-black',
    rowDefault: 'font-medium text-[#404040]',
    showWinnerIcon: false,
  },
  finished: {
    badge: 'border-primary bg-primary text-white',
    rowWinner: 'font-bold text-black',
    rowDefault: 'font-medium text-[#a0a0a0]',
    showWinnerIcon: true,
  },
}

function normalizeEntrants(match) {
  if (Array.isArray(match.entrants) && match.entrants.length) {
    return match.entrants
  }

  return [
    {
      name: match.playerOne,
      seed: match.seedOne,
      country: match.countryOne || '',
      avatar: match.avatarOne,
      isWinner: (match.scoreOne ?? 0) > (match.scoreTwo ?? 0),
      sets: Array.isArray(match.setsOne)
        ? match.setsOne
        : [match.scoreOne ?? '-', '-', '-'],
    },
    {
      name: match.playerTwo,
      seed: match.seedTwo,
      country: match.countryTwo || '',
      avatar: match.avatarTwo,
      isWinner: (match.scoreTwo ?? 0) > (match.scoreOne ?? 0),
      sets: Array.isArray(match.setsTwo)
        ? match.setsTwo
        : [match.scoreTwo ?? '-', '-', '-'],
    },
  ]
}

function renderName(entrant) {
  const seed = entrant.seed ? ` (${entrant.seed})` : ''
  return `${entrant.name || 'Unknown'}${seed}`
}

function normalizeSetCell(cell) {
  if (cell && typeof cell === 'object') {
    return {
      value: cell.value ?? '-',
      superscript: cell.superscript ?? cell.tb ?? null,
      muted: Boolean(cell.muted),
    }
  }

  return {
    value: cell ?? '-',
    superscript: null,
    muted: false,
  }
}

function setValues(entrant, setCount) {
  const values = Array.isArray(entrant.sets) ? entrant.sets : []
  return Array.from({ length: setCount }, (_, index) => normalizeSetCell(values[index]))
}

export default function MatchCard({
  match,
  onAction,
  actionLabel,
}) {
  const status = normalizeStatus(match.status)
  const ui = STATUS_STYLES[status] || STATUS_STYLES.scheduled
  const scheduleInfo = scheduleMeta(status, match)
  const entrants = normalizeEntrants(match).slice(0, 2)
  const setCount = Math.max(3, ...entrants.map((entrant) => (Array.isArray(entrant.sets) ? entrant.sets.length : 0)))
  const matchMeta = match.subtitle || [match.court, match.round].filter(Boolean).join(' - ') || match.leagueName || 'Match details'

  return (
    <Card className="border-slate-200 bg-background-light p-5 text-[#404040]">
      <CardHeader className="mb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="font-heading text-lg font-bold uppercase leading-tight tracking-tight text-primary">
              {match.phaseLabel || 'Match'}
            </CardTitle>
            <CardDescription className="mt-1 text-[13px] font-bold uppercase tracking-wide text-[#606060]">
              {matchMeta}
            </CardDescription>
          </div>

          <div className="flex flex-col items-end">
            <span className={`border px-3 py-1 text-[11px] font-bold tracking-wide ${ui.badge}`}>
              {statusLabel(status)}
            </span>
            <span className="mt-1 text-[13px] text-[#808080]">{scheduleInfo}</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {entrants.map((entrant, index) => {
            const values = setValues(entrant, setCount)
            const isWinner = Boolean(entrant.isWinner)

            return (
              <div key={`${entrant.name || 'player'}-${index}`}>
                <div className="flex items-center">
                  <div className="relative mr-3 h-12 w-12 shrink-0">
                    <Avatar
                      src={entrant.avatar}
                      name={entrant.name || 'Player'}
                      className="h-12 w-12 border border-slate-200 bg-white"
                      fallbackClassName="text-sm font-semibold text-text-light"
                      alt={entrant.name || 'Player'}
                    />
                  </div>

                  <div className="flex min-w-0 grow items-center gap-3">
                    <span className={`truncate text-lg ${isWinner ? ui.rowWinner : ui.rowDefault}`}>
                      {renderName(entrant)}
                    </span>
                    {ui.showWinnerIcon && isWinner ? (
                      <svg className="h-4 w-4 shrink-0 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : null}
                  </div>

                  <div className="ml-3 flex shrink-0 items-center gap-4">
                    {values.map((cell, colIndex) => {
                      return (
                        <span
                          key={`${entrant.name || 'player'}-set-${colIndex}`}
                          className={`relative w-4 text-center text-xl font-bold ${cell.muted ? 'text-[#b0b0b0]' : 'text-black'}`}
                        >
                          {cell.value}
                          {cell.superscript ? (
                            <sup className="absolute -right-2 -top-1 text-[11px] font-semibold">
                              {cell.superscript}
                            </sup>
                          ) : null}
                        </span>
                      )
                    })}
                  </div>
                </div>

                {index < entrants.length - 1 ? <hr className="ml-16 mt-4 border-slate-200" /> : null}
              </div>
            )
          })}
      </CardContent>

      {onAction && actionLabel ? (
        <CardFooter className="mt-5 border-t border-slate-200 pt-4">
          <Button size="sm" variant="outline" onClick={onAction}>{actionLabel}</Button>
        </CardFooter>
      ) : null}
    </Card>
  )
}
