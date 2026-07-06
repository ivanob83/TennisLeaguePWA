---
feature: enrollment
routes: []
access: editor+ za upravljanje; svi autentifikovani za pregled tabova
collections:
  - leagues/{id}/enrollments
  - tournaments/{id}/enrollments
  - leagues/{id}/groups
  - tournaments/{id}/groups
  - leagues/{id}/rounds
  - tournaments/{id}/rounds
  - leagues/{id}/rounds/{roundId}/matches
  - tournaments/{id}/rounds/{roundId}/matches
---

Enrollment feature nema vlastite rute — sve komponente su embedded u `LeagueDetailPage` i `TournamentDetailPage` kao tabovi.
Feature pokriva: prijavu igrača, žreb (draw), grupne mečeve, knockout bracket, i rang listu po grupi.

## Komponenta: EnrollmentManager

**Svrha:** Dodavanje i uklanjanje igrača iz takmičenja.

**Props:** `{ competitionId, competitionType: 'leagues'|'tournaments' }`

**Logika:**

- Real-time listener na `{competitionType}/{competitionId}/enrollments` za listu prijavljenih.
- Na "Show list" — one-time fetch svih igrača iz `players` kolekcije.
- Filtriranje: već prijavljeni igrači su isključeni iz liste (poređenje po `playerId`).
- `handleEnroll`: kreira enrollment dokument sa `{ playerId, playerName, playerEmail, status: 'active', enrolledAt, enrolledBy: user.uid }`.
- `handleRemove`: briše enrollment dokument.

**Firestore operacije:**

| Kolekcija                 | Operacija        | Opis                      |
| ------------------------- | ---------------- | ------------------------- |
| `{type}/{id}/enrollments` | read (real-time) | Lista prijavljenih igrača |
| `players`                 | read (once)      | Svi igrači za selekciju   |
| `{type}/{id}/enrollments` | create           | Prijava igrača            |
| `{type}/{id}/enrollments` | delete           | Uklanjanje igrača         |

---

## Komponenta: CompetitionDrawTab

**Svrha:** Dodeljivanje prijavljenih igrača pozicijama u grupama (round_robin) ili seed pozicijama (knockout).

**Props:** `{ competitionType, competitionId, competition }`

**Logika:**

- Učitava `enrollments`, `groups`, i `rounds` real-time.
- Za round_robin/round_robin_knockout: prikazuje grupe sa `playerIds` nizom (null = prazna pozicija). Dodela igrača: upisuje se na prvi null slot u nizu, potom se ažuriraju svi `matches` u odgovarajućem round-u gde je `player1Position` ili `player2Position` jednak tom indeksu.
- Za knockout: čita `competition.seededPlayerIds` niz; dodela na prvu null poziciju, ažurira knockout round match slotove.
- `updateMatchSlots(roundId, position, playerId)`: getAll na `matches`, update svaki gde `player1Position === position` → `player1Id = playerId`, i analogno za player2.
- Uklanjanje igrača: vraća poziciju na `null` i poništava player ID u match slotovima.

**Firestore operacije:**

| Kolekcija                              | Operacija        | Opis                                       |
| -------------------------------------- | ---------------- | ------------------------------------------ |
| `{type}/{id}/enrollments`              | read (real-time) | Prijavljeni igrači                         |
| `{type}/{id}/groups`                   | read (real-time) | Grupe sa playerIds nizovima                |
| `{type}/{id}/rounds`                   | read (real-time) | Rounds za match slot ažuriranje            |
| `{type}/{id}/groups`                   | update           | Postavljanje playerIds niza                |
| `leagues` / `tournaments`              | update           | Postavljanje `seededPlayerIds` (knockout)  |
| `{type}/{id}/rounds/{roundId}/matches` | read + update    | Ažuriranje player1Id/player2Id po poziciji |

---

## Komponenta: GroupMatchesTab

**Svrha:** Prikaz round-robin match slotova grupisanih po round-u (jedna grupa = jedan round).

**Props:** `{ competitionType, competitionId }`

**Logika:**

- One-time fetch rounds filtriranih po `type == 'round_robin'`.
- One-time fetch enrollments (za prikaz imena igrača).
- Za svaki round: one-time fetch matches iz `{type}/{id}/rounds/{roundId}/matches`.
- Editor može inline da zakaže meč (`scheduleMatch` servis).
- Svaki meč ima link na detail stranicu: `/{type}/{id}/rounds/{roundId}/matches/{matchId}`.

**Firestore operacije:**

