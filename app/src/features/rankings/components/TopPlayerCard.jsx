import { Link } from 'react-router-dom'
import Avatar from '../../../ui/Avatar.jsx'
import { cn } from '../../../utils.js'

/**
 * Displays the top-ranked player card.
 *
 * @param {object} entry  - ranking entry: { playerName, wins, losses, matchesPlayed, setsWon, setsLost, points, winRate, playerId }
 * @param {object} player - player Firestore doc (for avatarUrls/avatarUrl)
 * @param {number} rank   - rank number to display (usually 1)
 * @param {string} label  - label under the rank number, e.g. "All-time ranking" or "Play Liga 2025"
 * @param {string} className
 */
export default function TopPlayerCard({ entry, player, rank = 1, label = 'All-time ranking', className }) {
  if (!entry) return null

  const winRate = entry.matchesPlayed > 0
    ? Math.round((entry.wins / entry.matchesPlayed) * 100)
    : 0

  return (
    <div className={cn('border border-slate-200 bg-white flex gap-6 sm:gap-8 p-6 flex-col sm:flex-row sm:items-start', className)}>

      {/* Avatar */}
      <Avatar
        urls={player?.avatarUrls || null}
        src={player?.avatarUrl || null}
        name={entry.playerName}
        sizeHint={200}
        className="h-36 w-36 sm:h-40 sm:w-40 self-center sm:self-start shrink-0 text-3xl font-bold border-2 border-slate-100"
      />

      {/* Info */}
      <div className="flex-1 min-w-0">

        {/* Name row + rank circle */}
        <div className="flex items-start gap-4 mb-1">
          {/* Rank circle */}
          <div className="shrink-0 h-12 w-12 rounded-full bg-secondary flex items-center justify-center text-white font-heading font-extrabold text-xl">
            {rank}
          </div>

          {/* Name + label */}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-0.5">
              <h2 className="font-heading text-2xl font-extrabold text-text leading-tight">
                {entry.playerName}
              </h2>
            </div>
            <p className="text-[0.65rem] font-bold uppercase tracking-widest text-text-lighter">
              {label}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="border-t border-slate-100 mt-4">
          <StatRow label="Matches played" value={entry.matchesPlayed} />
          <StatRow label="Wins / Losses" value={`${entry.wins} / ${entry.losses}`} />
          <StatRow label="Sets won / lost" value={`${entry.setsWon} / ${entry.setsLost}`} />
          <StatRow label="Win rate" value={`${winRate}%`} />
          <StatRow label="Points" value={entry.points ?? 0} highlight />
        </div>
      </div>
    </div>
  )
}

function StatRow({ label, value, highlight }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
      <span className="text-[0.68rem] font-semibold uppercase tracking-wider text-text-lighter">
        {label}
      </span>
      <span className={cn('font-heading text-sm font-bold', highlight ? 'text-secondary' : 'text-text')}>
        {value}
      </span>
    </div>
  )
}
