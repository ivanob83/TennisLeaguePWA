import { cn } from '../utils.js'

export default function SectionTitle({ title, subtitle, eyebrow, action, className }) {
  return (
    <div className={cn(className)}>
      <div className="border-b border-slate-200 flex items-end justify-between gap-6 pt-6">
        <div className="min-w-0 flex-1">
          {eyebrow ? (
            <p className="mb-1 font-body text-xs font-semibold uppercase tracking-wide text-secondary">
              {eyebrow}
            </p>
          ) : null}
          <div className="relative">
            <h2 className="inline-block pb-2 font-heading text-xl font-black uppercase tracking-tight text-[#212121] md:text-2xl">
              {title}
            </h2>
            <div className="absolute bottom-[-1px] left-0 h-[3px] w-[145px] bg-secondary" />
          </div>
        </div>
        {action ? <div className="shrink-0 pb-2">{action}</div> : null}
      </div>
      {subtitle ? (
        <p className="mt-3 font-body text-sm font-semibold text-text-light">{subtitle}</p>
      ) : null}
    </div>
  )
}
