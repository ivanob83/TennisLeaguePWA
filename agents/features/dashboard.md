---
feature: dashboard
routes:
  - /dashboard
access: authenticated users only (ProtectedRoute)
collections: []
---

Korisnički dashboard — lična stranica za ulogovanog korisnika. Trenutno prikazuje placeholder podatke.

## Page: DashboardPage `/dashboard`

**Svrha:** Welcome stranica za ulogovanog korisnika sa pregledom ličnih statistika.

**Logika:**
- Čita `user` i `loading` iz `AuthContext`. Prikazuje loading state dok se auth inicijalizuje.
- Prikazuje tri statistike kartice: "My Leagues" (0), "Upcoming Matches" (0), "Ranking" (-) — sve su placeholder vrednosti, nema Firestore poziva.
- Subtitle je `Welcome back, {user.email}`.
- Link ka `/profile` na dnu stranice.

**Access control:**
- Zahteva autentifikaciju (`ProtectedRoute`). Neautentifikovani korisnici se preusmeravaju na `/login`.

**Firestore operacije:**

Nema — svi podaci su placeholder (hardkodovane 0 i "-" vrednosti).

## Napomene

- Ova stranica je u ranoj fazi razvoja (stub). Buduće implementacije trebaju: broj liga u kojima je igrač prijavljen, nadolazeće mečeve vezane za `authUid` korisnika, i rang poziciju iz `rankings` kolekcije.
- `user.email` se koristi za prikaz; profil (`profile` iz AuthContext) nije konzumiran na ovoj stranici.
