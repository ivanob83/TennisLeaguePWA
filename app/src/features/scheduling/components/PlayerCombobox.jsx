import { useEffect, useMemo, useRef, useState } from 'react'
import { playersRepository } from '../../../infrastructure/firestore.js'

/**
 * Lightweight player picker. Loads all players once on mount, filters
 * client-side. Selecting a row fires `onChange(player)`.
 *
 * Props:
 *   value      Player object | null
 *   onChange   (player|null) => void
 *   placeholder?
 *   disabled?
 */
export default function PlayerCombobox({
  value,
  onChange,
  placeholder = 'Search player...',
  disabled = false,
}) {
  const [allPlayers, setAllPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    let active = true
    playersRepository
      .getAll()
      .then((list) => {
        if (active) setAllPlayers(list)
      })
      .catch(() => {
        if (active) setAllPlayers([])
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    function onClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return allPlayers.slice(0, 50)
    return allPlayers.filter((p) => (p.name || '').toLowerCase().includes(q)).slice(0, 50)
  }, [allPlayers, query])

  function handleSelect(player) {
    onChange(player)
    setQuery('')
    setOpen(false)
  }

  function handleClear() {
    onChange(null)
    setQuery('')
  }

  const inputValue = open ? query : value?.name || ''

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        className="w-full border border-slate-300 bg-white px-field-x py-field-y text-sm text-text transition-colors duration-280 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        value={inputValue}
        placeholder={loading ? 'Loading players...' : placeholder}
        disabled={disabled || loading}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
      />
      {value && !open ? (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-text-light hover:text-text"
          aria-label="Clear selection"
        >
          ×
        </button>
      ) : null}

      {open && !loading ? (
        <div className="absolute z-20 mt-1 max-h-72 w-full overflow-auto border border-slate-200 bg-white shadow-md">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-text-light">No results.</div>
          ) : (
            filtered.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelect(p)}
                className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
              >
                {p.name || p.email || p.id}
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  )
}
