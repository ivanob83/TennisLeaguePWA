---
feature: leagues
routes:
  - path: /leagues
    component: LeaguesPage
  - path: /leagues/create
    component: LeagueCreatePage
  - path: /leagues/:leagueId
    component: LeagueDetailPage
  - path: /leagues/:leagueId/edit
    component: LeagueEditPage
  - path: /leagues/:leagueId/enroll
    component: LeagueEnrollPage
access:
  read: authenticated
  create/edit: editor+
  delete: superadmin
collections:
  - leagues
  - seasons
  - leagues/{leagueId}/enrollments (via EnrollmentManager)
  - leagues/{leagueId}/rounds (via tabs)
  - leagues/{leagueId}/rounds/{roundId}/matches (via tabs)
---

CRUD za lige. Liga je takmičenje unutar sezone sa formatom `round_robin`, `knockout` ili `round_robin_knockout`. Nakon kreiranja liga dobija match slotove i ide kroz flow: enrollment → draw → grupna faza / knockout.

## LeaguesPage — `/leagues`

**Firestore:**
- `seasons` — real-time, `orderBy('startDate', 'desc')` — za filter dropdown
- `leagues` — real-time; filtrira po `seasonId` ako je izabrana sezona, `orderBy('createdAt', 'desc')`

**Logika:**
- Dropdown za filter po sezoni (opciono)
- Editor vidi dugme `+ New League` i link `+ New Season`
- Grid kartica (TournamentCard); svaka ima "View →" link ka detalju

---

## LeagueCreatePage — `/leagues/create`

**Access:** editor+

**Firestore:**
- `seasons` — real-time, za dropdown
- `leagues` — create (leaguesRepository.create)
- Nakon create: `createCompetitionSlots(payload, league.id, 'leagues')` — generiše round + match slotove

**Forma polja:**
- `seasonId` (required), `name` (required), `format` (required)
- Za `round_robin` / `round_robin_knockout`: `numGroups`, `playersPerGroup`, `pointsPerWin` (default 3), `pointsPerLoss` (default 0)
- Za `knockout`: `numPlayers` (min 2, mora biti paran)
- `rules` (optional)

**Payload koji se čuva:**
```js
{ seasonId, name, format, numGroups, playersPerGroup, pointsPerWin, pointsPerLoss,
  numPlayers, seededPlayerIds (array of nulls za KO),
  tierMultipliers (number[] | null), promotionCount (number | null), relegationCount (number | null),
  rules, organizerId, status: 'draft' }
```

**Tiered grupe (opciono za round_robin):**
Checkbox "Tiered groups" otvara sekciju gde se za svaku grupu unosi `rankingMultiplier` (0–1, npr. A=1.0, B=0.75, C=0.5) i `promotionCount`/`relegationCount`. Ako je tiered, `createCompetitionSlots` upisuje `rankingMultiplier` direktno na svaki Group dokument. `rankingService` čita taj multiplier i mnoji ranking bodove za mečeve iz te grupe.

**Nakon submit:** redirect na `/leagues/:leagueId`

---

## LeagueDetailPage — `/leagues/:leagueId`

**Access:** svi authenticated; tabovi "Setup" i "Draw" samo editor+

**Firestore:**
- `leagues/{leagueId}` — real-time doc
- `seasons` — real-time kolekcija (za prikaz naziva sezone)

**Tabovi (dinamički, zavisno od formata i role):**
- `setup` — editor only; prikazuje format, sezonu, status, grupe, poene, pravila; dugme za Edit
- `draw` — editor only; `EnrollmentManager` + `CompetitionDrawTab`
- `group_matches` — samo za `round_robin` / `round_robin_knockout`; `GroupMatchesTab`
- `standings` — samo za `round_robin` / `round_robin_knockout`; `GroupStandingsTab`
- `knockout` — samo za `knockout` / `round_robin_knockout`; `KnockoutTab`

**Delete:**
- Dugme "Delete" vidljivo samo superadmin-u
- Koristi `deleteCompetition(leagueId, 'leagues')` — briše enrollment, rounds, matches
- Potvrda putem `ConfirmDialog`
- Nakon delete: redirect na `/leagues`

---

## LeagueEditPage — `/leagues/:leagueId/edit`

**Access:** editor+

**Firestore:**
- `leagues/{leagueId}` — real-time doc (za inicijalni load forme)
- `seasons` — real-time kolekcija
- `leagues/{leagueId}` — update (leaguesRepository.update)
- Opcioni upload slike: `uploadCompetitionImage(leagueId, imageSrc, croppedAreaPixels)` → čuva `imageUrls` u dokument

**Forma:** name, seasonId, format, numGroups, playersPerGroup, rules, imageUrls
**Note:** ne menja `numPlayers` / `seededPlayerIds` — samo metadata

---

## LeagueEnrollPage — `/leagues/:leagueId/enroll`

**Napomena:** Ova stranica je zastarela — funkcionalnost je preseljena u tabove na `LeagueDetailPage`. Još uvek postoji u rutama ali nije u navigaciji.

**Prikazuje:** Setup i Draw tabove, koristi `EnrollmentManager` i `CompetitionDrawTab`

---

## Firestore kolekcije

| Kolekcija | Pristup | Napomena |
|---|---|---|
| `leagues` | read/write | osnovna CRUD kolekcija |
| `seasons` | read | za dropdown i naziv |
| `leagues/{id}/enrollments` | read/write | via EnrollmentManager |
| `leagues/{id}/rounds` | read/write | via Draw/Matches tabovi |
| `leagues/{id}/rounds/{rid}/matches` | read/write | via tabovi |
| `leagues/{id}/rankings` | read/write | via rankingService |
