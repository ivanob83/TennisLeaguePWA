export default function Checkbox({ label, id, className = '', ...props }) {
  const checkboxId = id || props.name

  return (
    <label
      htmlFor={checkboxId}
      className={`inline-flex items-center gap-2 text-sm text-text ${className}`}
    >
      <input
        id={checkboxId}
        type="checkbox"
        className="h-4 w-4 border-slate-300 text-primary focus:ring-primary/30"
        {...props}
      />
      <span>{label}</span>
    </label>
  )
}
