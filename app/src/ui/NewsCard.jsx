import Card, { CardContent } from './Card.jsx'

export default function NewsCard({ news }) {
  return (
    <Card className="group relative aspect-[21/9] cursor-pointer overflow-hidden border-slate-200 bg-background-light p-0">
      {news.image ? (
        <img
          src={news.image}
          alt={news.title || 'News image'}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        <div className="absolute inset-0 bg-slate-300" />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

      <CardContent className="absolute bottom-0 left-0 w-full p-6 md:p-8">
        <span className="mb-3 inline-block bg-secondary px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white md:text-[13px]">
          {news.category || 'News'}
        </span>

        <h3 className="font-heading text-2xl font-bold uppercase italic leading-tight tracking-tight text-white drop-shadow-md md:text-4xl">
          {news.title || 'News headline'}
        </h3>
      </CardContent>

      <div className="pointer-events-none absolute inset-0 border border-white/10" />
    </Card>
  )
}
