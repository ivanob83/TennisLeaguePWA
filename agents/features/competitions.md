---
feature: competitions
routes:
  - /competitions
access: authenticated users (all); editor+ for create actions
collections:
  - seasons
  - leagues
  - tournaments
---

Displays all leagues and tournaments grouped by season. Read-only listing page — no data mutations here.

## Page: CompetitionsPage `/competitions`

**Svrha:** Pregled svih takmičenja grupisanih po sezoni.

**Logika:**

- Učitava sve dokumente iz `seasons` (sortirano po `startDate desc`), `leagues` (sortirano po `createdAt desc`), i `tournaments` (sortirano po `createdAt desc`) u paralelu putem `useFirestoreCollection` real-time listenera.
- Spaja leagues i tournaments u jedan niz i grupiše po `seasonId`. Takmičenja bez `seasonId` idu pod ključ `__none__` (prikazuju se na kraju kao "No Season").
- Redosled sezona prati Firestore rezultat (`startDate desc`); prikazuju se samo sezone koje imaju bar jedno takmičenje.
- Svaka kartica (TournamentCard) prikazuje: naziv, tip (`League` / `Tournament`), format takmičenja kao "status", i sliku ako postoji. Klik vodi na `/leagues/:id` ili `/tournaments/:id`.

**Access control:**

- Svi autentifikovani korisnici vide listu.
- `isEditor` korisnici vide akcione dugmiće `+ League` (→ `/leagues/create`) i `+ Tournament` (→ `/tournaments/create`).

**Firestore operacije:**

| Kolekcija     | Operacija | Opis                                                 |
| ------------- | --------- | ---------------------------------------------------- |
| `seasons`     | read      | Sve sezone, sortirane po `startDate desc`            |
| `leagues`     | read      | Svi turniri tipa liga, sortirani po `createdAt desc` |
| `tournaments` | read      | Svi turniri, sortirani po `createdAt desc`           |

## Napomene

- `TournamentCard` prima `{ name, season: 'League'|'Tournament', status: format, image }` — `status` polje prikazuje format takmičenja, ne status.
- Nema paginacije; učitava sve dokumente odjednom.
