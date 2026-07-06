# Feature 04 — Weekly calendar availability editor

**Status:** Planning
**Target:** Zameniti/dopuniti `Quick entry` tab vizuelnim nedeljnim kalendarom sa satnim ćelijama. Admin bira igrača, preklikava ćelije za celu nedelju, i jednim "Save" upisuje sve slotove. Kasnije isti UI nudi se i igračima u njihovom profilu (self-service).

## Cilj i motivacija

Trenutni `QuickAvailabilityForm` (vidi `app/src/features/scheduling/components/QuickAvailabilityForm.jsx`) je dobar za 1–2 slota, ali postaje spor kad admin unosi celu nedelju za jednog igrača (4–10 prozora):

- Preset chip "Cela ova nedelja popodne" pravi 17–21 svakog dana — previše rigidno.
- Custom datetime input traži klik za svaki prozor.
- Nema vizuelnog overview-a šta je već uneto.

Cilj: **jedan ekran = ceo nedeljni raspored za jednog igrača**, čitljiv kao Google Calendar week view, brzo editovanje preklikavanjem.

**Eksplicitno NIJE u scope-u:**

- Drag-to-select range (klikni početak, povuci do kraja). Odložiti za V2 ako iz UX-a izađe potreba.
- Recurring weekly availability ("svaki ponedeljak 18–21 zauvek"). Tabela `playerAvailability` ostaje neperiodična; recurring je #05.
- Push notifikacija drugim adminima da je availability promenjen.
- Player self-service u istoj iteraciji — UI komponenta se pravi reusable, ali rute/access izmena je sledeći korak (#04b).

## Predloženo rešenje

### UI layout (Tab 1 → "Calendar entry")

```
┌─ Player: [Combobox]  Scope: [All competitions ▾]  Week: [‹] 04.05 – 10.05 [›]  [Today] ┐
│                                                                                          │
│         Mon 04.05  Tue 05.05  Wed 06.05  Thu 07.05  Fri 08.05  Sat 09.05  Sun 10.05    │
│  07:00  [        ] [        ] [        ] [        ] [        ] [        ] [        ]    │
│  08:00  [        ] [        ] [        ] [        ] [        ] [        ] [        ]    │
│  ...                                                                                    │
│  17:00  [        ] [████████] [        ] [████████] [        ] [████████] [        ]    │
│  18:00  [        ] [████████] [        ] [████████] [        ] [████████] [        ]    │
│  19:00  [        ] [████████] [        ] [        ] [        ] [████████] [        ]    │
│  20:00  [        ] [        ] [        ] [        ] [        ] [████████] [        ]    │
│  21:00  [        ] [        ] [        ] [        ] [        ] [        ] [        ]    │
│  22:00  [        ] [        ] [        ] [        ] [        ] [        ] [        ]    │
│                                                                                          │
│  Legend: empty = not available, filled = available, hashed = consumed (locked)          │
│                                                                                          │
│                                                                  [Cancel] [Save 5 slots]  │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

**Konstante:**

- `HOUR_RANGE = [7, 23]` — 16 rows. Tenis ne treba pre 7 ujutru ili posle 22h. Konfigurabilno kroz konstantu fajla, ne runtime.
- `SLOT_MINUTES = 60` — jedan red = 1h. (Granica donja: 30 min — ne idemo niže za tenis.)
- `DAYS_PER_WEEK = 7` — Mon–Sun, ISO week. Lokalizovani nazivi `sr-Latn` (Pon, Uto, ...).

**Interakcija:**

- Klik na ćeliju → toggle (selected ↔ deselected). Optimistic state, ne piše još u Firestore.
- Cmd/Ctrl+klik na header dana → toggle ceo dan (sve satnice).
- Klik na header sata (npr. "17:00") → toggle taj sat preko cele nedelje. (Korisno za "popodne celu nedelju".)
- "Save N slots" računa diff vs original snapshot i piše batch u Firestore. N broji **promene** (nove + obrisane + nepromenjene).
- "Cancel" reverta optimistic state na original snapshot, navigacija nedelje gubi nečuvane promene (sa confirm dialogom).

**Postojeći (consumed) slotovi:**

- Render kao "hashed" pattern, **locked** — klik ne radi, tooltip "Consumed by match {matchId}".
- Ne ulaze u diff računicu.

**Preklapajući slotovi (već postojeći Firestore docs koji prelaze 2+ ćelije):**

- Render kao kontinuirani blok (jedan `<div>` koji pokriva više grid cells preko `grid-row: span N`).
- Toggle ćelije unutar bloka **deli** blok na nove segmente. (Vidi "Save semantika" niže.)

### Save semantika

Najbitnija odluka: **kako mapirati matrix selekciju na `playerAvailability` dokumenta.**

#### Opcija A — Jedan doc po ćeliji (1h)

- ✅ Trivijalan diff: `{added: [...], removed: [...]}`.
- ❌ Inflates Firestore: nedelja popodneva 17–21 × 7 = 28 dokumenata umesto 7.
- ❌ Pairing engine (`intersectWindows` u `app/src/features/scheduling/utils/overlap.js`) već podržava liste prozora — fragmentacija ne ruši logiku, ali "MIN_MATCH_MINUTES = 90" filter će pozvati 1h ćelije kao validan ako su susedne (radi, ali sporije).
- ❌ Igrač "viber poruka 03.05 21:14 → mogu pon 17–21" gubi semantiku jednog prozora.

#### Opcija B — Merge konsekutivnih ćelija po danu u jedan doc

- ✅ Jedan blok 17–21 = jedan doc. Konzistentno sa trenutnim modelom (preset chips već prave 1 doc po blok).
- ✅ Pairing engine radi efikasnije.
- ❌ Diff je složeniji: original prozori se dele na cells, nove cells se mergeuju nazad u prozore, pa se računa `(addedBlocks, removedDocIds, modifiedDocIds)`.
- ❌ Edit postojećeg prozora (split): jedan doc se briše, dva nova se kreiraju → potencijalan gubitak `notes` i `createdBy` istorije.

**Preporuka: Opcija B** + sledeća pravila za split:

1. Ako se ceo prozor toggle-uje OFF (sve njegove ćelije) → `delete` taj doc.
2. Ako se prozor skrati (krajne ćelije OFF, sredina ON) → `update` doc-a sa novim `start/end`.
3. Ako se prozor seče po sredini (rupa) → `delete` original + `create` 2+ nova doc-a.
4. Nove ćelije van postojećih prozora → grupiši konsekutivne po danu → `create`.

Implementacija: helper `diffWeek(originalDocs, selectedCells) → { creates, updates, deletes }`. Test ovo unit-test ili manuelno (ovaj projekat nema test suite).

### Diff helper skica

```js
// app/src/features/scheduling/utils/weekDiff.js

// Convert hour cells back to contiguous per-day blocks.
// Input: Set<string> with cell keys "YYYY-MM-DD-HH".
// Output: Array<{ date: 'YYYY-MM-DD', startHour, endHour }> (endHour exclusive).
export function cellsToBlocks(cellSet) {
  /* ... */
}

// Compute create/update/delete instructions.
// originalDocs: Array<{id, start, end, ...}> editable docs only (consumed excluded)
// selectedCells: Set<string>
// returns { creates, updates, deletes }
export function diffWeek(originalDocs, selectedCells) {
  const desiredBlocks = cellsToBlocks(selectedCells)
  const originalBlocks = originalDocs.map(docToBlock)

  // Match by exact (date, startHour, endHour) → no-op.
  // Match by overlap → update if endpoints differ.
  // Unmatched original → delete.
  // Unmatched desired → create.
  // ...
}
```

Edge: ako original blok pokriva 2 dana (npr. petak 22 → subota 02 — malo verovatno za tenis), trtaj kao 2 zasebna bloka u UI, ali pri save spoji. **Odluka: ne podržavamo prelazak preko ponoći u UI.** Ako ulazni doc pređe ponoć, prikaži ga **read-only** sa notice. Nove edit-e admin pravi unutar jedne nedelje.

### Komponente

```
app/src/features/scheduling/components/calendar/
├── WeekCalendarEditor.jsx      # main: props {playerId, week, scope}
├── WeekHeader.jsx              # week navigator + day labels (Mon dd.MM)
├── HourGrid.jsx                # 16×7 grid, click handling, render of blocks/cells
├── HourCell.jsx                # single cell (selected/empty/consumed)
└── SaveBar.jsx                 # diff summary + Save/Cancel
```

```
app/src/features/scheduling/utils/
├── weekDiff.js                 # diff helper (vidi gore)
└── weekRange.js                # mondayOf(date), addDays, formatWeekLabel, etc.
```

### Integracija u `SchedulingPage`

`SchedulingPage.jsx` već ima `TABS = [entry, pairs]`. Promene:

- Preimenovati `entry` → "Quick entry" → opcija da ostane isti ekran.
- Dodati novi tab `calendar`: `{ id: 'calendar', label: 'Calendar entry' }`. Default tab postaje `calendar` jer je primarni flow.
- `Quick entry` tab ostaje kao fallback (custom datetime + notes preset). Nije obavezno ukloniti — kompenzacija ako kalendar pokvari nešto.

```jsx
const TABS = [
  { id: 'calendar', label: 'Calendar entry' },
  { id: 'entry', label: 'Quick entry' },
  { id: 'pairs', label: 'Pairing suggestions' },
]
```

`Calendar entry` tab sadrži:

- `<PlayerCombobox value={player} onChange={setPlayer} />` (reuse postojeći).
- Scope select (reuse iz `QuickAvailabilityForm`).
- `<WeekCalendarEditor playerId={player?.id} weekStart={weekStart} scope={scope} onSaved={...} />`.

Ako `player == null`, prikaži placeholder "Select a player to edit weekly availability."

### Loading per-week

Trenutni `availabilityService.fetchAvailabilityForPlayers` prima samo `playerIds` + opcione filtere. Reuse direktno:

```js
const docs = await fetchAvailabilityForPlayers([player.id], {
  from: weekStart,
  to: addDays(weekStart, 7),
  competitionId: scope?.competitionId || null,
  includeConsumed: true, // calendar prikazuje i consumed (locked)
})
```

Pokupiti samo ono što pripada toj nedelji za tog igrača. `fetchAvailabilityForPlayers` već radi `from/to` filter post-fetch; dovoljno za jednog igrača (broj docs <100).

### Save flow

```js
async function handleSave() {
  const { creates, updates, deletes } = diffWeek(originalDocs, selectedCells)

  await Promise.all([
    ...creates.map((b) =>
      addAvailability({
        playerId: player.id,
        start: b.start,
        end: b.end,
        notes: null,
        competitionScope: scope,
        createdBy: user.uid,
      }),
    ),
    ...updates.map((u) =>
      playerAvailabilityRepository.update(u.id, { start: u.start, end: u.end }),
    ),
    ...deletes.map((id) => playerAvailabilityRepository.delete(id)),
  ])

  showToast({
    title: `${creates.length + updates.length + deletes.length} changes saved`,
    variant: 'success',
  })
  reload()
}
```

`addAvailability` već postoji u `app/src/features/scheduling/services/availabilityService.js`. Update i delete zovu repository direktno (jednostavno, ne treba wrapper).

**Race condition:** drugi admin paralelno menja istog igrača → last-write-wins. Prihvatljivo (jedan aktivan admin u praksi). Mitigacija (V2): pri load-u snimi `_loadedAt`, pri save proveri da li je doc promenjen → ako jeste, refresh + warn.

### State machine

```
idle (no player selected)
  → loading (player picked, fetching docs)
    → editing (docs loaded, selection mutable)
      → saving (Save clicked, awaiting writes)
        → editing (re-fetched after save)
      → editing (Cancel clicked, revert)
    → editing (week navigated, fetch new range)
```

`editing` čuva `originalDocs` (snapshot) + `selectedCells: Set<string>` (mutable). Diff = compare svaki put kad treba broj u "Save N changes" labeli.

### Performans

- Grid: 16×7 = 112 ćelija. React render trivijalan.
- Memoize `originalCellMap` (Map cellKey → docId) za constant-time lookup pri renderu.
- Save: ~10 paralelnih Firestore writes maks po jednoj nedelji. OK.

### Accessibility

- Cell = `<button>` sa `aria-pressed={selected}` i `aria-label="Tuesday 05.05 17:00, available"`.
- Week navigator dugmad `aria-label="Previous week"` / `"Next week"`.
- Keyboard: Tab kroz cells, Space/Enter toggle. Strelice za navigaciju kroz grid (V2).

## Domain model — bez izmena

Postojeća kolekcija `playerAvailability` se zadržava as-is. Polje `source: 'admin_entry'` ostaje za sve unose iz admin UI-ja. Player self-service (#04b) će koristiti `source: 'player_self'`.

Bez novih indeksa. Postojeći `playerId ASC, start ASC` pokriva week query.

## UI states i edge cases

| Slučaj                                                    | Tretman                                                                                                                                                                                                       |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Igrač nema nijedan slot u nedelji                         | Sve ćelije prazne, "Save 0 changes" disabled.                                                                                                                                                                 |
| Igrač ima 7 slotova u nedelji, sve consumed               | Sve render-ovano kao locked, edit nije moguć. Notice "All slots this week are consumed by scheduled matches."                                                                                                 |
| Save fail na sredini (npr. update-X uspe, create-Y padne) | Toast error sa porukom "Partial save: some changes failed". Re-fetch i prikaži stvarno stanje. Ne pokušavaj rollback (atomic batch nije isplativ ovde).                                                       |
| Admin promeni igrača sa nečuvanim promenama               | Confirm dialog "Discard X unsaved changes?".                                                                                                                                                                  |
| Admin promeni nedelju sa nečuvanim promenama              | Isto.                                                                                                                                                                                                         |
| Mreža padne tokom save                                    | `Promise.all` baca; uhvati i toast error. State ostaje u "editing" sa optimistic selekcijom.                                                                                                                  |
| Postojeći doc traje 30 min (npr. legacy unos)             | Render kao 1h ćelija sa badge-om "30m". Klik = full hour replacement (rounding gore na 1h pri save). Alternativa: ne render-uj, fallback na Quick entry tab. **Odluka:** render kao 1h sa warning tooltip-om. |

## Implementacija — fajlovi

```
app/src/features/scheduling/
├── components/
│   ├── calendar/
│   │   ├── WeekCalendarEditor.jsx     # NEW — orchestrator
│   │   ├── WeekHeader.jsx             # NEW — week nav + labels
│   │   ├── HourGrid.jsx               # NEW — grid render + click
│   │   ├── HourCell.jsx               # NEW — single cell
│   │   └── SaveBar.jsx                # NEW — diff summary + save
│   └── (existing files unchanged)
├── utils/
│   ├── weekDiff.js                    # NEW
│   └── weekRange.js                   # NEW (mondayOf, addDays, formatWeekLabel)
└── pages/
    └── SchedulingPage.jsx             # EDIT: add 'calendar' tab, mount editor
```

Bez izmena u:

- `infrastructure/firestore.js` (repository već postoji)
- `services/availabilityService.js` (reuse `addAvailability`, `fetchAvailabilityForPlayers`)
- `services/pairingService.js` (orthogonal — pairing engine ne mari kako su slotovi uneti)
- `utils/overlap.js`

## Testabilnost (manuelno)

1. Izaberi igrača bez ikakvih slotova ove nedelje. Klikni 4 ćelije pon 17–21. "Save 1 change" → 1 doc kreiran sa start=Mon 17:00, end=Mon 21:00.
2. Vrati se na isti igrač. Klikni jednu ćeliju u sredini bloka (Mon 19) → ON ostaje, ostali ON. Klikni Mon 19 ponovo → ćelija OFF. "Save 2 changes" → original doc obrisan + 2 nova (Mon 17–19, Mon 20–21).
3. Konzumiraj jedan slot kroz Pairing tab (scheduleMatch). Vrati se u Calendar → ta 2h hashed/locked, ne mogu klik.
4. Cmd+klik na "Wed" header → ceo dan toggle ON. "Save 1 change" → doc sa start=Wed 07:00, end=Wed 23:00.
5. Klik na "17:00" header → toggle 17:00 cell preko cele nedelje. Verifikuj 7 odvojenih dokumenata (jedan po danu, samo 17–18).
6. Promeni nedelju (›) sa nečuvanim promenama → confirm dialog.
7. Pairing tab i dalje vidi nove slotove — pairing rezultati se osvežavaju (manuelno Refresh).

## MVP odluke (lockovane 2026-05-06)

- **Default tab:** `calendar`.
- **Notes:** uklonjeno iz scope-a. Sve nove slotove se pišu sa `notes: null`. Ako admin treba per-slot notes → ostaje stari Quick entry tab.
- **Granica satnica:** 1h ćelije.
- **Drag-to-select:** out of scope, V2.
- **Recurring weekly templates:** out of scope, #05.
- **Mobile UI:** out of scope V1 (admin koristi laptop). Player self-service (#04b) će zahtevati mobilni layout.
- **Push notifikacija drugim adminima:** out.

## Sprintovi

### Sprint 1 — utils + diff (foundation, no UI)

**Cilj:** čisti, izolovani helperi koje UI samo zove. Bez render koda.

Zadaci:

1. `app/src/features/scheduling/utils/weekRange.js`
   - `mondayOf(date)` → Date u 00:00 lokalno.
   - `addDays(date, n)`, `addHours(date, n)`.
   - `formatWeekLabel(weekStart)` → "04.05 – 10.05".
   - `cellKey(date, hour)` → `"YYYY-MM-DD-HH"`.
   - `parseCellKey(key)` → `{ date: Date, hour: number }`.
2. `app/src/features/scheduling/utils/weekDiff.js`
   - `docsToCells(docs, weekStart, hourRange)` → `Set<string>` (consumed isključen).
   - `cellsToBlocks(cellSet)` → `Array<{ date, startHour, endHour }>`.
   - `diffWeek(originalDocs, selectedCells, weekStart, hourRange)` → `{ creates, updates, deletes }`.
3. Manual sanity check kroz konzolu (no test suite).

**Definition of done:** utils importable, ručno verifikovano:

- `cellsToBlocks(['2026-05-04-17', '2026-05-04-18', '2026-05-04-19'])` vraća jedan blok 17–20.
- `diffWeek` na praznom inputu vraća sve creates ili sve deletes čisto.
- Split case (rupa u sredini) vraća 1 delete + 2 creates.

### Sprint 2 — read-only week grid

**Cilj:** prikaz nedelje za izabranog igrača. Bez edit-a, bez save-a.

Zadaci:

1. `WeekCalendarEditor.jsx` — orchestrator. State: `weekStart`, `originalDocs`, `loading`. `useEffect` na `playerId/weekStart/scope` zove `fetchAvailabilityForPlayers([playerId], { from, to, includeConsumed: true })`.
2. `WeekHeader.jsx` — prev/next/today buttons + label iz `formatWeekLabel`.
3. `HourGrid.jsx` — render 16×7 grid (CSS grid, ne table). Render-uje:
   - prazne ćelije,
   - selected (filled, iz `originalDocs`),
   - consumed (hashed, iz `originalDocs` sa `consumedByMatchId != null`).
4. `HourCell.jsx` — pure, prima `state ∈ {empty, selected, consumed}` + `aria-label`.
5. Mount u `SchedulingPage.jsx` kao novi tab `calendar` (ne menja default tab još).

**Definition of done:** otvoriti tab, izabrati igrača koji ima slotove iz Quick entry → grid prikazuje te slotove vizuelno tačno.

### Sprint 3 — interactive edit + save

**Cilj:** klik toggle, diff računa, Save piše batch u Firestore.

Zadaci:

1. `HourGrid.jsx` — dodaj `selectedCells: Set<string>` state, click handler na cell toggle.
2. Cmd/Ctrl+klik na header dana → toggle ceo dan.
3. Klik na header sata → toggle taj sat preko cele nedelje.
4. `SaveBar.jsx` — prikazuje "Save N changes" (računa `creates.length + updates.length + deletes.length` iz `diffWeek`). `Cancel` revert na `originalDocs`. Disabled ako N=0.
5. `handleSave` u `WeekCalendarEditor` — `Promise.all` `addAvailability` / `playerAvailabilityRepository.update` / `delete`. Toast success/error. Re-fetch.
6. Confirm dialog na navigate week / change player ako `unsaved changes`.
7. `aria-pressed` na cells.

**Definition of done:** prazan igrač → klikni 4 ćelije → Save 1 → 1 doc u Firestore. Ponovo otvori → 4 ćelije već selektovane. Klikni 1 da OFF → Save 2 → 1 delete + 1 create. Verifikuj kroz Pairing tab da se pairing engine ne ruši.

### Sprint 4 — polish + cutover

**Cilj:** kalendar postaje primarni flow.

Zadaci:

1. Postaviti `calendar` kao default tab u `TABS` array u `SchedulingPage.jsx`.
2. Loading skeleton za grid (16×7 placeholder).
3. Empty state ("Select a player to edit weekly availability.").
4. Notice za "all consumed" slučaj.
5. Notice za 30-min legacy slot ako se naiđe (render kao 1h sa tooltip-om).
6. Confirm dialog tekstovi finalizovani.
7. Manuelno proći testabilnost listu iz spec-a (koraci 1–7).

**Definition of done:** admin može za jednog igrača obaviti celu nedelju u <30 sek. Quick entry tab ostaje kao backup.

## Sledeći feature

- **#04b** — Player self-service: ista `WeekCalendarEditor` komponenta, mountovana u `ProfilePage` sa `playerId = currentUser.playerId`. Source field se postavlja na `'player_self'`.
- **#05** — Recurring weekly templates: "default availability" za igrača, automatski materijalizovan svake nedelje za N nedelja unapred. Nova kolekcija `playerWeeklyDefaults`, ne menja postojeće prozore.
- **#06** — Real-time sync (`onSnapshot`) calendar editor-a tako da dva admina ili admin+igrač vide promene uživo. Tek ako konflikti postanu problem.
