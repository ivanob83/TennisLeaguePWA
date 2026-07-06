---
feature: tournaments
routes:
  - path: /tournaments
    component: TournamentsPage
  - path: /tournaments/create
    component: TournamentCreatePage
  - path: /tournaments/:tournamentId
    component: TournamentDetailPage
  - path: /tournaments/:tournamentId/edit
    component: TournamentEditPage
  - path: /tournaments/:tournamentId/enroll
    component: TournamentEnrollPage
access:
  read: authenticated
  create/edit: editor+
  delete: superadmin
collections:
  - tournaments
  - seasons
  - tournaments/{tournamentId}/enrollments
  - tournaments/{tournamentId}/rounds
  - tournaments/{tournamentId}/rounds/{roundId}/matches
---

CRUD za turnire. Turnir je kratko-format takmičenje unutar sezone sa datumskim opsegom. Identično ligama po strukturi, ali ima polje `startDate`/`endDate` na samom turniru i validaciju da datumi budu unutar sezone.

## TournamentsPage — `/tournaments`

**Firestore (real-time):**

- `seasons` — `orderBy('startDate', 'desc')` — za filter dropdown
- `tournaments` — filtrira po `seasonId` ako izabrana sezona; `orderBy('startDate', 'asc')` sa filterom, `orderBy('startDate', 'desc')` bez filtera

**UI:** Grid kartica (TournamentCard); "View →" link. Editor vidi `+ New Tournament` i `+ New Season`.

---

## TournamentCreatePage — `/tournaments/create`

**Access:** editor+

**Razlike vs LeagueCreatePage:**

- Dodatna polja: `startDate`, `endDate` (obavezna)
- Validacija da su datumi turnira unutar opsega izabrane sezone
- `pointsPerWin`/`pointsPerLoss` za round_robin format

**Firestore:**

- `tournamentsRepository.create(payload)` + `createCompetitionSlots(payload, tournament.id, 'tournaments')`

**Payload:**

```js
{ seasonId, name, format, numGroups, playersPerGroup, pointsPerWin, pointsPerLoss,
  numPlayers, seededPlayerIds, startDate, endDate, rules, organizerId, status: 'draft' }
```

**Nakon submit:** redirect na `/tournaments/:tournamentId`

---

## TournamentDetailPage — `/tournaments/:tournamentId`

**Identično LeagueDetailPage po strukturi.** Razlike:

- Prikazuje `date range` (startDate–endDate) umesto samo statusa
- Param: `tournamentId` (ne `leagueId`)
- `deleteCompetition(tournamentId, 'tournaments')`

**Tabovi:** isti kao liga (setup, draw, group_matches, standings, knockout) — dinamički na osnovu formata i role.

**Firestore:**

- `tournaments/{tournamentId}` — real-time doc
- `seasons` — real-time kolekcija

---

## TournamentEditPage — `/tournaments/:tournamentId/edit`

**Identično LeagueEditPage.** Razlike:

- Ima `startDate`/`endDate` polja u formi
- Validacija datuma unutar sezone
- `uploadCompetitionImage(tournamentId, ...)` za sliku

---

## TournamentEnrollPage — `/tournaments/:tournamentId/enroll`

**Napomena:** Zastarela stranica — funkcionalnost je u tabovima TournamentDetailPage. Prikazuje Setup i Draw tabove.

---

## Firestore kolekcije

| Kolekcija                               | Pristup    | Napomena                        |
| --------------------------------------- | ---------- | ------------------------------- |
| `tournaments`                           | read/write | tournamentsRepository           |
| `seasons`                               | read       | za dropdown i validaciju datuma |
| `tournaments/{id}/enrollments`          | read/write | via EnrollmentManager           |
| `tournaments/{id}/rounds`               | read/write | via tabovi                      |
| `tournaments/{id}/rounds/{rid}/matches` | read/write | via tabovi                      |
| `tournaments/{id}/rankings`             | read/write | via rankingService              |

**Tournament dokument:**

```js
{
  ;(seasonId,
    name,
    format,
    numGroups,
    playersPerGroup,
    pointsPerWin,
    pointsPerLoss,
    numPlayers,
    seededPlayerIds,
    startDate,
    endDate,
    rules,
    organizerId,
    status,
    imageUrls,
    createdAt,
    updatedAt)
}
```
