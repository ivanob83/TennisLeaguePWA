import { getDoc, doc } from 'firebase/firestore'
import { db } from './firebase.js'

export async function enrichPlayersWithUserNames(players) {
  const valid = players.filter(Boolean)
  if (!valid.length) return {}

  const linked = valid.filter((p) => p.authUid)
  const map = Object.fromEntries(valid.map((p) => [p.id, p]))

  if (!linked.length) return map

  const userResults = await Promise.allSettled(
    linked.map((p) => getDoc(doc(db, 'users', p.authUid))),
  )
  const userMap = {}
  for (const result of userResults) {
    if (result.status === 'fulfilled' && result.value.exists()) {
      userMap[result.value.id] = result.value.data()
    }
  }

  for (const p of linked) {
    const displayName = userMap[p.authUid]?.displayName
    if (displayName) map[p.id] = { ...p, name: displayName }
  }

  return map
}
