---
feature: auth
routes: /login, /register
access: public (login/register), guards za sve ostale rute
collections: users, players
---

# Auth Feature

Firebase autentikacija sa email/password i Google OAuth. Upravljanje rolama i route guards.

---

## Stranice

### LoginPage — `/login`

- Email + password forma
- "Sign in with Google" dugme
- Redirect na `/dashboard` po uspešnom loginu
- PublicRoute wrapper — redirect na `/dashboard` ako je već ulogovan
- Fallback za displayName: `email.split('@')[0]` ako nema displayName

### RegisterPage — `/register`

- Polja: Display Name, Email, Password, Confirm Password
- Validacija: password match, min 6 chars, required fields
- Firebase error mapping: `auth/email-already-in-use`, `auth/invalid-email`, `auth/weak-password`
- **Flow:**
  1. `createUserWithEmailAndPassword()` — kreira Firebase Auth user
  2. `updateProfile()` — seta displayName u Firebase Auth
  3. `isFirstUser()` — proverava da li je ovo prvi user u kolekciji (`limit(1)`)
  4. `createUser()` — kreira Firestore dokument sa rolom:
     - prvi user → `superadmin`
     - svi ostali → `player`
  5. Redirect na `/dashboard`

---

## Components

### ProtectedRoute

Wrapper za rute koje zahtevaju autentikaciju.

- Prikazuje loading spinner dok se proverava auth state
- Redirect na `/login` ako nije autentikovan

### PublicRoute

Wrapper za login/register stranice.

- Redirect na `/dashboard` (konfigurabilan prop `redirectTo`) ako je već ulogovan

---

## AuthContext (`features/auth/context/AuthContext.jsx`)

Globalni auth state. Dostupan via `useAuthContext()`.

**State koji eksponuje:**

```js
{
  user,           // Firebase Auth objekat
  profile,        // Firestore users/{uid} dokument
  linkedPlayer,   // Player dokument gde authUid === uid
  loading,        // true dok se proverava auth state
  isAuthenticated,
  isSuperadmin,   // role === 'superadmin'
  isEditor,       // role === 'editor' || role === 'superadmin'
  logout,
  refreshProfile, // ručno reload profila iz Firestorea
}
```

**Flow pri loginu:**

1. `onAuthStateChanged()` detektuje Firebase user
2. `loadProfile(uid)` — fetchuje Firestore dokument
3. Ako dokument ne postoji → auto-kreira ga (Google OAuth flow)
4. Query `players` za linked player: `where('authUid', '==', uid)`
5. `setLoading(false)`

---

## userRepository (`features/auth/services/userRepository.js`)

Firestore kolekcija: `users`

| Funkcija                    | Opis                                         |
| --------------------------- | -------------------------------------------- |
| `createUser(uid, data)`     | Kreira dokument sa `serverTimestamp()`       |
| `getUserById(uid)`          | Fetch po UID                                 |
| `updateUser(uid, updates)`  | Parcijalni update                            |
| `userExists(uid)`           | Boolean check                                |
| `isFirstUser()`             | `limit(1)` query — da li je kolekcija prazna |
| `getAllUsers()`             | Svi useri, order by `createdAt ASC`          |
| `updateUserRole(uid, role)` | Menja rolu                                   |

**Dokument struktura:**

```js
{
  uid: string,        // = document ID = Firebase Auth UID
  email: string,
  displayName: string,
  photoURL?: string,
  role: 'superadmin' | 'editor' | 'player',
  createdAt: timestamp,
  updatedAt: timestamp,
}
```

---

## Role sistem

| Rola         | `isSuperadmin` | `isEditor` |
| ------------ | -------------- | ---------- |
| `player`     | false          | false      |
| `editor`     | false          | true       |
| `superadmin` | true           | true       |

Checks su client-side u komponentama via `useAuthContext()`.

---

## Firestore kolekcije

| Kolekcija | Operacija                     |
| --------- | ----------------------------- |
| `users`   | create, read, update          |
| `players` | read (`where authUid == uid`) |
