---
feature: rankings
routes:
  - path: /rankings
    component: RankingsPage
access: authenticated
collections:
  - leagues
  - tournaments
  - "{competitionType}/{competitionId}/rankings"
  - "{competitionType}/{competitionId}/rounds"
  - "{competitionType}/{competitionId}/rounds/{roundId}/matches"
---

Rang liste po takmičenju. Rankings se automatski rekalkulišu nakon svakog odobrenog meča (approve, editResult, setWalkover).

## RankingsPage — `/rankings`

**Firestore (real-time):**
- `leagues` — sve lige (za dropdown)
- `tournaments` — svi turniri (za dropdown)
- `{competitionType}/{competitionId}/rankings` — real-time kolekcija za izabrano takmičenje (RankingTable komponenta)

**UI:**
- Dropdown za tip (Leagues / Tournaments)
- Dropdown za konkretno takmičenje
- Tabela sortirana: points desc → wins desc → winRate desc → setsWon desc
- Kolone: # | Player | MP (matches played) | W (wins) | L (losses) | SK (setsWon/setsLost) | PTS
- Lider (rank 1 sa >0 mečeva) dobija "Leader" badge

---

## rankingService.js — recalculateRankings

**Poziva se** automatski iz `matchService.js` (approveScores, editResult, setWalkover) — nikad direktno iz UI.

**Parametri:** `competitionType`, `competitionId`, `enrollments[]`

**Algoritam:**
1. Fetch svih rundi: `roundsRepository(type, id).getAll()`
2. Grupisanje rundi: `groupRounds` (type === 'round_robin'), `knockoutRounds` (type === 'knockout')
3. Fetch svih odigranih mečeva iz group rundi i knockout rundi
4. Inicijalizacija `stats` mapa za sve enrolled igrače (iz enrollments array)
5. **Grupna faza:** za svaki finished/walkover meč:
   - +1 matchesPlayed za oba igrača
   - sets tally (setsWon/setsLost)
   - pobednik: +cfg.groupWin poena; gubitnik: +cfg.groupLoss poena
6. **Knockout — SF loseri:** SF mečevi (label startsWith 'SF') → gubitnik +cfg.semifinal
7. **Knockout — Final:** meč sa label === 'Final' → gubitnik +cfg.final, pobednik +cfg.winner
8. winRate = round(wins/matchesPlayed * 100)
9. **Persist:** `setDoc(db, rankings/{playerId}, {...stats, winRate}, { merge: true })`

**Normalizacija setova:** podržava i `sets:[{p1,p2}]` (novi format) i `scores:[{player1,player2}]` (legacy seed format).

**config.js — poeni:**
```js
TOURNAMENT_POINTS = LEAGUE_POINTS = {
  groupWin: 100, groupLoss: 30,
  semifinal: 250, final: 500, winner: 1000
}
```

---

## Firestore kolekcije

| Kolekcija | Pristup | Napomena |
|---|---|---|
| `leagues` | read | lista za dropdown |
| `tournaments` | read | lista za dropdown |
| `{type}/{id}/rankings` | read/write | setDoc merge po playerId |
| `{type}/{id}/rounds` | read | u recalculate service |
| `{type}/{id}/rounds/{rid}/matches` | read | u recalculate service |

**Rankings dokument (per player, per competition):**
```js
{
  playerId, playerName,
  wins, losses, matchesPlayed, winRate,
  setsWon, setsLost,
  points,
  updatedAt
}
```
