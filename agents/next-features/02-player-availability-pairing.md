# Feature 02 — Player availability + admin pairing suggestions

**Status:** Planning
**Target:** Brzo unošenje poruka tipa "mogu sutra od 17h" preko admin UI-a, automatske sugestije parova iz iste grupe sa nezakazanim mečem, manuelno slanje poruka i potvrda → finalni `scheduleMatch`.

## Cilj

Trenutni flow: igrači šalju Vibere/WhatsApp poruke ("mogu sutra od 17", "mogu sreda posle 18 ili četvrtak ujutru"). Admin ručno pamti, ručno upoređuje sa rasporedom mečeva i ručno predlaže termine. Ovaj feature treba da:

1. Omogući **brz unos availability slot-ova** za bilo kog igrača (admin upisuje, ne igrač).
2. Pokaže **sugestije parova** — mečevi gde su oba igrača dostupna u zajedničkom prozoru, iz iste grupe, status `not_scheduled`.
3. Generiše **template poruke** za slanje van sistema (admin sam kopira/šalje na Viber).
4. Kad oba igrača potvrde van sistema, admin jednim klikom poziva postojeći `scheduleMatch` sa izabranim slotom.

**Eksplicitno NIJE u scope-u:**
- Auto-slanje poruka (Twilio/WhatsApp Business API itd.) — admin radi manuelno.
- Igrač samo-prijavljuje availability iz mobilnog UI-ja — to je #04 ako bude potrebno.
- AI/NLP parsiranje slobodnog teksta. Pošto admin upisuje, dovoljan je strukturisani input + brz preset.

## Domain model

### Nova kolekcija: `playerAvailability`

Jedan dokument = jedan availability prozor (ne agregat po igraču). Lakše dodavanje/uklanjanje pojedinačnih slotova bez full doc rewrite-a.

```js
{
  id: string,
  playerId: string,           // ref → players/{id}
  start: Timestamp,           // početak prozora
  end: Timestamp,             // kraj prozora (inclusive za parser, exclusive za overlap)
  source: 'admin_entry',      // budući: 'player_self', 'auto_parse'
  notes: string | null,       // npr. "viber 03.05 21:14"
  competitionScope: {         // opcioni filter — availability važi samo za određenu ligu
    competitionType: 'leagues' | 'tournaments' | null,
    competitionId: string | null,
  } | null,
  consumedByMatchId: string | null,  // postavlja se kad je iskorišćeno za scheduleMatch (audit)
  createdBy: string,          // user.uid admina koji je uneo
  createdAt, updatedAt
}
```

**Indeksi (Firestore):**
- `playerId ASC, start ASC` — query po igraču u vremenskom rasponu.
- `start ASC` — globalni pregled buduće availability za pairing engine.

**Repository:**
```js
// infrastructure/firestore.js
export const playerAvailabilityRepository = new FirestoreRepository('playerAvailability')
```

### Nije potrebna nova kolekcija za "predloge parova"

Sugestije se računaju **on-the-fly** iz availability + matches. Persistira se tek kada admin klikne "Schedule" — to je postojeći `scheduleMatch` write. Ako admin želi da "draftuje" predlog pre potvrde, čuva se u local state-u stranice. Persistirati draftove = overengineering za ovaj korak.

### Player.phone — nedostaje

`players` dokument trenutno nema `phone`. Za "kopiraj poruku i pošalji na Viber" treba telefon. Dodati polje:

- `players/{id}.phone: string | null` (E.164 format, opciono)
- `PlayerEditPage` forma — novo polje.
- `PlayerCreatePage` forma — novo polje.

Tom polju ne treba migracija; svi postojeći će biti `undefined` → tretirati kao null.

## Algoritam pairing sugestija

Ulaz: `competitionId`, `competitionType`, opcioni filter (datum od/do, grupa).

Izlaz: lista `{ matchId, groupId, player1, player2, overlapWindows: [{start, end}] }`, sortirana po:
1. Najraniji početak overlap prozora (admin obično traži "šta se može zakazati u narednih X dana").
2. Match koji je najduže `not_scheduled` (fairness — stari mečevi gore).

```
1. Read svi matches za competition gde status = 'not_scheduled'
   AND player1Id != null AND player2Id != null.
   (Slotovi sa null igračem se preskaču — draw nije gotov.)

2. Skup playerIds = unija svih player1Id/player2Id iz tih mečeva.

3. Read availability:
   playerAvailabilityRepository.query([
     where('playerId', 'in', batchedPlayerIds),  // chunk po 30 (Firestore 'in' limit)
     where('end', '>=', now),
     where('consumedByMatchId', '==', null),
   ])

   Filter post-fetch: poštovati competitionScope ako postavljen
   (scope.competitionId == null ILI == competitionId).

4. Index availability po playerId → AvailabilityWindow[].

5. Za svaki match:
   a. windowsP1 = avail[player1Id] ?? []
   b. windowsP2 = avail[player2Id] ?? []
   c. Za svaki par (w1, w2): overlap = [max(w1.start, w2.start), min(w1.end, w2.end)]
      Ako overlap.start < overlap.end AND duration ≥ MIN_MATCH_DURATION (npr. 90 min) → push.
   d. Ako match ima ≥ 1 overlap → uključi u izlaz.

6. Sortiraj kao gore.
```

