import Card, { CardContent } from './Card.jsx'

const FALLBACK_IMAGES = [
  'https://images.pexels.com/photos/209977/pexels-photo-209977.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/1432034/pexels-photo-1432034.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/1263426/pexels-photo-1263426.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/8224692/pexels-photo-8224692.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/14848069/pexels-photo-14848069.jpeg?auto=compress&cs=tinysrgb&w=800',
]

function pickImage(name) {
  let hash = 0
  for (let i = 0; i < (name?.length || 0); i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  return FALLBACK_IMAGES[hash % FALLBACK_IMAGES.length]
}

export default function TournamentCard({ tournament }) {
  const label = tournament.status
    ? String(tournament.status).replace(/_/g, '/').toUpperCase()
    : 'TOURNAMENT'

  const image = tournament.image || pickImage(tournament.name)

  return (
    <Card className="group relative aspect-[21/9] cursor-pointer overflow-hidden border-slate-200 bg-background-light p-0">
      <img
        src={image}
        alt={tournament.name || 'Competition'}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

      <CardContent className="absolute bottom-0 left-0 w-full p-4 md:p-6">
        <span className="mb-2 inline-block bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white md:text-[11px]">
          {label}
        </span>

        <h3 className="font-heading text-base font-bold uppercase italic leading-tight tracking-tight text-white drop-shadow-md md:text-xl">
          {tournament.name || 'Competition'}
        </h3>

        {tournament.season ? (
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-white/80">
            {tournament.season}
          </p>
        ) : null}
      </CardContent>

      <div className="pointer-events-none absolute inset-0 border border-white/10" />
    </Card>
  )
}
