# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Analytics servisi

Na početku svake sesije proveri da li analytics servisi rade:

```bash
curl -s http://localhost:4318/api/stats
curl -s testapi/health
```

Ako neki ne odgovara, pitaj korisnika da li želi da ga pokrene i prikaži komandu:

- **Monitoring server:** `node D:/claude-monitoring/server.js`
- **Grafana:** `cd /d D:/grafana && bin/grafana-server.exe --homepath D:/grafana --config D:/grafana/conf/custom.ini`

## Commands

```bash
npm run dev          # Start dev server at http://localhost:5173
npm run build        # Production build to dist/
npm run preview      # Preview production build
npm run format       # Check formatting with Prettier
npm run format:fix   # Auto-fix formatting
```

No test suite is configured.

## Stack

- **React 19** + **Vite** — entry point `app/src/main.jsx`, root component `app/src/app.jsx`
- **React Router v7** — all routes defined in `app.jsx`
- **Firebase** — Auth + Firestore (no REST API; all data via SDK)
- **Tailwind CSS 3.4** — custom design tokens in `tailwind.config.js`
- **Context API** — global state only via `AuthContext` and `ToastContext`

## Architecture

### Feature-first structure

```
app/src/
├── infrastructure/     # All Firebase/external service plumbing
│   ├── firebase.js     # Firebase init (app, auth, db, messaging)
│   ├── firestore.js    # FirestoreRepository class + all repository exports
│   └── avatar.js       # Avatar upload service
├── features/           # One folder per domain
│   └── <feature>/
│       ├── pages/      # Route-level components
│       ├── components/ # Feature-scoped components (auth has ProtectedRoute, PublicRoute)
│       ├── context/    # Feature-scoped context (only auth has one)
│       ├── hooks/
│       └── services/   # Firestore access for this feature
├── navigation/         # Header + nav as a self-contained feature
│   ├── Header.jsx
│   ├── config.js       # primaryNavItems, createNavItems, adminNavItems
│   └── components/     # HeaderBrand, HeaderNavLink, MobileMenu, etc.
├── ui/                 # Pure, dumb UI primitives — no Firebase, no domain logic
│   ├── Button.jsx, Card.jsx, Input.jsx, ...
│   └── index.js        # Barrel export
├── layouts/            # AppLayout
├── context/            # ToastContext
├── hooks/              # useFirestoreCollection, useFirestoreDoc, useFirestoreDocOnce
├── utils.js            # cn() — Tailwind class merging
└── types/domain.js     # JSDoc type definitions for all domain entities
```

### Firestore repository pattern

`infrastructure/firestore.js` exports a `FirestoreRepository` class with `getById`, `getAll`, `create`, `update`, `delete`, and `query`. All feature data access goes through pre-instantiated repositories exported from that file:

```js
playersRepository, seasonsRepository, leaguesRepository,
tournamentsRepository, usersRepository, connectionRequestsRepository,
leagueEnrollmentRepository(leagueId),   // nested sub-collection factories
roundsRepository(competitionType, competitionId), ...
```

`create` and `update` auto-add `createdAt`/`updatedAt` timestamps.

For real-time listeners use the hooks in `hooks/useFirestore.js` (`useFirestoreCollection`, `useFirestoreDoc`). For one-time fetches in `useEffect`, call repository methods directly.

### Auth & roles

`AuthContext` (`features/auth/context/AuthContext.jsx`) loads the Firestore user profile after `onAuthStateChanged`. It exposes:
- `user` — Firebase Auth object
- `profile` — Firestore `users/{uid}` document
- `isAuthenticated`, `isSuperadmin`, `isEditor`
- `refreshProfile()`

Roles: `superadmin | editor | player`. The first user to register is auto-assigned `superadmin`. A superadmin cannot change their own role. Role checks in components use `isEditor` (true for both editor and superadmin) or `isSuperadmin`.

Route guards: `ProtectedRoute` (requires auth), `PublicRoute` (redirects away if already authenticated).

### UI component conventions

All shared primitives live in `ui/` and are barrel-exported from `ui/index.js`.

**Page layout pattern** — every page follows this structure:
```jsx
<AppLayout>
  <Container className="py-8">
    <SectionTitle title="..." subtitle="..." action={<Button>...</Button>} />
    <div className="mt-8">
      {/* page content */}
    </div>
  </Container>
</AppLayout>
```
- `Container` = `mx-auto max-w-7xl px-6`
- `SectionTitle` renders a full-width `border-b border-slate-200` with an accent underline bar (`bg-secondary`), title left, optional `action` node right
- For create/form pages use `<div className="mt-8 max-w-lg">` inside Container to constrain the form

**Toasts** — use `useToast()` → `showToast({ title, message, variant })`. Variants: `success | error | info`.

### Navigation

`navigation/config.js` exports three groups used by the header/menus:
- `primaryNavItems` — shown to all authenticated users
- `createNavItems` — editor+ only (create shortcuts)
- `adminNavItems` — editor+ with `superadminOnly` flag for Users link

### Environment variables

All Firebase credentials via `.env` (prefix `VITE_FIREBASE_*`). See `.env.example`. Optional: `VITE_USE_FIREBASE_EMULATOR=true` to use local emulators.

## Domain model highlights

- **Competition formats**: `round_robin`, `knockout`, `round_robin_knockout`
- **Competition status**: `draft → active → completed → archived`
- **Player** — standalone entity with optional `authUid` linking to a Firebase Auth user. Connection is established via `connectionRequests` collection (player sends request → admin approves, or admin links directly).
- **Season** contains leagues and tournaments; always create season first, then competitions within it.