`MIN_MATCH_DURATION` — konfigurabilno, default 90 min (jedan teniski meč po iskustvu). Exposed kao konstanta, ne kao runtime setting (premature config).

### Edge cases u algoritmu

| Slučaj | Tretman |
|---|---|
| Ista grupa sa 3 dostupna igrača i 3 nezakazana meča između njih | Lista pokazuje sva 3 — admin sam bira. Ne pokušavamo greedy assign. |
| Igrač ima 5 prozora, drugi ima 5 — 25 parova prozora | Ok, broj se brzo svodi na 0–3 stvarna preseka; client računa. Za >50 mečeva može da se izmesti u memo. |
| Availability prozor istekao (`end < now`) | Filter u koraku 3 ga već skida. Cron za čišćenje nije potreban — Firestore TTL na `end + 7 dana` je čist rešenje, ali odložiti dok se ne pojavi >1000 dokumenata. |
| Match je iz `round_robin_knockout` KO faze | KO mečevi nemaju groupId. Algoritam svejedno radi — sugestija se prikazuje, samo bez "ista grupa" badge-a. |
| Tournament | Identičan flow; competitionType prosleđen u ulazu. |

## UI — admin strana

### Nova stranica: `/scheduling`

Tab-glavna admin stranica za scheduling. Three sub-tabs:

#### Tab 1: **Quick entry** — dodavanje availability

Kompaktan form na vrhu:
- **Player picker** — autocomplete preko `playersRepository` (već postoji u EnrollmentManager-u, reuse `PlayerCombobox` ako postoji; ako ne, novi).
- **Preset chip-ovi** za brz unos:
  - "Sutra 17–21"
  - "Sutra 9–13"
  - "Vikend (sub+ned 9–21)"
  - "Cela ova nedelja popodne"
  - "Custom" → razvija date+time picker
- **Notes** (optional, jedan red) — npr. "viber 03.05 21:14"
- **Scope** select — "Sve takmičenje" / specifična liga (default: trenutna ako navigated iz lige).
- Submit dugme: "Add availability" → `playerAvailabilityRepository.create(...)`.

Ispod forme: tabela aktivnih availability za poslednjih 14 dana, grupisano po igraču, sa "Remove" dugmetom (`playerAvailabilityRepository.delete(id)`).

**Preset semantika (lokalno računanje datuma, ne hardcoded):**
- "Sutra 17–21" → start = sutra 17:00 lokalno, end = sutra 21:00 lokalno.
- "Vikend" → najbliža subota 09:00 → najbliža nedelja 21:00 (dva odvojena dokumenta ili jedan koji obuhvata 2 dana? — **odluka:** dva odvojena, čistija kasnija obrada).

#### Tab 2: **Pairing suggestions**

Header filter:
- Liga/turnir select (default: prva aktivna liga).
- Grupa filter (multi-select).
- "Show only this week" toggle (default ON).

Telo:
- Lista kartica, jedna po sugestiji. Svaka kartica:
  ```
  ┌─ Group A — Round 1 ──────────────────────────────┐
  │ Igrač X  vs  Igrač Y                              │
  │                                                   │
  │ Available together:                               │
  │   • Tue 05.05 17:00–19:00     [Choose this slot] │
  │   • Wed 06.05 09:00–12:00     [Choose this slot] │
  │                                                   │
  │ [Send message X (Viber)] [Send message Y (Viber)] │
  └───────────────────────────────────────────────────┘
  ```
- "Choose this slot" → otvara mali confirm dialog "Schedule meč za 05.05 17:00?" → poziva `scheduleMatch` + označi konzumirane availability (vidi sekciju "Schedule write" niže).
- "Send message" — generiše `viber://chat?number={phone}&text={encoded}` ili `whatsapp://send?phone=...&text=...` link i `window.open`. Ako igrač nema `phone`, dugme disabled sa tooltip-om.

#### Tab 3: **Pending confirmations** (opciono za prvi kut)

Lista mečeva koje je admin "predložio" igračima ali još nisu potvrđeni. Pošto ne persistiramo predloge, ovaj tab radi samo ako uvedemo `matchProposal` mini-dokumente. **Predlog: izostaviti u prvoj iteraciji.** Admin sam pamti šta je poslao do potvrde (~5–15 min cycle).

