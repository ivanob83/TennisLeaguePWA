---
feature: admin
routes: /admin/users, /admin/users/create, /admin/users/:userId/edit, /admin/seed, /admin/seed/playopen-2022
access: superadmin only
collections: users, players, seasons, tournaments, enrollments, groups, rounds, matches
---

# Admin Feature

Administracija korisnika, rola i seed podataka. Sve stranice zahtevaju `superadmin` rolu.

---

## Stranice

### AdminUsersPage — `/admin/users`

Tabela svih korisnika sa inline upravljanjem rolama.

- Listuje sve korisnike (name, email, rola, datum kreiranja)
- Inline dropdown za promenu role (`player | editor | superadmin`)
- "Save" se prikazuje samo kad je rola promenjena
- Delete dugme je disabled za samog sebe
- **Zaštita:** `isOwnSuperadmin(uid)` sprečava superadmina da sebi ukloni rolu
- Badge "You" za trenutno ulogovanog
- Toast na uspešnu promenu role

**Firestore:** `usersRepository.getAll()`

---

### AdminUserEditPage — `/admin/users/:userId/edit`

Detaljna izmena korisnika + linkovanje sa player profilom.

**User sekcija:**

- Edituje `displayName` (required)
- Email je read-only
- Menja rolu

**Player linking sekcija:**

- Korisnik može biti linkovano sa tačno jednim playerom
- Dropdown prikazuje playere koji nemaju `authUid`
- Link: `playersRepository.update(playerId, { authUid: userId })`
- Unlink: `playersRepository.update(playerId, { authUid: null })`

**Firestore queries:**

```js
getUserById(userId)
playersRepository.query([where('authUid', '==', userId)]) // linked player
playersRepository.query([where('authUid', '==', null)]) // free players
```

Sve tri query-je izvršava paralelno sa `Promise.all`.

---

### AdminUserCreatePage — `/admin/users/create`

Kreiranje novog korisnika od strane admina.

- Polja: Display Name, Email, Password, Rola (default: player)
- Validacija: email regex, password min 6 chars, name required
- **Ključni pattern:** Koristi sekundarnu Firebase app instancu da admin ne bude izlogovan:
  ```js
  const secondaryApp = initializeApp(firebaseConfig, `admin-create-${Date.now()}`)
  const secondaryAuth = getAuth(secondaryApp)
  // kreira usera pa signOut samo iz secondary
  ```
- Čuva u Firestore via `userRepository.createUser()`

---

### AdminSeedsPage — `/admin/seed`

Hub stranica za seed operacije. Nema direktnih Firestore upita.

- Lista dostupnih seedova sa imenom, opisom i tagovima
- Svaki seed ima "Run" link ka seed stranici
- Explicit access check: `if (!isSuperadmin) return <AccessDenied>`

---

### SeedPlayopen2022Page — `/admin/seed/playopen-2022`

Jednosmerni seeder za istorijski turnir PLAYOPEN Jun 2022.

**Šta kreira:**

- 1 sezona: "2022" (completed)
- 1 turnir: "PLAYOPEN Jun 2022" (format: `round_robin_knockout`)
- 16 igrača
- 4 grupe po 4 igrača → 24 RR mečeva (6 po grupi)
- 2 polufinala + 1 finale

**Zaštita od duplikata:**

```js
const existing = await tournamentsRepository.query([where('name', '==', 'PLAYOPEN Jun 2022')])
if (existing.length > 0) throw new Error('Already exists. Delete first.')
```

**UI:**

- Real-time log izvršavanja
- 3 dugmeta: "Run Seed" / "Delete & Re-seed" / "Retry"
- Link ka kreiranom turniru po završetku

**Firestore collections written:** `seasons`, `tournaments`, `players`, `enrollments`, `groups`, `rounds`, `matches`

---

## Firestore kolekcije

| Kolekcija                                                  | Operacija            |
| ---------------------------------------------------------- | -------------------- |
| `users`                                                    | read, update, create |
| `players`                                                  | read, update         |
| `seasons`                                                  | create               |
| `tournaments`                                              | create, query        |
| `leagues/{id}/enrollments`, `tournaments/{id}/enrollments` | create               |
| `*/groups`                                                 | create               |
| `*/rounds`                                                 | create               |
| `*/rounds/*/matches`                                       | create               |
