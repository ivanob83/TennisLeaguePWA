# Feature 01 — Expand Round-Robin League (add players to existing groups)

**Status:** Planning
**Target:** Liga "2026 Ciklus 1" — proširenje grupa sa N na 10 igrača bez dirana postojećih mečeva.

## Cilj

Omogućiti adminu da poveća `playersPerGroup` na već aktivnoj round-robin ligi. Operacija je strogo aditivna:

- Postojeći group dokumenti — samo append nulls u `playerIds` niz.
- Postojeći match dokumenti — **netaknuti** (status, scheduledAt, sets, winnerId, sve ostaje).
- Novi match slotovi — kreiraju se samo za nove parove pozicija.
- Postojeći enrollments — netaknuti.

## Konstanta domena (zašto je ovo izvodljivo)

Match slotovi koriste `player1Position` / `player2Position` (1-indexed). Group ima `playerIds: Array(playersPerGroup).fill(null)` — fixed-size pozicioni niz. Postojeći mečevi referenciraju pozicije koje već postoje, pa se ne moraju regenerisati. Novi parovi pozicija dolaze samo za `pos > oldSize`.

Vidi `app/src/features/enrollment/services/competitionSlots.js:21-27` (`rrPairs`).

## Algoritam ekspanzije

Ulaz: `leagueId`, `newPlayersPerGroup`.

```
1. Read league. Validate:
   - format ∈ {round_robin, round_robin_knockout}
   - newPlayersPerGroup > league.playersPerGroup
   - status ≠ completed/archived
   - Za round_robin_knockout: KO faza još ne sme biti generisana (provera roundsRepository.query type=knockout → empty)

2. oldSize = league.playersPerGroup
   newSize = newPlayersPerGroup
   delta   = newSize - oldSize

3. Update league:
   - playersPerGroup = newSize
   (numGroups ostaje isti — ne diramo broj grupa u ovoj operaciji)

4. Za svaku grupu (leagueGroupsRepository(leagueId).getAll()):
   a. Update group.playerIds = [...group.playerIds, ...Array(delta).fill(null)]
   b. Find round za tu grupu (roundsRepository.query type=round_robin, groupId=group.id)
   c. newPairs = svi (i, j) gde i<j, oba ∈ [1..newSize], i (i > oldSize OR j > oldSize)
      → ekvivalentno: rrPairs(newSize) MINUS rrPairs(oldSize)
   d. Za svaki newPair: matchesRepository.create({
        competitionId: leagueId,
        competitionType: 'league',
        roundId: round.id,
        groupId: group.id,
        player1Position, player2Position,
        player1Id: null, player2Id: null,
        status: 'not_scheduled',
        scheduledAt: null,
        generated: true,
      })
```

### Broj novih mečeva po grupi

`C(newSize, 2) - C(oldSize, 2)`. Primer 8 → 10: `45 - 28 = 17` novih mečeva po grupi.

### Pairs delta — tačna formula

Novi parovi su:
- Stari igrač × novi: `oldSize * delta` parova → (i ∈ [1..oldSize], j ∈ [oldSize+1..newSize])
- Novi × novi: `C(delta, 2)` parova → (i, j ∈ [oldSize+1..newSize], i<j)

Ukupno = `oldSize*delta + delta*(delta-1)/2`. Za 8→10: `8*2 + 1 = 17`. ✓

## Implementacija

### Novi servis
`app/src/features/enrollment/services/expandRoundRobin.js`

