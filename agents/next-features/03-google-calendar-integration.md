# Feature 03 — Google Calendar integracija za zakazane mečeve

**Status:** Planning
**Target:** Kad admin zakaže meč (`scheduleMatch` iz feature #02 ili postojećeg `MatchDetailPage`), automatski kreira Google Calendar event sa oba igrača kao attendee-ima. Igrač sa povezanim Google nalogom dobija invite na svoj kalendar; ostali dobijaju iCal email.

## Cilj

- **Admin (organizer):** event ide u njegov primarni kalendar, naslov tipa "Tennis: Igrač X vs Igrač Y — Liga 2026 C1 / Grupa A".
- **Igrači:** dodati kao attendees putem email-a → Google šalje pozivnicu, oni klikom dodaju u svoj kalendar.
- **Naknadne promene mečeva** (reschedule, walkover, cancel) → propagiraju u event (update/cancel).
- **Fallback:** ako admin nije autorizovao Calendar scope ili poziv ne uspe, ponuditi `.ics` download/link kao plan B.

## Eksplicitno NIJE u scope-u

- Sinhronizacija u suprotnom smeru (igrač pomera u Google Calendar → app menja `scheduledAt`). To je #06 ako uopšte.
- Booking teniskog terena (resource calendar) — drugi sistem.
- Automatski reminder push (Calendar šalje svoje reminder-e — koristi default).
- Cloud Functions backend — koristi se client-side OAuth flow (vidi "Auth strategija" niže).

## Tehničke opcije

### Auth strategija — odabir

| Pristup                                                        | Pro                                                             | Kontra                                                                                              | Odluka                                          |
| -------------------------------------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| **A. Client-side OAuth (gapi/GIS)** sa scope `calendar.events` | Bez backenda, brz prototip, Firebase već koristi Google sign-in | Token traje 1h, refresh zahteva backend ili re-prompt. Token u memoriji = svaka sesija nov consent. | **Izabrano za v1.**                             |
| B. Cloud Function + service account "domain-wide delegation"   | Server-to-server, bez user OAuth-a                              | Zahteva Google Workspace, nema kod ovog projekta                                                    | Odbijeno.                                       |
| C. Cloud Function + per-user refresh token storage             | Robusno, dugotrajno                                             | Zahteva uvođenje Cloud Functions + sigurnosni model za token storage                                | Razmotriti za v2 ako re-prompt postane smetnja. |
| D. Samo `.ics` file (bez OAuth-a)                              | Nula auth-a                                                     | Bez attendees / RSVP. Samo download.                                                                | **Fallback.**                                   |

### Implementacijski stack

- **Google Identity Services (GIS)** — `https://accounts.google.com/gsi/client` script tag.
- **Token client** — `google.accounts.oauth2.initTokenClient({ scope: 'https://www.googleapis.com/auth/calendar.events', callback })`.
- **Calendar API REST** preko `fetch` (nema potrebe za pun `gapi.client.calendar` SDK):
  - `POST https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all`
  - `PATCH .../events/{eventId}?sendUpdates=all`
  - `DELETE .../events/{eventId}?sendUpdates=all`

Razlog REST > gapi.client: manje payload-a, manje globalnih state-ova, lakše testiranje.

## Domain proširenja

### Match dokument — nova polja

```js
{
  ...,
  calendarEvent: {
    eventId: string,           // Google event ID, vraćen iz POST /events
    organizerUid: string,      // user.uid admina koji je kreirao event (čiji kalendar)
    htmlLink: string,          // Google webUI link
    iCalUID: string,           // za stabilnu identifikaciju kroz reschedule
    createdAt: ISOstring,
    lastSyncAt: ISOstring,
  } | null
}
```

`calendarEvent.eventId` postaje izvor istine za buduće `update`/`delete`. Ne čuva se attendee status — Calendar API je single source of truth za to.

### User profil — Google Calendar linked flag

```js
// users/{uid}
{
  ...,
  googleCalendarLinked: boolean,    // true ako je consent ikada dat
  googleCalendarLinkedAt: ISOstring,
}
```

Pomaže UI-ju da prikaže "Connect Google Calendar" dugme samo prvi put. Ne čuva se token. Token je u memoriji `sessionStorage` (idealno) ili u app state.

### Player.email — već postoji?

Player doc ima `email` (vidi `players.md`). Provera: ako `player.email` postoji i validan, ide u `attendees[]`. Ako `player.authUid` postoji, čita se i `users.email` — preferira se taj jer je verifikovan.

Pravilo: `attendeeEmail = users[authUid].email ?? player.email ?? null`. Ako null → preskoči attendee, ali admin svejedno dobija event.

## Servis: `googleCalendarService.js`

`app/src/features/scheduling/services/googleCalendarService.js`

### API površina

```js
export async function ensureCalendarToken({ interactive = true })
// Vraća { accessToken, expiresAt }. Ako interactive=false i nema validnog tokena → throw NotAuthorizedError.

export async function createMatchEvent({ match, scheduledAt, durationMinutes, summary, description, attendees, location })
// Vraća { eventId, htmlLink, iCalUID }

export async function updateMatchEvent({ eventId, scheduledAt, durationMinutes, summary, description, attendees, location })

export async function cancelMatchEvent({ eventId })

export async function generateIcsFile({ match, scheduledAt, durationMinutes, summary, description, attendees, location })
// Vraća Blob (text/calendar) — fallback path.
```

### Token client lifecycle

```js
let cachedToken = null // { accessToken, expiresAt }

export async function ensureCalendarToken({ interactive = true } = {}) {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken
  if (!interactive) throw new NotAuthorizedError()

  await loadGisScript() // dynamic import za /gsi/client
  return new Promise((resolve, reject) => {
    const tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID,
      scope: 'https://www.googleapis.com/auth/calendar.events',
      callback: (resp) => {
        if (resp.error) return reject(new Error(resp.error))
        cachedToken = {
          accessToken: resp.access_token,
          expiresAt: Date.now() + (resp.expires_in - 60) * 1000,
        }
        resolve(cachedToken)
      },
    })
    tokenClient.requestAccessToken({ prompt: cachedToken ? '' : 'consent' })
  })
}
```

`prompt: ''` znači silent renewal kad već postoji consent (samo refresh prozor blic-ne pa zatvori). `prompt: 'consent'` prvi put — eksplicitno traži dozvolu.

### Event payload

```js
function buildEventBody({
  match,
  scheduledAt,
  durationMinutes,
  summary,
  description,
  attendees,
  location,
}) {
  const start = new Date(scheduledAt)
  const end = new Date(start.getTime() + durationMinutes * 60_000)
  return {
    summary,
    description,
    location: location ?? null,
    start: { dateTime: start.toISOString(), timeZone: 'Europe/Belgrade' },
    end: { dateTime: end.toISOString(), timeZone: 'Europe/Belgrade' },
    attendees: attendees
      .filter((a) => a.email)
      .map((a) => ({ email: a.email, displayName: a.displayName, responseStatus: 'needsAction' })),
    guestsCanModify: false,
    guestsCanInviteOthers: false,
    reminders: { useDefault: true },
    extendedProperties: {
      private: {
        appMatchId: match.id,
        appCompetitionId: match.competitionId,
        appCompetitionType: match.competitionType,
      },
    },
  }
}
```

`extendedProperties.private.appMatchId` — koristan za reverse lookup ako se baza i Calendar razdvoje.

### Idempotency / dedup

Pre `createMatchEvent`:

- Ako `match.calendarEvent?.eventId` postoji → poziva `updateMatchEvent` umesto create. Sprečava duplikat ako admin klikne dvaput ili ako se kreće između environments.

Nakon `createMatchEvent`:

- Write `matchesRepository.update(matchId, { calendarEvent: { eventId, htmlLink, iCalUID, organizerUid, createdAt, lastSyncAt } })`.

### Reschedule / cancel hooks

Ovaj feature **proširuje** postojeći `scheduleMatch` u `matchService.js`:

```js
// app/src/features/matches/services/matchService.js
import {
  syncMatchToCalendar,
  removeMatchFromCalendar,
} from '../../scheduling/services/matchCalendarSync.js'

export async function scheduleMatch(competitionType, competitionId, roundId, matchId, scheduledAt) {
  const repo = matchesRepository(competitionType, competitionId, roundId)
  await repo.update(matchId, { scheduledAt, status: 'scheduled' })
  // Best-effort sync; greška se loguje ali ne ruši zakazivanje
  syncMatchToCalendar({ competitionType, competitionId, roundId, matchId }).catch((err) =>
    console.error('[Calendar] sync failed', err),
  )
}
```

Wrapper servis `matchCalendarSync.js`:

- Čita match doc + competition meta + player docs.
- Resolve attendees (admin email + igrači).
- Bira create vs update na osnovu `match.calendarEvent`.
- Persisti rezultat.
- Greške ne propagira u UI; postavi toast iz UI sloja samo ako poziv inicirao admin direktno (vidi UI sekciju).

Slično za walkover/cancel:

- `setWalkover` → `cancelMatchEvent` (meč se neće odigrati u zakazano vreme).
- Brisanje meča (ako se ikada uvede) → `cancelMatchEvent`.

## UI promene

### MatchDetailPage — Schedule sekcija

Nakon postojećeg "Schedule" forme dodati red:

```
☐ Add to Google Calendar
   └ Connect Google Calendar  (ako još nije linkovan)
```

Default `checked` ako `users[user.uid].googleCalendarLinked === true`. Klikom na "Schedule" uz čekiran toggle:

1. `await ensureCalendarToken({ interactive: true })`.
2. `await scheduleMatch(...)` (postojeći).
3. Toast: "Scheduled. Calendar event sent to N attendees." (broj = oni sa email-om).
4. Ako poziv ne uspe → toast warning + "Download .ics" link kao fallback.

### `/scheduling` SuggestionCard — "Choose this slot" potvrda

Dialog (iz #02) dobija checkbox identičan gornjem. Workflow analogan.

### ProfilePage — Calendar status

Sekcija "Integrations":

- "Google Calendar — connected ✓" / "Not connected — [Connect]".
- Disconnect dugme: ne ruši event-e (ostaju u kalendaru), samo briše `googleCalendarLinked` flag i čisti memorijski token.

### Match prikaz — link na Calendar event

Ako `match.calendarEvent.htmlLink` postoji, na MatchDetailPage prikazati malo "View in Google Calendar" linkche (open in new tab). Vidi se svima ko ima access na meč.

## Konfiguracija

### Environment variables

```
VITE_GOOGLE_OAUTH_CLIENT_ID=xxxxx.apps.googleusercontent.com
```

OAuth client setup u Google Cloud Console:

- Tip: "Web application".
- Authorized JavaScript origins: dev (`http://localhost:5173`) + prod URL.
- **Bez** redirect URI-a (GIS koristi popup token flow).
- Scope: `https://www.googleapis.com/auth/calendar.events` — dodato u OAuth consent screen.

OAuth consent screen verifikacija:

- Dok je u "testing" mode-u, samo whitelisted Google nalozi mogu autorizovati.
- Za produkciju potrebna verifikacija (Google review). Privremeno: ostaviti u testing sa eksplicitnim listom admin email-ova.

### `firebase.json` / hosting

Bez promena — sve klijentski.

## Edge cases

| Slučaj                                                                      | Tretman                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Admin nije ulogovan kroz Google (već email/password)                        | Ne smeta — OAuth token za Calendar je odvojen od Firebase Auth-a. Popup za consent može tražiti drugi Google nalog.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Admin koristi različit Google nalog svaki put                               | `cachedToken` je per-session. Calendar event ide u kalendar onog naloga koji je trenutno autorizovao. `organizerUid` čuva ko je inicirao. Reschedule od drugog admina → koristi novi token i šalje update svom kalendaru? **Odluka:** ako `match.calendarEvent.organizerUid !== currentUserUid` → upozorenje "Calendar event je u kalendaru drugog admina (X). Update će ići na njegov event." Pre poziva proveri da je trenutni user pristupio nekom Google nalogu — Calendar API dopušta `update` events samo organizatoru ili attendee-u. Ako ne uspe → fallback "create new event" + zaboravi stari (ostaje stale, ali bez čišćenja). Audit-friendly: log u console + UI warning toast. |
| Igrač nema email                                                            | Preskoči iz attendees. Admin svejedno dobija event.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Igrač ima email ali ne i Google nalog                                       | Google šalje iCal pozivnicu na email — radi out-of-the-box.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `scheduledAt` je u prošlosti                                                | Calendar API to dopušta; samo postaje "past event". Ne blokirati.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `scheduleMatch` sa istim `scheduledAt` (admin samo "potvrđuje" stari datum) | Idempotency: ako je `eventId` postavljen i `scheduledAt` se ne menja, skip API call. Pratimo last sync hash.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Token expire mid-action                                                     | `ensureCalendarToken({ interactive: true })` će re-promptovati. UI mora await pa retry.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Pop-up blocked                                                              | Eksplicitan toast: "Pop-up blocked. Allow pop-ups za ovu stranu pa probaj opet."                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Korisnik povuče Calendar pristup u Google security settings                 | API vraća 401. Treba uhvatiti i pozvati `ensureCalendarToken({ interactive: true })` jednom; ako i dalje 401 → fallback ICS.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Više od 10 attendees                                                        | Nije scenario (max 2 + admin). Ako postane (turnir grupna potvrda), treba paginirati `sendUpdates`. Out-of-scope.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

## Sigurnost

- **Klijentski token nikad ne ide na backend** — drži se u `cachedToken` modul-level varijabli. Ako se sesija ugasi, gubi se. (Sprečava XSS exfil — nije perfect, ali bolje od `localStorage`).
- **Ne čuvati access_token niti refresh_token u Firestore** — refresh token uopšte i ne dobijamo (GIS implicit flow ga ne vraća; samo authorization code flow + backend može dobiti refresh_token).
- **Scope je minimalan** — samo `calendar.events`, ne `calendar` (koji daje access do svih kalendara, podešavanja itd.).
- **CSP** — može biti potrebno proširiti `script-src` sa `https://accounts.google.com/gsi/client`. Trenutno repo nema eksplicitan CSP (Vite default).

## Implementacija — fajlovi

```
app/src/features/scheduling/
├── services/
│   ├── googleCalendarService.js     # token + REST wrapper
│   ├── matchCalendarSync.js         # match doc ↔ Calendar event sync
│   └── icsBuilder.js                # fallback .ics generator
├── hooks/
│   └── useCalendarLink.js           # 'connect' UX iz Profile/Match strana
└── components/
    └── CalendarToggle.jsx           # checkbox + connect link, reuse u 2 mesta
```

**Izmene postojećih fajlova:**

- `app/src/features/matches/services/matchService.js` — `scheduleMatch`, `setWalkover` pozivaju sync wrapper.
- `app/src/features/matches/pages/MatchDetailPage.jsx` — `CalendarToggle` u Schedule formi + "View in Google Calendar" link.
- `app/src/features/profile/pages/ProfilePage.jsx` — Integrations sekcija.
- `app/src/features/scheduling/components/ConfirmScheduleDialog.jsx` (iz #02) — `CalendarToggle`.

## ICS fallback — `icsBuilder.js`

Minimalan generator (nema lib-a):

```js
export function generateIcs({
  match,
  scheduledAt,
  durationMinutes,
  summary,
  description,
  attendees,
  location,
}) {
  const start = formatIcsDate(new Date(scheduledAt))
  const end = formatIcsDate(new Date(new Date(scheduledAt).getTime() + durationMinutes * 60_000))
  const uid = `match-${match.id}@tennis-league`
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Tennis League PWA//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatIcsDate(new Date())}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeIcs(summary)}`,
    `DESCRIPTION:${escapeIcs(description)}`,
    location && `LOCATION:${escapeIcs(location)}`,
    ...attendees
      .filter((a) => a.email)
      .map((a) => `ATTENDEE;CN=${escapeIcs(a.displayName)};RSVP=TRUE:mailto:${a.email}`),
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .join('\r\n')
  return new Blob([lines], { type: 'text/calendar;charset=utf-8' })
}

function formatIcsDate(d) {
  return d
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '')
}
function escapeIcs(s = '') {
  return String(s)
    .replace(/[\\;,]/g, '\\$&')
    .replace(/\n/g, '\\n')
}
```

UI: kad poziv ka Google API ne uspe, "Download .ics" dugme u toast-u.

## Test plan (manuelno)

1. U Google Cloud Console kreirati OAuth client + dodati testnog admina kao test user. Postaviti `VITE_GOOGLE_OAUTH_CLIENT_ID`.
2. Pokrenuti `npm run dev` i ulogovati se kao editor+.
3. Otvoriti meč sa popunjenim p1/p2 → Schedule sekcija → checkirati "Add to Google Calendar" → Schedule.
4. Verifikovati popup → consent → toast success → otvoriti Google Calendar admina → event vidljiv sa oba igrača kao attendees.
5. Igrač sa Gmail-om → proveriti pozivnicu u inbox-u + auto-dodato u njegov kalendar.
6. Igrač bez email-a → preskočen, admin event još uvek postoji.
7. Promeniti `scheduledAt` istog meča → event se update-uje (proveriti htmlLink).
8. Walkover → event nestaje sa kalendara (`status: cancelled`).
9. Pop-up blocked test (Brave/Safari strict) → fallback "Download .ics" radi → otvori `.ics` u sistemu, importuje se u native Calendar app.
10. Token expiry test: čekati >1h, schedule novi → silent re-auth blic-ne i prolazi.

## Otvorena pitanja

- **Lokacija meča (`location` polje)** — trenutno nije domain entity. Da li dodati `match.location` ili `competition.defaultLocation`? Predlog: kasniji feature; za sada `location: ''` ili admin upiše u Description ručno.
- **Default trajanje meča** — 90 min iz #02. Konfigurabilno per-competition? Predlog: konstanta sada, dopuniti ako bude trebalo.
- **Multi-admin event ownership** — vidi edge case "Admin koristi različit Google nalog". Da li forsirati single-organizer per-liga (enforce na nivou setup-a lige)?
- **Reauth UX** — koliko često je ok re-prompt? 1× dnevno verovatno prihvatljivo. Ako postane smetnja, prelazak na server-side refresh token (Cloud Function) — već skicirano kao opcija C.
- **Tournament bracket events** — treba li bulk "Schedule all KO matches u jednom potezu sa istim datumom"? Out of scope; ako se traži, batchModeRequest sa Calendar API-jem `events.insert` u petlji.
- **Localizacija notifikacija (Calendar invite jezik)** — Google koristi locale primaoca; ne kontroliše se odavde.

## Sledeći feature

#04 — Player self-service availability (iz `ProfilePage`, isti `playerAvailabilityRepository`).
#05 — Multi-competition pairing — soft suggestion kad isti par igra u više liga/turnira istog vikenda.
#06 — Two-way Calendar sync (igrač pomera u Calendar → app reaguje); zahteva Cloud Functions + push channel iz Calendar API-ja.
