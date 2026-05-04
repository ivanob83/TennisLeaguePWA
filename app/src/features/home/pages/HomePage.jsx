import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { collectionGroup, collection, query, orderBy, getDocs, getDoc, doc } from 'firebase/firestore'
import { db } from '../../../infrastructure/firebase.js'
import { useDragScroll } from '../../../hooks/useDragScroll.js'
import AppLayout from '../../../layouts/AppLayout.jsx'
import { Button, Card, Loader, MatchCard, TournamentCard } from '../../../ui/index.js'
import TopPlayerCard from '../../rankings/components/TopPlayerCard.jsx'
import { useAllTimeTopPlayer } from '../../rankings/hooks/useAllTimeTopPlayer.js'
import { useCurrentLeagueTopPlayer } from '../../rankings/hooks/useCurrentLeagueTopPlayer.js'

function useHomeData() {
  const [seasons, setSeasons] = useState([])
  const [leagues, setLeagues] = useState([])
  const [tournaments, setTournaments] = useState([])
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)

  const [incomingMatches, setIncomingMatches] = useState([])
  const [playerById, setPlayerById] = useState({})
  const [groupNameByRoundId, setGroupNameByRoundId] = useState({})

  useEffect(() => {
    Promise.all([
      getDocs(query(collection(db, 'seasons'), orderBy('startDate', 'desc'))),
      getDocs(collection(db, 'leagues')),
      getDocs(collection(db, 'tournaments')),
      getDocs(collectionGroup(db, 'matches')),
    ])
      .then(async ([seasonsSnap, leaguesSnap, tournamentsSnap, matchesSnap]) => {
        setSeasons(seasonsSnap.docs.map(d => ({ id: d.id, ...d.data() })))
        setLeagues(leaguesSnap.docs.map(d => ({ id: d.id, ...d.data() })))
        setTournaments(tournamentsSnap.docs.map(d => ({ id: d.id, ...d.data() })))
        const allMatches = matchesSnap.docs.map(d => ({ id: d.id, ...d.data() }))

        const finished = allMatches
          .filter(m => m.status === 'finished' || m.status === 'walkover')
          .sort((a, b) => {
            const ta = a.scheduledAt?.toDate ? a.scheduledAt.toDate() : new Date(a.scheduledAt || 0)
            const tb = b.scheduledAt?.toDate ? b.scheduledAt.toDate() : new Date(b.scheduledAt || 0)
            return tb - ta
          })
          .slice(0, 5)
        setMatches(finished)

        const incoming = allMatches
          .filter(m => m.status === 'scheduled')
          .sort((a, b) => {
            const ta = a.scheduledAt?.toDate ? a.scheduledAt.toDate() : new Date(a.scheduledAt || 0)
            const tb = b.scheduledAt?.toDate ? b.scheduledAt.toDate() : new Date(b.scheduledAt || 0)
            return ta - tb
          })
          .slice(0, 6)
        setIncomingMatches(incoming)

        const playerIds = [...new Set([...incoming, ...finished].flatMap(m => [m.player1Id, m.player2Id].filter(Boolean)))]
        if (playerIds.length > 0) {
          const playerDocs = await Promise.all(playerIds.map(id => getDoc(doc(db, 'players', id))))
          const map = {}
          for (const d of playerDocs) {
            if (d.exists()) map[d.id] = { id: d.id, ...d.data() }
          }

          const linkedUids = [...new Set(Object.values(map).map(p => p.authUid).filter(Boolean))]
          if (linkedUids.length > 0) {
            const userResults = await Promise.allSettled(linkedUids.map(uid => getDoc(doc(db, 'users', uid))))
            const userMap = {}
            for (const result of userResults) {
              if (result.status === 'fulfilled' && result.value.exists()) {
                userMap[result.value.id] = result.value.data()
              }
            }
            for (const player of Object.values(map)) {
              if (player.authUid && userMap[player.authUid]?.displayName) {
                player.name = userMap[player.authUid].displayName
              }
            }
          }

          setPlayerById(map)
        }

        // Fetch rounds for visible matches to get groupId → group name
        const visibleMatches = [...incoming, ...finished].filter(m => m.competitionType && m.competitionId && m.roundId)
        const uniqueRounds = [...new Map(visibleMatches.map(m => [`${m.competitionType}|${m.competitionId}|${m.roundId}`, m])).values()]
        if (uniqueRounds.length > 0) {
          const cType = m => m.competitionType === 'league' ? 'leagues' : m.competitionType === 'tournament' ? 'tournaments' : m.competitionType
          const roundDocs = await Promise.all(uniqueRounds.map(m => getDoc(doc(db, `${cType(m)}/${m.competitionId}/rounds/${m.roundId}`))))
          const groupIds = [...new Set(roundDocs.filter(d => d.exists() && d.data().groupId).map(d => ({ competitionId: d.ref.parent.parent.id, groupId: d.data().groupId, cTypePath: d.ref.parent.parent.parent.id })))]
          const groupDocs = await Promise.all(groupIds.map(g => getDoc(doc(db, `${g.cTypePath}/${g.competitionId}/groups/${g.groupId}`))))
          const groupNameById = {}
          for (const d of groupDocs) {
            if (d.exists()) groupNameById[d.id] = d.data().name
          }
          const roundGroupMap = {}
          for (const d of roundDocs) {
            if (d.exists() && d.data().groupId) roundGroupMap[d.id] = groupNameById[d.data().groupId]
          }
          setGroupNameByRoundId(roundGroupMap)
        }
      })
      .catch(err => console.error('Home data error:', err))
      .finally(() => setLoading(false))
  }, [])

  return { seasons, leagues, tournaments, matches, incomingMatches, playerById, groupNameByRoundId, loading }
}