### Template poruke (klijentski, lokalizovano sr-Latn)

```
Pozdrav {playerName}, predlog za meč protiv {opponentName} ({groupName}):
{slotHumanReadable}. Da li ti odgovara? Hvala.
```

Generisati u `app/src/features/scheduling/utils/messageTemplates.js`. Ne čuvati nigde, samo composer.

## Schedule write — atomic step

Kad admin klikne "Choose this slot":

```js
async function confirmSchedule({ match, slotStart, slotEnd, p1AvailId, p2AvailId }) {
  await scheduleMatch(competitionType, competitionId, match.roundId, match.id, slotStart)
  await Promise.all([
    p1AvailId && playerAvailabilityRepository.update(p1AvailId, { consumedByMatchId: match.id }),
    p2AvailId && playerAvailabilityRepository.update(p2AvailId, { consumedByMatchId: match.id }),
  ].filter(Boolean))
}
```

`consumedByMatchId` sprečava da isti prozor opet predlaže suggestion engine — filter u koraku 3 algoritma. Ako se kasnije meč otkaže/pomeri, treba write koji vraća availability:

```js
async function unscheduleMatch(...) {
  await matchesRepository(...).update(matchId, { scheduledAt: null, status: 'not_scheduled' })
  await playerAvailabilityRepository.query([
    where('consumedByMatchId', '==', matchId)
  ]).then(docs => Promise.all(docs.map(d =>
    playerAvailabilityRepository.update(d.id, { consumedByMatchId: null })
  )))
}
```

`unscheduleMatch` već ne postoji eksplicitno — `scheduleMatch` se zove sa novim datumom, ali nikada `null`. Dodati eksplicitnu funkciju za revert.

**Race condition:** dva admina paralelno biraju isti slot za različite mečeve sa istim igračem → oba zakažu, drugi prozor se troši duplo. Vrlo retko (jedan admin u praksi). Mitigacija: optimistic UI, server-side ne sprečava — prihvatljivo za prvu iteraciju.

## Implementacija — fajlovi

```
app/src/features/scheduling/
├── pages/
│   └── SchedulingPage.jsx          # /scheduling, tabovi
├── components/
│   ├── QuickAvailabilityForm.jsx   # tab 1 form
│   ├── AvailabilityTable.jsx       # tab 1 lista
│   ├── PairingSuggestions.jsx      # tab 2
│   ├── SuggestionCard.jsx          # jedna kartica
│   ├── PresetChips.jsx             # chip-ovi za preset prozore
│   └── ConfirmScheduleDialog.jsx
├── services/
│   ├── availabilityService.js      # CRUD + presetToWindow()
│   └── pairingService.js           # computeSuggestions(matches, windows)
└── utils/
    ├── overlap.js                  # interval intersection
    └── messageTemplates.js
```

**Repository u `infrastructure/firestore.js`:**
```js
export const playerAvailabilityRepository = new FirestoreRepository('playerAvailability')
```

**Player schema dopuna** (`PlayerEditPage`, `PlayerCreatePage`, `playerService` ako postoji):
- Dodati `phone` polje (string, optional, hint "+381...").

**Routing** (`app/src/app.jsx`):
- `/scheduling` → editor+, ProtectedRoute.

**Navigation** (`app/src/navigation/config.js`):
- Dodati u `adminNavItems`: `{ label: 'Scheduling', to: '/scheduling', superadminOnly: false }` — editor+ vidi.

## Pairing service skica

`app/src/features/scheduling/services/pairingService.js`:

