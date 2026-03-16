export default function RadioGroup({ name, label, value, onChange, options = [] }) {
  return (
    <fieldset className="space-y-2">
      {label ? <legend className="text-sm font-medium text-text">{label}</legend> : null}
      <div className="flex flex-wrap gap-3">
        {options.map((option) => (
          <label key={option.value} className="inline-flex items-center gap-2 text-sm text-text">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={onChange}
              className="h-4 w-4 border-slate-300 text-primary focus:ring-primary/30"
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