```js
import {
  leaguesRepository,
  leagueGroupsRepository,
  roundsRepository,
  matchesRepository,
} from '../../../infrastructure/firestore.js'

export async function expandRoundRobinLeague(leagueId, newPlayersPerGroup) {
  const league = await leaguesRepository.getById(leagueId)
  if (!league) throw new Error('League not found')
  if (!['round_robin', 'round_robin_knockout'].includes(league.format))
    throw new Error('Only round-robin formats supported')
  const oldSize = league.playersPerGroup
  if (newPlayersPerGroup <= oldSize)
    throw new Error(`newPlayersPerGroup must be > ${oldSize}`)
  if (['completed', 'archived'].includes(league.status))
    throw new Error('Cannot expand completed/archived league')

  const rRepo = roundsRepository('leagues', leagueId)

  if (league.format === 'round_robin_knockout') {
    const koRounds = await rRepo.query([{ field: 'type', op: '==', value: 'knockout' }])
    if (koRounds.length > 0) throw new Error('Knockout phase already generated; expansion blocked')
  }

  const groupsRepo = leagueGroupsRepository(leagueId)
  const groups = await groupsRepo.getAll()
  const allRounds = await rRepo.getAll()

  await leaguesRepository.update(leagueId, { playersPerGroup: newPlayersPerGroup })

  const newPairs = []
  for (let i = 1; i <= newPlayersPerGroup; i++)
    for (let j = i + 1; j <= newPlayersPerGroup; j++)
      if (i > oldSize || j > oldSize) newPairs.push([i, j])

  for (const group of groups) {
    const padded = [...group.playerIds, ...Array(newPlayersPerGroup - group.playerIds.length).fill(null)]
    await groupsRepo.update(group.id, { playerIds: padded })

    const round = allRounds.find((r) => r.type === 'round_robin' && r.groupId === group.id)
    if (!round) continue

    const mRepo = matchesRepository('leagues', leagueId, round.id)
    await Promise.all(
      newPairs.map(([p1Pos, p2Pos]) =>
        mRepo.create({
          competitionId: leagueId,
          competitionType: 'league',
          roundId: round.id,
          groupId: group.id,
          player1Position: p1Pos,
          player2Position: p2Pos,
          player1Id: null,
          player2Id: null,
          status: 'not_scheduled',
          scheduledAt: null,
          generated: true,
        })
      )
    )
  }
}
```

### UI integracija

Mesto: `LeagueDetailPage` Setup tab (samo editor+, samo za RR formate, samo `status ∈ draft|active`).

Dugme: **"Expand groups (add player slots)"** → otvara `Modal` sa:
- Read-only: trenutni `numGroups`, trenutni `playersPerGroup`
- Input: `newPlayersPerGroup` (number, min = oldSize+1)
- Preview: "Will create X new match slots per group, Y total."
- Confirm dugme → poziva `expandRoundRobinLeague(leagueId, newSize)`
- Toast success → refresh tabova

Komponenta nova: `app/src/features/leagues/components/ExpandGroupsDialog.jsx`.

### Toast/feedback
Success: "Expanded groups to N players. M new match slots created."
Error: prikaz error.message (npr. "Knockout phase already generated; expansion blocked").

## Šta NE diramo

| Šta | Zašto |
|---|---|
| Postojeći matches (status, scheduledAt, sets, winnerId, pendingSets) | Strogi zahtev korisnika — bez `update` na njima |
| `numGroups` | Druga operacija; menjanje broja grupa zahteva premapiranje grupa i nije aditivno |
| Postojeći enrollments | Lista prijavljenih ostaje; novi se dodaju kroz EnrollmentManager kao i pre |
| Postojeći `playerIds` slotovi u grupama | Samo append nulls na kraj |
| `tierMultipliers` | Ostaje isti po grupi (već u group dokumentu kao `rankingMultiplier`) |
| Rankings | `recalculateRankings` ne treba zvati — nijedan finished meč nije promenjen |

## Edge cases

