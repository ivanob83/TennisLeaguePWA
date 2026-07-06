import { Link } from 'react-router-dom'

export default function HeaderBrand({ onClick }) {
  return (
    <Link
      to="/"
      onClick={onClick}
      className="group flex flex-col items-start justify-center transition-transform duration-200 hover:scale-[1.01] gap-1.5"
    >
      {/* SVG LOGO PLACEHOLDER - Replace content below with your <svg> */}
      <div className="flex h-8 w-24 items-center justify-center border border-dashed border-primary/30 bg-primary/5 text-[10px] font-bold text-primary/40 uppercase tracking-widest">
        [SVG LOGO]
      </div>

      {/* Subtitle */}
      <span className="text-[0.62rem] font-bold uppercase tracking-[0.26em] text-secondary md:text-[0.68rem] leading-none">
        Play League
      </span>
    </Link>
  )
}
