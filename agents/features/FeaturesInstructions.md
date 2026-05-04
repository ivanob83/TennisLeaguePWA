# Play League — Features

## Instrukcije za novu sesiju

Cilj: za svaki feature u projektu postoji `agents/features/<feature>.md` fajl koji opisuje
kako feature funkcioniše — stranice, rute, Firestore kolekcije, logika, access control.
Ovi fajlovi služe da LLM razume feature bez čitanja koda.

### Kako kreirati feature MD fajl

1. Istraži feature folder: `app/src/features/<feature>/` — pročitaj sve fajlove
2. Napravi `agents/features/<feature>.md` sa sledećom strukturom:
   - Frontmatter: `feature`, `routes`, `access`, `collections`
   - Kratak opis šta feature radi
   - Po jedna sekcija za svaku stranicu (ruta, svrha, logika, Firestore operacije)
   - Tabela Firestore kolekcija na kraju
3. Označi feature kao `[x]` u listi ispod

### Napomena
Fajlovi su namenjeni LLM-u, ne ljudima — budi tehnički i konkretan.
Fokus na: šta se čita/piše u Firestore, koja logika postoji, koja rola ima pristup.

---

## Lista features

- [x] [Admin](admin.md) — upravljanje korisnicima, rolama i seed podacima
- [x] [Auth](auth.md) — autentikacija, registracija, route guards, AuthContext
- [x] [Competitions](competitions.md) — pregled svih takmičenja
- [x] [Dashboard](dashboard.md) — dashboard za ulogovanog korisnika
- [x] [Enrollment](enrollment.md) — prijava igrača, žreb, grupna faza, knockout
- [x] [Home](home.md) — landing stranica, prikaz takmičenja i mečeva
- [x] [Leagues](leagues.md) — CRUD liga
- [x] [Matches](matches.md) — unos rezultata mečeva
- [x] [News](news.md) — vesti, kreiranje i prikaz članaka
- [x] [Players](players.md) — CRUD igrača, connection request flow
- [x] [Profile](profile.md) — korisnički profil, avatar upload
- [x] [Rankings](rankings.md) — rang lista po takmičenju
- [x] [Seasons](seasons.md) — CRUD sezona
- [x] [Tournaments](tournaments.md) — CRUD turnira
