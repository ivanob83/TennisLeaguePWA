import { useState, useEffect } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../../../infrastructure/firebase.js'
import {
  playersRepository,
  seasonsRepository,
  leaguesRepository,
} from '../../../infrastructure/firestore.js'
import { enrichPlayersWithUserNames } from '../../../infrastructure/enrichPlayers.js'

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

export function useCurrentLeagueTopPlayer() {
  const [topEntry, setTopEntry] = useState(null)
  const [topPlayer, setTopPlayer] = useState(null)
  const [leagueName, setLeagueName] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [leagues, seasons] = await Promise.all([
          leaguesRepository.getAll(),
          seasonsRepository.getAll(),
        ])

        const seasonStartById = Object.fromEntries(
          seasons.map((s) => [s.id, s.startDate ? new Date(s.startDate) : new Date(0)]),
        )

        const best = [...leagues].sort((a, b) => {
          const ta = seasonStartById[a.seasonId] ?? new Date(0)
          const tb = seasonStartById[b.seasonId] ?? new Date(0)
          if (tb - ta !== 0) return tb - ta
          const ca = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0)
          const cb = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0)
          return cb - ca
        })[0]

        if (!best) return

        setLeagueName(best.name)

        const rankingsSnap = await getDocs(collection(db, `leagues/${best.id}/rankings`))
        const entries = rankingsSnap.docs.map((d) => d.data()).filter((e) => e.playerId)
        const top = sortRankings(entries)[0] ?? null
        setTopEntry(top)

        if (top) {
          const allPlayers = await playersRepository.getAll()
          const enriched = await enrichPlayersWithUserNames(allPlayers)
          setTopPlayer(
            enriched[top.playerId] ?? allPlayers.find((p) => p.id === top.playerId) ?? null,
          )
        }
      } catch (err) {
        console.error('useCurrentLeagueTopPlayer:', err)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  return { topEntry, topPlayer, leagueName, loading }
}