| Kolekcija                              | Operacija                            | Opis                                       |
| -------------------------------------- | ------------------------------------ | ------------------------------------------ |
| `{type}/{id}/rounds`                   | read (once, filter type=round_robin) | Lista round-robin rundi                    |
| `{type}/{id}/enrollments`              | read (once)                          | Imenovanje igrača                          |
| `{type}/{id}/rounds/{roundId}/matches` | read (once)                          | Match slotovi po rundi                     |
| `{type}/{id}/rounds/{roundId}/matches` | update                               | Zakazivanje meča (`scheduledAt`, `status`) |

---

## Komponenta: KnockoutTab

**Svrha:** Prikaz knockout bracket rundi i match slotova.

**Props:** `{ competitionType, competitionId }`

**Logika:** Ista kao `GroupMatchesTab`, samo filtrira rounds po `type == 'knockout'`. Rounds su sortirani po `roundNumber` asc. Svaki meč ima inline scheduling i link na detail.

**Firestore operacije:** Identične sa `GroupMatchesTab` ali za knockout rounds.

---

## Komponenta: GroupStandingsTab

**Svrha:** Prikaz rang liste po grupi na osnovu završenih mečeva.

**Props:** `{ competitionType, competitionId, competition }`

**Logika:**

- One-time fetch groups i round-robin rounds.
- Za svaku grupu: one-time fetch matches iz odgovarajućeg round-a.
- `computeStandings(matches, playerIds, pointsPerWin, pointsPerLoss)`: prolazi kroz `finished`/`walkover` mečeve, broji wins/losses, sets won/lost. Sortira po: points desc → wins desc → setsDiff desc.
- `pointsPerWin` i `pointsPerLoss` se čitaju iz `competition` objekta (default: 3/0).
- Top 2 igrača su vizuelno istaknuta.

**Firestore operacije:**

| Kolekcija                              | Operacija                            | Opis                            |
| -------------------------------------- | ------------------------------------ | ------------------------------- |
| `{type}/{id}/rounds`                   | read (once, filter type=round_robin) | Rounds za matching sa grupama   |
| `{type}/{id}/groups`                   | read (once)                          | Grupe sa playerIds              |
| `{type}/{id}/enrollments`              | read (once)                          | Imenovanje igrača               |
| `{type}/{id}/rounds/{roundId}/matches` | read (once)                          | Mečevi za standings kalkulaciju |

---

## Servis: createCompetitionSlots

**Svrha:** Kreira sve grupe, runde i match slotove kada se takmičenje prvi put formira.

**Poziva se iz:** `LeagueCreatePage` i `TournamentCreatePage` odmah nakon kreiranja competition dokumenta.

**Logika po formatu:**

- **round_robin / round_robin_knockout:** Za svaku grupu (`numGroups`): kreira group dokument sa `playerIds: Array(playersPerGroup).fill(null)`, kreira round (`type: 'round_robin'`), kreira match slotove za sve unikatne parove pozicija (formula: `rrPairs(n)` = sve kombinacije 1..n). Match slotovi imaju `player1Id: null`, `player2Id: null`, `status: 'not_scheduled'`.

- **knockout:** Kreira jedan knockout round, generiše `n/2` match slotova sa seed parovanjem 1 vs N, 2 vs N-1, itd.

**Firestore operacije:**

| Kolekcija                              | Operacija | Opis                                |
| -------------------------------------- | --------- | ----------------------------------- |
| `{type}/{id}/groups`                   | create    | Jedna po grupi                      |
| `{type}/{id}/rounds`                   | create    | Jedan po grupi (RR) ili jedan (KO)  |
| `{type}/{id}/rounds/{roundId}/matches` | create    | Svi match slotovi (null player IDs) |

---

## Servis: deleteCompetition

**Svrha:** Kaskadno briše takmičenje i sve njegove subkolekcije.

**Poziva se iz:** Delete akcija na `LeagueDetailPage` i `TournamentDetailPage`.

**Redosled brisanja (bitan zbog Firestore subcollection semantike):**

1. Sve matches u svakom round-u
2. Sve rounds
3. Sve groups
4. Sve enrollments
5. Sam competition dokument (`leagues/{id}` ili `tournaments/{id}`)

---

## Napomene

- Match slotovi se kreiraju sa `null` player ID-jevima — draw faza ih popunjava.
- `round_robin_knockout` format: knockout faza (Sprint 3) se generiše nakon što se završi RR faza; trenutno se kreira samo RR deo.
- Enrollment dokument čuva `playerName` i `playerEmail` denormalizovano (bez JOIN-a u queries).
- `leagueEnrollmentRepository` i `tournamentEnrollmentRepository` su factory funkcije koje vraćaju repository za specifičnu subkolekciju.
