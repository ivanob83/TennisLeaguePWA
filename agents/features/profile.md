---
feature: profile
routes:
  - path: /profile
    component: ProfilePage
access: authenticated (vlastiti profil)
collections:
  - users
  - players
  - connectionRequests
---

Korisnički profil — pregled i izmena Firebase Auth podataka (displayName, email, lozinka) i Firestore user dokumenta. Uključuje `PlayerLinkSection` za povezivanje naloga sa player profilom.

## ProfilePage — `/profile`

### Profil sekcija

**Firestore (one-time fetch):**
- `getUserById(user.uid)` → `users/{uid}` doc — za `role`, `displayName`, `createdAt`

**View mode:** prikazuje displayName, email, role (Badge), member since datum.

**Edit mode (Firebase Auth + Firestore):**
- `updateProfile(user, { displayName })` — Firebase Auth
- `updateEmail(user, email)` — Firebase Auth (zahteva nedavnu autentikaciju)
- `updatePassword(user, newPassword)` — Firebase Auth (ako popunjeno, min 6 chars)
- `updateUser(uid, { displayName, email, updatedAt })` — Firestore users doc

**Validacija:** passwordi moraju biti isti; min 6 karaktera za novu lozinku.

**Stats placeholder:** hardkodirano 0/0/— (nije implementirano).

---

### PlayerLinkSection (subkomponenta)

**Svrha:** Igrač koji ima Auth nalog može da poveže nalog sa player profilom slanjem connection request-a.

**Firestore (one-time fetch, na mount):**
1. `playersRepository.query([where('authUid', '==', user.uid)])` — proverava da li je nalog već linkovan
2. Ako nije linkovan:
   - `connectionRequestsRepository.query([where('userId', '==', user.uid)])` — proverava postoji li zahtev
   - `playersRepository.query([where('authUid', '==', null)])` — nelinkovani igrači (za dropdown)

**Stanja:**
- Linkovan → prikazuje `linkedPlayer.name` + "Connected" badge
- Pending zahtev → prikazuje `latestRequest.playerName` + "Awaiting approval" badge
- Rejected zahtev → Alert + forma za novi zahtev
- Nema zahteva → forma za slanje zahteva

**Slanje zahteva:**
- `connectionRequestsRepository.create({ playerId, playerName, userId, userEmail, userName, status: 'pending', resolvedAt: null, resolvedBy: null })`
- Odobrava admin sa `/players/connection-requests`

---

## Firestore kolekcije

| Kolekcija | Pristup | Napomena |
|---|---|---|
| `users` | read/write | getUserById, updateUser |
| `players` | read | query po authUid i authUid == null |
| `connectionRequests` | read/write | query po userId |
