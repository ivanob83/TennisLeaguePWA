import Card from './Card.jsx'
import Avatar from './Avatar.jsx'

function flagUrl(code) {
  if (!code || String(code).length !== 2) return null
  return `https://flagcdn.com/w40/${String(code).toLowerCase()}.png`
}

export default function PlayerCard({ player }) {
  const countryCode = player.countryCode || ''
  const countryName = player.country || ''
  const statsLine = [
    player.age ? `${player.age} Y/O` : null, 
    player.hand ? `${String(player.hand).toUpperCase()} HANDED` : null
  ]
    .filter(Boolean)
    .join(' | ')

  return (
    <Card className="border-gray-200 bg-white p-0 shadow-sm overflow-hidden h-full">
      <div className="flex bg-white relative p-5 items-center h-full">
        {/* Left side: Avatar */}
        <div className="flex-none flex items-center justify-center mr-6">
          <Avatar
            src={player.avatar}
            name={player.name || 'Player'}
            className="h-[120px] w-[120px] shadow-sm"
          />
        </div>

        {/* Right side: Info */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          {/* Name */}
          <h3 className="truncate text-[22px] font-bold text-[#033629] mb-1">
            {player.name || 'Unknown Player'}
          </h3>

          {/* Country */}
          <div className="flex items-center gap-2 mb-3">
            {countryCode ? (
              <img
                src={flagUrl(countryCode)}
                alt={countryName || countryCode}
                className="h-[14px] w-[20px] object-cover rounded-sm shadow-sm"
              />
            ) : null}
            <span className="text-[15px] font-medium text-[#033629] leading-none tracking-wide">
              {countryName || 'Unknown'}
            </span>
          </div>

          {/* Ranking */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[14px] font-bold text-[#8fa3b3] uppercase tracking-wider">
              Ranking
            </span>
            <span className="text-[20px] font-black text-secondary leading-none -mt-0.5">
              {player.rank || '-'}
            </span>
          </div>

          {/* Stats */}
          {statsLine ? (
            <p className="text-[13px] font-bold text-[#8fa3b3] uppercase tracking-wider">
              {statsLine}
            </p>
          ) : null}
        </div>
      </div>
    </Card>
  )
}
