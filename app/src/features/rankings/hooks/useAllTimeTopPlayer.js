import { useState, useEffect } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../../../infrastructure/firebase.js'
import { playersRepository } from '../../../infrastructure/firestore.js'

function mergeRankings(entries) {
  const byId = {}
  for (const e of entries) {
    const pid = e.playerId
    if (!pid) continue
    if (!byId[pid]) {
      byId[pid] = { ...e }
      continue
    }
    byId[pid].points = (byId[pid].points ?? 0) + (e.points ?? 0)
    byId[pid].wins = (byId[pid].wins ?? 0) + (e.wins ?? 0)
    byId[pid].losses = (byId[pid].losses ?? 0) + (e.losses ?? 0)
    byId[pid].matchesPlayed = (byId[pid].matchesPlayed ?? 0) + (e.matchesPlayed ?? 0)
    byId[pid].setsWon = (byId[pid].setsWon ?? 0) + (e.setsWon ?? 0)
    byId[pid].setsLost = (byId[pid].setsLost ?? 0) + (e.setsLost ?? 0)
  }

  const byName = {}
  for (const e of Object.values(byId)) {
    const key = (e.playerName ?? '').trim().toLowerCase()
    if (!key) continue
    if (!byName[key]) {
      byName[key] = { ...e }
      continue
    }
    byName[key].points = (byName[key].points ?? 0) + (e.points ?? 0)
    byName[key].wins = (byName[key].wins ?? 0) + (e.wins ?? 0)
    byName[key].losses = (byName[key].losses ?? 0) + (e.losses ?? 0)
    byName[key].matchesPlayed = (byName[key].matchesPlayed ?? 0) + (e.matchesPlayed ?? 0)
    byName[key].setsWon = (byName[key].setsWon ?? 0) + (e.setsWon ?? 0)
    byName[key].setsLost = (byName[key].setsLost ?? 0) + (e.setsLost ?? 0)
  }

  return Object.values(byName).map((e) => ({
    ...e,
    winRate: e.matchesPlayed > 0 ? Math.round((e.wins / e.matchesPlayed) * 100) : 0,
  }))
}

function setRatio(e) {
  const won = e.setsWon ?? 0
  const lost = e.setsLost ?? 0
  const total = won + lost
  return total > 0 ? won / total : 0
}

function sortRankings(list) {
  return [...list].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    const ratioDiff = setRatio(b) - setRatio(a)
    if (ratioDiff !== 0) return ratioDiff
    if (b.wins !== a.wins) return b.wins - a.wins
    return (b.setsWon ?? 0) - (a.setsWon ?? 0)
  })
}

/**
 * Fetches all rankings across all leagues + tournaments, returns #1 all-time player + their player doc.
 */
export function useAllTimeTopPlayer() {
  const [topEntry, setTopEntry] = useState(null)
  const [topPlayer, setTopPlayer] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      setLoading(true)
      try {
        const [leaguesSnap, tournamentsSnap, allPlayers] = await Promise.all([
          getDocs(collection(db, 'leagues')),
          getDocs(collection(db, 'tournaments')),
          playersRepository.getAll(),
        ])

        const competitions = [
          ...leaguesSnap.docs.map((d) => ({ type: 'leagues', id: d.id })),
          ...tournamentsSnap.docs.map((d) => ({ type: 'tournaments', id: d.id })),
        ]

        const allEntries = []
        await Promise.all(
          competitions.map(async (comp) => {
            const snap = await getDocs(collection(db, `${comp.type}/${comp.id}/rankings`))
            snap.docs.forEach((d) => {
              const data = d.data()
              if (data.playerId) allEntries.push(data)
            })
          }),
        )

        const sorted = sortRankings(mergeRankings(allEntries))
        const top = sorted[0] ?? null
        setTopEntry(top)

        if (top) {
          const key = (top.playerName ?? '').trim().toLowerCase()
          const player = allPlayers.find((p) => (p.name ?? '').trim().toLowerCase() === key) ?? null
          setTopPlayer(player)
        }
      } catch (err) {
        console.error('useAllTimeTopPlayer:', err)
      } finally {
        setLoading(false)
      }
    }

    fetch()
  }, [])

  return { topEntry, topPlayer, loading }
}
