---
feature: home
routes:
  - path: /
    component: HomePage
access: public (no auth required)
collections:
  - seasons
  - leagues
  - tournaments
  - matches (collectionGroup)
---

Landing page — prikazuje hero baner, listu takmičenja grupisanu po sezonama i najnovije odigrane mečeve.

## HomePage — `/`

**Svrha:** Javna početna stranica (dostupna bez autentikacije). Prikazuje pregled svih takmičenja i poslednjih 5 završenih mečeva.

**Firestore operacije (one-time fetch, useEffect → Promise.all):**

- `seasons` — kolekcija, `orderBy('startDate', 'desc')` — za grupisanje po sezoni
- `leagues` — sve lige (bez filtera)
- `tournaments` — svi turniri (bez filtera)
- `matches` (collectionGroup) — svi mečevi iz svih pod-kolekcija; filtrira one sa `status === 'finished' || 'walkover'`, sortira po `updatedAt` desc, uzima prvih 5

**Logika:**

- Liga i turniri se spajaju u jednu listu (`_type: 'leagues'` ili `'tournaments'`)
- Grupisanje po `seasonId` — za svaki `seasonId` koji postoji u `seasons` niz prikazuje se horizontalni scroll red kartica
- Mečevi bez `competitionType`, `competitionId`, `roundId` ne dobijaju klikabilni link
- `toMatchCardProps` normalizuje `scores[]` u `sets[]` za `MatchCard` komponentu
- Horizontalni scroll takmičenja podržava drag (useDragScroll hook)

**UI specifičnosti:**

- Hero sekcija sa `bg-primary` — fiksna, ne koristi Container
- Takmičenja: horizontalni scroll, `TournamentCard` per item
- Mečevi: grid `lg:grid-cols-2`, `MatchCard` per item
- Nema paginacije, nema filtera

---

## Firestore kolekcije

| Kolekcija                                                    | Pristup | Napomena               |
| ------------------------------------------------------------ | ------- | ---------------------- |
| `seasons`                                                    | read    | orderBy startDate desc |
| `leagues`                                                    | read    | sve, bez filtera       |
| `tournaments`                                                | read    | sve, bez filtera       |
| `{competitionType}/{competitionId}/rounds/{roundId}/matches` | read    | collectionGroup query  |
