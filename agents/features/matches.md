---
feature: matches
routes:
  - path: /:competitionType/:competitionId/rounds/:roundId/matches/:matchId
    component: MatchDetailPage
access:
  view: authenticated
  schedule: editor+
  submit scores: editor+ OR matched player (player čiji je authUid = user.uid)
  approve/reject: editor+
  edit result: editor+
  walkover: editor+
collections:
  - "{competitionType}/{competitionId}/rounds/{roundId}/matches"
  - "{competitionType}/{competitionId}/enrollments"
  - "{competitionType}/{competitionId}/rounds"
  - players
---

Upravljanje pojedinačnim mečem — raspoređivanje, unos rezultata, odobravanje i walkover.

## MatchDetailPage — `/:competitionType/:competitionId/rounds/:roundId/matches/:matchId`

Parametri rute: `competitionType` ('leagues' | 'tournaments'), `competitionId`, `roundId`, `matchId`

**Firestore (real-time):**
- `{competitionType}/{competitionId}/rounds/{roundId}/matches/{matchId}` — doc meča
- `{competitionType}/{competitionId}/rounds/{roundId}` — doc runde (za naziv)
- `{competitionType}/{competitionId}/enrollments` — kolekcija (za playerName lookup)

**Firestore (one-time fetch u useEffect):**
- `players/{player1Id}` i `players/{player2Id}` — za fallback prikaz imena (ako enrollment nema playerName)

---

## Match status flow

```
not_scheduled → scheduled → pending_approval → finished
                                             → (reject) → scheduled | not_scheduled
                                             walkover (direktno iz bilo kog stanja)
```

**Status prikaz badge varijante:**
- `not_scheduled` → neutral
- `scheduled` → scheduled
- `pending_approval` → warning
- `finished` / `walkover` → finished

---

## Operacije (matchService.js)

### scheduleMatch
- Editor postavlja `scheduledAt` datetime
- Menja status: → `scheduled`
- Write: `matches/{matchId}` — `{ scheduledAt, status: 'scheduled' }`

### submitScores
- Editor ili matched player unosi setove
- Čuva kao pending, status: → `pending_approval`
- Write: `matches/{matchId}` — `{ pendingSets, pendingWinnerId, status, submittedAt }`
- `pendingWinnerId` = igrač koji je dobio više setova (determineWinner)

### approveScores (editor only)
- Kopira pending u finalne field-ove
- Status: → `finished`, čuva `finishedAt`
- Write: `matches/{matchId}` — `{ sets, winnerId, pendingSets: null, status: 'finished', finishedAt }`
- Triggeruje `recalculateRankings`

### rejectScores (editor only)
- Čisti pending podatke
- Status: reverts na `scheduled` ili `not_scheduled`
- Write: `matches/{matchId}` — `{ pendingSets: null, pendingWinnerId: null, status, submittedAt: null }`

### editResult (editor only)
- Direktno menja finalni rezultat (bypass pending_approval)
- Write: `matches/{matchId}` — `{ sets, scores, winnerId, status: 'finished', finishedAt, pendingSets: null }`
- Triggeruje `recalculateRankings`

### setWalkover (editor only)
- Postavlja walkover pobednika bez setova
- Write: `matches/{matchId}` — `{ winnerId, sets: [], scores: [], status: 'walkover', finishedAt }`
- Triggeruje `recalculateRankings`

### validateSets
- Lokalna validacija: min 1 set, sve vrednosti brojevi, bez negativnih, nema izjednačenja u setu

---

## UI logika

**canSchedule:** `isEditor && status !== 'finished|walkover|pending_approval'`
**canScore:** `(isEditor || isMatchedPlayer) && status !== 'finished|walkover|pending_approval'`
**isMatchedPlayer:** `matchPlayers[player1Id]?.authUid === user.uid` OR `player2Id`

**Matched player** vidi samo form za unos — submit ide na odobrenje.
**Editor** vidi i unos i approve/reject i direktan edit rezultata i walkover.

---

## Firestore kolekcije

| Kolekcija | Pristup | Napomena |
|---|---|---|
| `{type}/{id}/rounds/{rid}/matches` | read/write | matchesRepository factory |
| `{type}/{id}/enrollments` | read | za playerName |
| `{type}/{id}/rounds` | read | za naziv runde |
| `players` | read | fallback za ime igrača |