function toEpochMs(val) {
  if (!val) return null
  const ms = val?.toDate ? val.toDate().getTime() : new Date(val).getTime()
  return isNaN(ms) ? null : ms
}

function formatScheduledAt(val) {
  if (!val) return null
  const d = val?.toDate ? val.toDate() : new Date(val)
  if (isNaN(d)) return null
  const weekday = d.toLocaleDateString('en-GB', { weekday: 'long' })
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${weekday} ${day}.${month}.${d.getFullYear()} ${hours}:${minutes}`
}

function toIncomingMatchCardProps(match, playerById, competitionNameById, groupNameByRoundId) {
  const p1 = playerById[match.player1Id]
  const p2 = playerById[match.player2Id]
  return {
    status: 'scheduled',
    label: groupNameByRoundId?.[match.roundId] || match.label || undefined,
    subtitle: competitionNameById?.[match.competitionId] || match.competitionName || undefined,
    scheduledAt: formatScheduledAt(match.scheduledAt),
    scheduledTimestamp: toEpochMs(match.scheduledAt),
    entrants: [
      {
        name: p1?.name || match.player1Name || match.player1Id || 'Player 1',
        avatarUrls: p1?.avatarUrls || null,
        isWinner: false,
        sets: [],
      },
      {
        name: p2?.name || match.player2Name || match.player2Id || 'Player 2',
        avatarUrls: p2?.avatarUrls || null,
        isWinner: false,
        sets: [],
      },
    ],
  }
}

function toMatchCardProps(match, playerById, competitionNameById, groupNameByRoundId) {
  const isWalkover = match.walkover || match.status === 'walkover'
  const scores = match.scores || match.sets?.map(s => ({ player1: s.p1, player2: s.p2 })) || []
  const p1Won = Boolean(match.winnerId) && match.winnerId === match.player1Id
  const p2Won = Boolean(match.winnerId) && match.winnerId === match.player2Id
  const p1 = playerById?.[match.player1Id]
  const p2 = playerById?.[match.player2Id]
  const name1 = p1?.name || match.player1Name || match.player1Id || 'Player 1'
  const name2 = p2?.name || match.player2Name || match.player2Id || 'Player 2'
  return {
    status: 'finished',
    walkover: isWalkover,
    label: groupNameByRoundId?.[match.roundId] || match.label || undefined,
    subtitle: competitionNameById?.[match.competitionId] || match.competitionName || undefined,
    scheduledAt: formatScheduledAt(match.scheduledAt),
    entrants: isWalkover
      ? [
          { name: name1, avatarUrls: p1?.avatarUrls || null, isWinner: p1Won, sets: [p1Won ? 'WO' : '-'] },
          { name: name2, avatarUrls: p2?.avatarUrls || null, isWinner: p2Won, sets: [p2Won ? 'WO' : '-'] },
        ]
      : [
          { name: name1, avatarUrls: p1?.avatarUrls || null, isWinner: p1Won, sets: scores.map(s => s.player1) },
          { name: name2, avatarUrls: p2?.avatarUrls || null, isWinner: p2Won, sets: scores.map(s => s.player2) },
        ],
  }
}

export default function HomePage() {
  const { ref: competitionsScrollRef, handlers: competitionsScrollHandlers } = useDragScroll()
  const { seasons, leagues, tournaments, matches: latestMatches, incomingMatches, playerById, groupNameByRoundId, loading } = useHomeData()
  const { topEntry, topPlayer } = useAllTimeTopPlayer()
  const { topEntry: currentEntry, topPlayer: currentPlayer, leagueName: currentLeagueName } = useCurrentLeagueTopPlayer()
  const [topTab, setTopTab] = useState('current')

  const competitionsLoading = loading
  const matchesLoading = loading

  const all = [
    ...leagues.map(l => ({ ...l, _type: 'leagues' })),
    ...tournaments.map(t => ({ ...t, _type: 'tournaments' })),
  ]

  const bySeason = {}
  for (const item of all) {
    const sid = item.seasonId || '__none__'
    if (!bySeason[sid]) bySeason[sid] = []
    bySeason[sid].push(item)
  }

  const seasonById = Object.fromEntries(seasons.map(s => [s.id, s]))
  const competitionNameById = Object.fromEntries([
    ...leagues.map(l => [l.id, l.name]),
    ...tournaments.map(t => [t.id, t.name]),
  ])
  const orderedSeasonIds = [
    ...seasons.map(s => s.id).filter(id => bySeason[id]),
    ...(bySeason['__none__'] ? ['__none__'] : []),
  ]

  return (
    <AppLayout>
      {/* Hero */}
      <div className="border-b border-slate-200 bg-primary py-14 text-white">
        <div className="mx-auto max-w-7xl px-6">
          <p className="mb-1 text-sm font-medium uppercase tracking-widest text-white/60">Play League</p>
          <h1 className="font-heading text-3xl font-bold leading-tight md:text-4xl">
            Your Tennis Club,<br />Organized.
          </h1>
          <p className="mt-3 text-white/70">
            Track matches, leagues, tournaments and player rankings in one place.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-10 space-y-12">

        {/* Top Player */}
        {(topEntry || currentEntry) && (
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-heading text-xl font-bold text-text">Top Player</h2>
              <div className="flex gap-1 border-b border-slate-200">
                {['current', 'alltime'].map(tab => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setTopTab(tab)}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      topTab === tab
                        ? 'border-b-2 border-secondary text-secondary'
                        : 'text-text-light hover:text-text'
                    }`}
                  >
                    {tab === 'current' ? 'Current League' : 'All-time'}
                  </button>
                ))}
              </div>
            </div>
            {topTab === 'current'
              ? currentEntry && <TopPlayerCard entry={currentEntry} player={currentPlayer} rank={1} label={currentLeagueName} />
              : topEntry && <TopPlayerCard entry={topEntry} player={topPlayer} rank={1} label="All-time ranking" />
            }
          </section>
        )}

        {/* Competitions */}
        <section>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="font-heading text-xl font-bold text-text">Competitions</h2>
              <p className="mt-0.5 text-sm text-text-light">Leagues and tournaments by season</p>
            </div>
            <Link to="/competitions">
              <Button size="sm" variant="ghost">View all</Button>
            </Link>
          </div>

          {competitionsLoading ? (
            <div className="flex justify-center py-10"><Loader /></div>
          ) : orderedSeasonIds.length === 0 ? (
            <Card>
              <p className="py-4 text-center text-sm text-text-light">No competitions yet.</p>
            </Card>
          ) : (
            <div ref={competitionsScrollRef} {...competitionsScrollHandlers} className="flex gap-4 overflow-x-auto pb-2 scrollbar-none cursor-grab">
              {orderedSeasonIds.flatMap(sid => {
                const items = [...bySeason[sid]].sort((a, b) => {
                  const oa = a.displayOrder ?? Infinity
                  const ob = b.displayOrder ?? Infinity
                  if (oa !== ob) return oa - ob
                  const ta = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0)
                  const tb = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0)
                  return tb - ta
                })
                return items
              }).map(item => (
                <Link key={item.id} to={`/${item._type}/${item.id}`} className="w-96 shrink-0">
                  <TournamentCard
                    tournament={{
                      name: item.name,
                      season: item._type === 'leagues' ? 'League' : 'Tournament',
                      status: item.format,
                      image: item.imageUrls?.[800] || item.imageUrls?.[400] || null,
                    }}
                  />
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Incoming Matches */}
        <section>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="font-heading text-xl font-bold text-text">Incoming Matches</h2>
              <p className="mt-0.5 text-sm text-text-light">Scheduled upcoming matches</p>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-10"><Loader /></div>
          ) : incomingMatches.length === 0 ? (
            <Card>
              <p className="py-4 text-center text-sm text-text-light">No scheduled matches.</p>
            </Card>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {incomingMatches.map(match => {
                const cPath = match.competitionType === 'league' ? 'leagues' : match.competitionType === 'tournament' ? 'tournaments' : match.competitionType
                const href = cPath && match.competitionId && match.roundId
                  ? `/${cPath}/${match.competitionId}/rounds/${match.roundId}/matches/${match.id}`
                  : null
                const card = <MatchCard key={match.id} match={toIncomingMatchCardProps(match, playerById, competitionNameById, groupNameByRoundId)} />
                return href
                  ? <Link key={match.id} to={href}>{card}</Link>
                  : <div key={match.id}>{card}</div>
              })}
            </div>
          )}
        </section>

        {/* Latest Matches */}
        <section>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="font-heading text-xl font-bold text-text">Latest Matches</h2>
              <p className="mt-0.5 text-sm text-text-light">Recent finished matches</p>
            </div>
          </div>

          {matchesLoading ? (
            <div className="flex justify-center py-10"><Loader /></div>
          ) : latestMatches.length === 0 ? (
            <Card>
              <p className="py-4 text-center text-sm text-text-light">No finished matches yet.</p>
            </Card>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {latestMatches.map(match => {
                const cPath = match.competitionType === 'league' ? 'leagues' : match.competitionType === 'tournament' ? 'tournaments' : match.competitionType
                const href = cPath && match.competitionId && match.roundId
                  ? `/${cPath}/${match.competitionId}/rounds/${match.roundId}/matches/${match.id}`
                  : null
                const card = <MatchCard key={match.id} match={toMatchCardProps(match, playerById, competitionNameById, groupNameByRoundId)} />
                return href
                  ? <Link key={match.id} to={href}>{card}</Link>
                  : <div key={match.id}>{card}</div>
              })}
            </div>
          )}
        </section>

      </div>
    </AppLayout>
  )
}
