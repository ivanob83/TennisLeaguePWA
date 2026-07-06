import { Button } from '../../../../ui/index.js'

export default function SaveBar({ changesCount, saving, onSave, onCancel }) {
  const dirty = changesCount > 0
  const label = changesCount === 1 ? 'Save 1 change' : `Save ${changesCount} changes`
  return (
    <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 pt-3">
      <Button variant="ghost" size="sm" onClick={onCancel} disabled={!dirty || saving}>
        Cancel
      </Button>
      <Button variant="primary" size="sm" onClick={onSave} disabled={!dirty} loading={saving}>
        {label}
      </Button>
    </div>
  )
}
