# Feature: Admin — Pending Approvals (one-click approve)

## Cilj

Jedna admin stranica koja prikaže **sve mečeve `status === 'pending_approval'`** iz svih takmičenja (lige + turniri), sa **jednim klikom Approve** po meču (+ Approve all). Meč nestane iz liste nakon approve.

Motiv: skorove unose igrači → idu u `pending_approval` → admin mora ručno da nađe svaki i approvuje. Sad na jednom mestu.

## Postojeći delovi koji se koriste (NE menjati logiku)

- **Skeniranje cross-competition:** `collectionGroup(db, 'matches')` — vidi šablon `app/src/features/admin/pages/AdminOrphanMatchesPage.jsx` (isti pattern: scan → kartice → akcija po kartici, `parseMatchPath`).
- **Approve servis:** `approveScores(competitionType, competitionId, roundId, match, enrollments)` u `app/src/features/matches/services/matchService.js`.
  - Kopira `pendingSets`→`sets`/`scores`, `pendingWinnerId`→`winnerId`, `status='finished'`, `finishedAt=now`, čisti pending polja.
  - Interno zove `onMatchFinished` → `recalculateRankings(competitionType, competitionId, enrollments)`.
  - `match` arg mora imati: `id`, `pendingSets`, `pendingWinnerId`.
- **Reject (opciono dugme):** `rejectScores(competitionType, competitionId, roundId, match)` — vrati na `scheduled`/`not_scheduled`.
- **Match detail ruta (Open dugme):** `/${competitionType}/${competitionId}/rounds/${roundId}/matches/${matchId}`.

## Ključni detalji

1. **Path parsing:** `leagues/{compId}/rounds/{roundId}/matches/{matchId}`. `parts[0]` = `competitionType` (`'leagues'`|`'tournaments'`) — to je tačno ono što `approveScores`/`matchesRepository` očekuju (plural). NE koristi `data.competitionType` (ono je singular `'league'`).

2. **Enrollments za recalc + imena igrača:** jednim upitom `collectionGroup(db, 'enrollments')`, pa grupiši po `competitionId` (iz `doc.ref.path`):
   - `enrollmentsByComp[compId]` = `[{ playerId, playerName }]` → prosleđuje se u `approveScores`.
   - `nameMap[playerId]` = `playerName` → za prikaz imena na kartici (pending meč nema `player1Name`/`player2Name`).

3. **Prikaz skora na kartici:** iz `pendingSets` (`[{p1,p2}]`). Pobednik = `pendingWinnerId` → boldiraj to ime. Prikaži i `submittedAt` (Firestore timestamp → datum).

4. **Posle approve:** dodaj path u `approvedPaths` Set → kartica nestaje (kao `fixedPaths` u orphan stranici). Prikaži preostali broj.

5. **Approve all:** sekvencijalno `await` po svim vidljivim mečevima (grupisano da recalc po ligi ne pukne — svaki approve već fire-and-forget recalc; ok sekvencijalno).

## UX

- Auto-scan na mount (`useEffect`) da se lista pojavi bez klika + dugme **Refresh**.
- Grupisati kartice po takmičenju (naziv lige/turnira kao heading) — naziv iz `leaguesRepository`/`tournamentsRepository` ili iz enrollment/match; ako komplikovano, ravna lista sa badge-om `competitionType` je dovoljna za v1.
- Svaka kartica: imena igrača, skor po setovima, pobednik bold, `submittedAt`, dugmad **Approve** (success), **Reject** (ghost, opciono), **Open** (link, target=_blank).
- Prazno stanje: `Alert success` "Nema mečeva na čekanju."
- Loading/error kao u orphan stranici (log lista).

## Pristup (access control)

- Approve je **editor-level** (komentar u servisu: "editor only"). Gejtuj sa `isEditor` (ne samo superadmin) — koristi `useAuthContext()`.

## Fajlovi

1. **Nova stranica:** `app/src/features/admin/pages/AdminPendingApprovalsPage.jsx` (šablon = orphan stranica).
2. **Ruta:** `app/src/app.jsx` — lazy import + `<Route path="/admin/pending-approvals" ...>` unutar `<ProtectedRoute>`.
3. **Nav link:** `app/src/navigation/config.js` — dodaj u `adminNavItems` (BEZ `superadminOnly`, vidljivo editorima). Ikona npr. `CheckCheck` iz lucide-react.

## Definicija gotovog

- `npm run format` prolazi.
- Stranica skenira i prikaže sve `pending_approval` mečeve iz svih takmičenja.
- Approve po meču radi (score finalizovan, rankings recalc, kartica nestaje).
- Editor i superadmin vide stranicu i link.

## Van opsega (v1)

- Real-time listener/badge sa brojem u headeru (kasnije).
- Bulk reject.