```js
import {
  matchesRepository,
  leagueGroupsRepository,
  tournamentGroupsRepository,
  playerAvailabilityRepository,
  roundsRepository,
} from '../../../infrastructure/firestore.js'
import { intersectWindows } from '../utils/overlap.js'

const MIN_MATCH_MINUTES = 90

export async function computeSuggestions({ competitionType, competitionId, fromDate, toDate }) {
  const rRepo = roundsRepository(competitionType, competitionId)
  const rounds = await rRepo.getAll()

  // Sve matches sa oba popunjena igrača i not_scheduled
  const matchLists = await Promise.all(rounds.map(r =>
    matchesRepository(competitionType, competitionId, r.id).query([
      // Firestore ne podržava više `!=` — filtriraj client-side
    ])
  ))
  const allMatches = matchLists.flat().filter(m =>
    m.status === 'not_scheduled' && m.player1Id && m.player2Id
  )

  const playerIds = [...new Set(allMatches.flatMap(m => [m.player1Id, m.player2Id]))]
  const windows = await fetchAvailabilityForPlayers(playerIds, fromDate, toDate, competitionId)

  const byPlayer = new Map()
  for (const w of windows) {
    if (!byPlayer.has(w.playerId)) byPlayer.set(w.playerId, [])
    byPlayer.get(w.playerId).push(w)
  }

  const suggestions = []
  for (const m of allMatches) {
    const w1 = byPlayer.get(m.player1Id) || []
    const w2 = byPlayer.get(m.player2Id) || []
    const overlaps = intersectWindows(w1, w2, MIN_MATCH_MINUTES)
    if (overlaps.length > 0) {
      suggestions.push({ match: m, overlaps, w1, w2 })
    }
  }

  suggestions.sort((a, b) => {
    const aMin = Math.min(...a.overlaps.map(o => o.start.getTime()))
    const bMin = Math.min(...b.overlaps.map(o => o.start.getTime()))
    return aMin - bMin
  })
  return suggestions
}

async function fetchAvailabilityForPlayers(playerIds, fromDate, toDate, competitionId) {
  // Firestore 'in' limit = 30; chunk
  const chunks = []
  for (let i = 0; i < playerIds.length; i += 30) chunks.push(playerIds.slice(i, i + 30))

  const results = await Promise.all(chunks.map(chunk =>
    playerAvailabilityRepository.query([
      // pseudo, koristi where iz firebase/firestore
    ])
  ))
  return results.flat().filter(w =>
    !w.consumedByMatchId &&
    w.end.toDate() >= fromDate &&
    w.start.toDate() <= toDate &&
    (!w.competitionScope?.competitionId || w.competitionScope.competitionId === competitionId)
  )
}
```

`intersectWindows` u `utils/overlap.js`:

```js
export function intersectWindows(listA, listB, minMinutes) {
  const out = []
  for (const a of listA) {
    for (const b of listB) {
      const start = new Date(Math.max(a.start.toDate(), b.start.toDate()))
      const end = new Date(Math.min(a.end.toDate(), b.end.toDate()))
      const minutes = (end - start) / 60000
      if (minutes >= minMinutes) out.push({ start, end, sourceA: a.id, sourceB: b.id })
    }
  }
  return out
}
```

## Testabilnost (manuelno)

1. Kreirati 2 igrača u istoj grupi sa nezakazanim mečem.
2. Kroz Quick Entry uneti za oba "Sutra 17–21".
3. U Pairing Suggestions otvoriti tu ligu → očekivano: jedna kartica sa overlap-om "sutra 17:00–21:00".
4. Klik "Choose slot" sa start=17:00 → meč prelazi u status `scheduled`, oba availability dokumenta dobijaju `consumedByMatchId`.
5. Refresh suggestions → kartica nestaje.
6. Manuelno revert kroz `unscheduleMatch` (ako se uvede UI) → availability se vraća, suggestion ponovo vidljiv.
7. Edge: jedan igrač ima 3 prozora kroz 3 dana, drugi ima 1 prozor koji preklapa samo jedan → kartica ima samo 1 stavku.

## Otvorena pitanja

- **Telefon format i privatnost** — čuvanje `phone` na `players` doc-u; ko sme da pročita? Predlog: editor+ čita; `phone` ne ide u javne komponente (`PlayersPage` lista, `PlayerDetailPage` za neauth). Treba ručno pregledati read pravila u `firestore.rules` (van scope-a koda — Firebase Console).
- **Viber vs WhatsApp deep link** — Viber `viber://chat?number=` radi samo na uređajima sa instaliranim Viber-om. Prvi pristup: dva odvojena dugmeta (Viber, WhatsApp), admin bira; `phone` deli oba. Ako se kasnije pokaže da svi koriste Viber — fallback samo `tel:` link sa porukom u clipboard.
- **Notifications za igrače u app-u** — buduća iteracija. Dovoljan je manuelni flow u prvoj verziji jer korisnik eksplicitno traži manuelno slanje.
- **Self-service za igrače** — feature #04: igrač iz svog `ProfilePage` unosi own availability. Servis i kolekcija su isti, samo `source` field se razlikuje. Trenutni dizajn ne treba menjati.
- **Time zone** — sve u lokalnom (Europe/Belgrade). Ako se igra preko više TZ-a — out of scope.
- **Reminder sistem** — "ako nije potvrđeno za 24h" — out of scope; admin sam prati.

## Sledeći feature

#03 — Auto-add scheduled match u Google Calendar (kalendarski poziv adminu i igračima sa Auth nalogom).
#04 — Player self-service availability (iz `ProfilePage`, isti `playerAvailabilityRepository`).
#05 — Soft suggestion: "ovaj par igra i u drugoj grupi/turniru istog vikenda" — multi-competition pairing.
