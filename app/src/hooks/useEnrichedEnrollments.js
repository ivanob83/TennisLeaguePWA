import { useState, useEffect, useRef } from 'react'
import { useFirestoreCollectionOnce } from './useFirestore.js'
import { playersRepository } from '../infrastructure/firestore.js'
import { enrichPlayersWithUserNames } from '../infrastructure/enrichPlayers.js'

export function useEnrichedEnrollments(competitionType, competitionId) {
  const enrollmentPath = `${competitionType}/${competitionId}/enrollments`
  const { data: rawEnrollments, loading } = useFirestoreCollectionOnce(enrollmentPath)

  const [enrollments, setEnrollments] = useState([])
  const processedKeyRef = useRef('')

  useEffect(() => {
    if (loading) return
    if (!rawEnrollments.length) {
      setEnrollments([])
      return
    }

    const key = rawEnrollments
      .map((e) => e.playerId)
      .sort()
      .join(',')
    if (key === processedKeyRef.current) return
    processedKeyRef.current = key

    // Immediately show raw enrollment names — no flash of IDs
    setEnrollments(rawEnrollments)

    // Then enrich with user displayName for linked players
    Promise.all(rawEnrollments.map((e) => playersRepository.getById(e.playerId)))
      .then((playerDocs) => enrichPlayersWithUserNames(playerDocs.filter(Boolean)))
      .then((enriched) => {
        setEnrollments(
          rawEnrollments.map((en) => {
            const p = enriched[en.playerId]
            return p ? { ...en, playerName: p.name } : en
          }),
        )
      })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, rawEnrollments.length])

  return { data: enrollments, loading }
}