1. **Tiered grupe** — `rankingMultiplier` po grupi ostaje. Novi mečevi u toj grupi dobijaju isti multiplier kroz `rankingService` (čita iz group doc-a).
2. **Group sa playerIds.length ≠ league.playersPerGroup** (drift) — defenzivno: pad uvek do `newPlayersPerGroup` bez obzira na trenutni length grupe.
3. **Concurrent expansion** — bez transaction wrappera. Ako dva admin-a istovremeno pozovu, drugi će kreirati duplikate match slotova. Mitigacija: client-side disable dugmeta dok traje + idempotent check (read postojeće matches za round, filter newPairs minus already-existing). **Preporuka:** dodati idempotentnost kroz `query` postojećih `(player1Position, player2Position)` parova pre `create`.
4. **`round_robin_knockout` sa već generisanom KO fazom** — blokirano. Ako se traži ekspanzija nakon KO generisanja, treba poseban flow (van scope #1).
5. **Draw stanje** — postojeći igrači ostaju na svojim pozicijama (jer index ostaje isti). Novi sloti su null → admin ih popunjava kroz CompetitionDrawTab.

## Test plan (manuelno; nema test suite-a)

1. Backup Firestore: `npm run backup` (vidi [docs/10-firestore-backup.md](../../docs/10-firestore-backup.md) za restore).
2. Na test ligi `2026 Ciklus 1` — proveriti trenutno: `numGroups`, `playersPerGroup`, broj match dokumenata po round-u.
3. Pokrenuti expansion na newSize.
4. Verifikacije:
   - `league.playersPerGroup == newSize`
   - Svaka group: `playerIds.length == newSize`, prvih `oldSize` vrednosti netaknuto.
   - Postojeći mečevi: nijedan `updatedAt` se ne menja (provera kroz Firestore console).
   - Novi mečevi: tačno `oldSize*delta + C(delta,2)` po grupi, svi `status: not_scheduled`, `player1Id/player2Id: null`.
   - GroupMatchesTab prikazuje stare + nove slotove.
   - GroupStandingsTab — standings nepromenjen za stare igrače.
5. Dodati novog igrača kroz EnrollmentManager → CompetitionDrawTab → assign na novi slot → `updateMatchSlots` popunjava player IDs samo u novim mečevima.

## Otvorena pitanja

- Da li `2026 Ciklus 1` trenutno ima `round_robin` ili `round_robin_knockout`? Ako KO — proveriti da li je KO faza generisana.
- Da li se traži dodavanje novih grupa ili samo proširenje postojećih? (Ovaj doc pokriva samo proširenje. Dodavanje grupa je odvojen feature.)
- Authorization: superadmin ili editor? Predlog: editor+.

## Odgovori
- round robin trenutno bez knockout sistem sa promotions/demotion per group
- nema dodavanja grupa samo prosirenje
- super admi za sada

## Sprints

Backup je urađen (`npm run backup`). Ide u 3 sprinta + verifikacija.

### Sprint 1 — Servis ekspanzije (core logika)

Cilj: čista, idempotentna funkcija `expandRoundRobinLeague` bez UI-a.

- [ ] **T1.1** Kreiraj `app/src/features/enrollment/services/expandRoundRobin.js` po template-u iz sekcije Implementacija.
- [ ] **T1.2** Dodaj idempotentnost: pre `mRepo.create`, učitaj postojeće matches za round, filtriraj `newPairs` da ukloniš već postojeće `(player1Position, player2Position)` parove. Sprečava duplikate kod retry/concurrent.
- [ ] **T1.3** Validacije po listi (format, status, newSize > oldSize, KO faza ne postoji). Throws sa jasnim porukama.
- [ ] **T1.4** Defenzivni padding: pad grupa do `newPlayersPerGroup` nezavisno od trenutnog length-a (drift case).
- [ ] **T1.5** Vrati metrike: `{ groupsUpdated, matchesCreated, perGroup }` — UI koristi za toast.
- [ ] **T1.6** Dry-run flag: `expandRoundRobinLeague(leagueId, newSize, { dryRun: true })` — vraća šta bi se kreiralo, ne piše ništa. Koristi se u UI preview-u.
- [ ] **T1.7** Hard-guard "no destructive ops": servis sme samo `create` (matches) + `update` (league.playersPerGroup, group.playerIds append). Eksplicitno zabranjeno: `matchesRepository.delete`, `update` na postojećim match dokumentima, izmena prvih `oldSize` elemenata `group.playerIds`. Implementacija:
  - Snapshot pre operacije: učitaj sve matches po grupama (id + roundId) → `existingMatchIds: Set`.
  - Posle operacije (ili kod dry-run): assert da svaki id iz snapshot-a još postoji i pripada istoj `roundId`/`groupId`. Ako fail → throw `'Invariant violated: existing match modified or deleted'`.
  - Snapshot prvih `oldSize` `playerIds` po grupi → posle update assert `padded.slice(0, oldSize)` deep-equal originalu.
  - Code review checklist u doc-u: nijedan poziv `matchesRepository(...).delete` / `.update` u fajlu.

- [ ] **T1.8** Round display BYE row za neparan `playersPerGroup`.

  **Analiza data modela:**
  - `competitionSlots.js:53-62` kreira **JEDAN** `round` dokument po grupi (`type: 'round_robin'`, `roundNumber = group.position`).
  - Svi `C(n, 2)` mečevi grupe žive pod tim jednim round-om kao subcollection `matches`.
  - Ne postoji "matchday" / "kolo" koncept u Firestore-u.

  **Analiza display logike (`GroupMatchesTab.jsx:66-85` — `groupIntoRounds`):**
  - Greedy bin-packing matches u virtuelne runde.
  - Za svaki match: stavi u prvu rundu gde nijedan od `player1Position` / `player2Position` nije već iskorišćen.
  - Ako ne staje → otvori novu rundu.
  - Maksimum matches po virtuelnoj rundi = `floor(n/2)`.

  **Posledica za neparan n:**
  - n=9: `floor(9/2)=4` mečeva po rundi. Po rundi tačno **1 igrač sedi** (BYE).
  - Trenutni UI prikazuje samo 4 reda (mečeve). BYE igrač (pozicija koja se ne pojavljuje u toj rundi) se ne renderuje → korisnik vidi 4 reda umesto očekivanih 5.
  - Za paran n nema BYE-a (svi igraju svake runde).

  **Predlog fix-a (UI-only, bez data izmena):**
  - U `GroupMatchesTab.jsx:groupIntoRounds` ili u `GroupRoundView` render: posle bin-packing-a, za svaku virtuelnu rundu izračunaj `missingPositions = [1..playersPerGroup] \ used`.
  - Ako `missingPositions.length === 1` → prikaži BYE red (jedan player, "BYE", neutralna kartica). Ako `> 1` → fallback (možda više nedostajućih kod razlomljenih grupa) — prikaži sve kao BYE redove.
  - BYE red ne mora da bude `MatchCard`. Lakša verzija: mali pasus `"<PlayerName> — BYE this round"`.
  - Rešenje player imena: koristi `group.playerIds[pos-1]` → `enrollments`/`players` lookup (isto kao `buildCardMatch`).

  **Edge cases:**
  - Grupa sa praznim `playerIds` slotovima (null) → BYE red treba da prikaže "Empty slot" ili sakrije ako je null.
  - Tournament mode (single round, fewer matches) — proveri da fix ne lomi turnir prikaz.

  **Skoupli ovog taska:**
  - Samo display. Ne diramo data model. Ne stvaramo BYE match dokumente.
  - Ne menjamo `expandRoundRobin.js` — taj servis je strogo aditivan i ne treba da zna za BYE concept.

  **Definition of done:** otvori ligu sa neparnim `playersPerGroup` (npr. expand 8→9), Group Matches tab za svaku virtuelnu rundu prikazuje 4 meč karte + 1 BYE red. Paran broj — bez BYE redova (kao i ranije).

**Definition of done (Sprint 1):** servis ručno pozvan iz konzole na test ligi vrati ispravne metrike, drugi poziv vrati 0 novih (idempotent), invariant assert prolazi (broj postojećih matches identičan pre/posle, `updatedAt` nepromenjen). T1.8: BYE red vidljiv za neparan `playersPerGroup`.

### Sprint 2 — UI (ExpandGroupsDialog + LeagueDetailPage)

- [ ] **T2.1** Kreiraj `app/src/features/leagues/components/ExpandGroupsDialog.jsx`. Modal sa: read-only `numGroups` + trenutni `playersPerGroup`, input `newPlayersPerGroup` (min = oldSize+1), live preview poziva dry-run servisa.
- [ ] **T2.2** Dugme "Expand groups (add player slots)" u Setup tabu `LeagueDetailPage`. Visible samo: `isSuperadmin && format ∈ {round_robin, round_robin_knockout} && status ∈ {draft, active}`.
- [ ] **T2.3** Confirm flow: disable dugme tokom poziva (sprečava double-submit), success toast `"Expanded groups to N players. M new match slots created."`, error toast prikazuje `error.message`.
- [ ] **T2.4** Refresh: posle uspeha, refetch league + groups + matches da se Setup/Draw/Matches tabovi ažuriraju.

**Definition of done:** superadmin može kroz UI da proširi test ligu, ne-superadmin ne vidi dugme.

### Sprint 3 — Manuelni test plan + edge cases

- [ ] **T3.1** Pokreni full test plan iz sekcije "Test plan" na `2026 Ciklus 1` (ili kloniranoj test ligi).
- [ ] **T3.2** Verifikuj kroz Firestore console da `updatedAt` postojećih matches nije promenjen.
- [ ] **T3.3** Brojanje: `oldSize*delta + C(delta,2)` po grupi vs stvarno kreirano.
- [ ] **T3.4** Add new player → CompetitionDrawTab → assign na novi slot → potvrdi da `updateMatchSlots` popuni samo nove mečeve.
- [ ] **T3.5** Tiered group: novi meč u grupi sa `rankingMultiplier ≠ 1` — proveri da `rankingService` koristi pravi multiplier.

**Definition of done:** sve verifikacije prolaze, postojeći mečevi netaknuti.

### Out of scope (ne radi se sada)

- Dodavanje novih grupa (samo proširenje postojećih).
- Skidanje `playersPerGroup` (samo expand, nikad shrink).
- KO faza u `round_robin_knockout` (trenutna liga je čist `round_robin`).
- Transaction wrapper (idempotentnost iz T1.2 + UI disable dovoljni za single-admin scenario).

## Sledeći feature

#02 — Player availability messages (parsiranje "mogu sreda posle 17") + admin uparivanje + slanje potvrda igračima.
#03 — Auto-add scheduled match u Google Calendar.
