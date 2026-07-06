import { Link } from 'react-router-dom'
import Card, { CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './Card.jsx'
import Button from './Button.jsx'
import Avatar from './Avatar.jsx'

function normalizeStatus(status, scheduledTimestamp) {
  if (status === 'completed' || status === 'walkover') return 'finished'
  if (status === 'scheduled' && scheduledTimestamp) {
    const now = Date.now()
    const t =
      typeof scheduledTimestamp === 'number'
        ? scheduledTimestamp
        : new Date(scheduledTimestamp).getTime()
    if (!isNaN(t) && now >= t && now <= t + 2 * 60 * 60 * 1000) return 'in_progress'
  }
  return status || 'scheduled'
}

function statusLabel(status) {
  if (status === 'walkover') return 'FINISHED'
  if (status === 'in_progress') return 'IN PLAY'
  return String(status || 'scheduled')
    .replace('_', ' ')
    .toUpperCase()
}

function scheduleMeta(status, match) {
  if (status === 'finished' || status === 'walkover') return match.scheduledAt || null
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
    badge: 'border-amber-200 bg-amber-50 text-amber-800',
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
  walkover: {
    badge: 'border-slate-500 bg-slate-500 text-white',
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
      sets: Array.isArray(match.setsOne) ? match.setsOne : [match.scoreOne ?? '-', '-', '-'],
    },
    {
      name: match.playerTwo,
      seed: match.seedTwo,
      country: match.countryTwo || '',
      avatar: match.avatarTwo,
      isWinner: (match.scoreTwo ?? 0) > (match.scoreOne ?? 0),
      sets: Array.isArray(match.setsTwo) ? match.setsTwo : [match.scoreTwo ?? '-', '-', '-'],
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

export default function MatchCard({ match, onAction, actionLabel, detailHref }) {
  const status = normalizeStatus(match.status, match.scheduledTimestamp)
  const ui = STATUS_STYLES[status] || STATUS_STYLES.scheduled
  const scheduleInfo = scheduleMeta(status, match)
  const entrants = normalizeEntrants(match).slice(0, 2)
  const setCount = Math.max(
    3,
    ...entrants.map((entrant) => (Array.isArray(entrant.sets) ? entrant.sets.length : 0)),
  )
  const matchMeta =
    match.subtitle ||
    [match.court, match.round].filter(Boolean).join(' - ') ||
    match.leagueName ||
    'Match details'

  return (
    <Card className="border-slate-200 bg-background-light p-3 text-[#404040]">
      <CardHeader className="mb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="font-heading text-sm font-bold uppercase leading-tight tracking-tight text-primary">
              {match.phaseLabel || match.label || match.groupName || 'Match'}
            </CardTitle>
            <CardDescription className="mt-0.5 text-[11px] font-bold uppercase tracking-wide text-[#606060]">
              {matchMeta}
            </CardDescription>
          </div>

          <div className="flex shrink-0 flex-col items-end">
            <span className={`border px-2 py-0.5 text-[10px] font-bold tracking-wide ${ui.badge}`}>
              {statusLabel(status)}
            </span>
            {scheduleInfo && (
              <span className="mt-0.5 text-right text-[14px] text-[#808080]">{scheduleInfo}</span>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-2">
        {entrants.map((entrant, index) => {
          const values = setValues(entrant, setCount)
          const isWinner = Boolean(entrant.isWinner)

          return (
            <div key={`${entrant.name || 'player'}-${index}`}>
              <div className="flex items-center">
                <div className="relative mr-2 h-11 w-11 shrink-0">
                  <Avatar
                    src={entrant.avatar}
                    urls={entrant.avatarUrls || null}
                    sizeHint={80}
                    name={entrant.name || 'Player'}
                    className="h-11 w-11 border border-slate-200 bg-white"
                    fallbackClassName="text-sm font-semibold text-text-light"
                    alt={entrant.name || 'Player'}
                  />
                </div>

                <div className="flex min-w-0 grow items-center gap-2">
                  <span className={`truncate text-sm ${isWinner ? ui.rowWinner : ui.rowDefault}`}>
                    {renderName(entrant)}
                  </span>
                  {ui.showWinnerIcon && isWinner ? (
                    <svg
                      className="h-3.5 w-3.5 shrink-0 text-black"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth="3"
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : null}
                </div>

                <div className="ml-2 flex shrink-0 items-center gap-3">
                  {values.map((cell, colIndex) => {
                    return (
                      <span
                        key={`${entrant.name || 'player'}-set-${colIndex}`}
                        className={`relative inline-flex justify-center font-bold ${match.walkover || status === 'walkover' ? 'w-5' : 'w-3'} ${cell.value === 'necemo odvojenu ligu' ? 'text-[0.8rem]' : 'text-base'} ${cell.muted ? 'text-[#b0b0b0]' : 'text-black'}`}
                      >
                        {cell.value}
                        {cell.superscript ? (
                          <sup className="absolute -right-2 -top-1 text-[10px] font-semibold">
                            {cell.superscript}
                          </sup>
                        ) : null}
                      </span>
                    )
                  })}
                </div>
              </div>

              {index < entrants.length - 1 ? <hr className="ml-10 mt-2 border-slate-200" /> : null}
            </div>
          )
        })}
      </CardContent>

      {(onAction && actionLabel) || detailHref ? (
        <CardFooter className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3">
          <div>
            {onAction && actionLabel ? (
              <Button size="sm" variant="success" onClick={onAction}>
                {actionLabel}
              </Button>
            ) : null}
          </div>
          {detailHref ? (
            <Link to={detailHref}>
              <Button size="sm" variant="outline">
                View Details
              </Button>
            </Link>
          ) : null}
        </CardFooter>
      ) : null}
    </Card>
  )
}
