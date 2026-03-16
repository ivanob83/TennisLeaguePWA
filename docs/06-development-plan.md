# Development Plan

Version: 2.2
Status: Active
Last updated: 2026-03-14

---

## Overview

This document defines a sprint-based plan for building the Tennis League PWA.
The plan assumes 2-week sprints and targets the MVP scope.

**Stack:** React 19 + Firebase (Firestore + Auth) + Vite + Tailwind CSS  
**Architecture:** Client-side domain layer + Firestore repositories + real-time listeners  
**Deployment:** Frontend on Vercel, backend as managed Firebase service  
**Design:** Inspired by Roland Garros visual identity (terra cotta palette, athletic typography, card layouts)

---

## Sprint 0 - Foundation & Firebase Setup

Status: ✅ COMPLETED

- ✅ Confirm MVP scope and success criteria
- ✅ Align domain terms across all docs
- ✅ **Migrated from Laravel to Firebase:**
  - ✅ Removed all Laravel/Inertia code (~300MB vendor cleanup)
  - ✅ Set up Vite + React Router for client-side routing
  - ✅ Created Firestore repository abstraction layer
  - ✅ Implemented Firebase Auth hook + context
  - ✅ Created real-time Firestore listener hooks
  - ✅ Updated all architecture docs (00, 03, 04, 07)
  - ✅ Created Firebase schema with security rules
- ✅ Project structure reorganized (app/js/config, services, hooks, lib)
- ✅ Repo setup (format, lint standards)
- ✅ Dev server running on Vite (npm run dev)
- ✅ PWA manifest structure ready

**Deliverables:**
- Clean React + Firebase starter project
- Firebase security rules template (07-firebase-schema.md)
- Repository abstraction ready for implementation

---

## Sprint 1 - Core Domain & Authentication

**Status:** ✅ COMPLETED (100%)

**Goal:** Set up authentication and foundation for domain entities

**Frontend Tasks:**
- ✅ Create login/register pages with Firebase Auth
- ✅ Add AuthContext provider to entire app
- ✅ Create protected routes (ProtectedRoute component - redirect to login if not authenticated)
- ✅ Create public routes (PublicRoute component - redirect to dashboard if authenticated)
- ✅ Implement logout functionality with Header navigation component
- ✅ User dashboard page (placeholder with stats cards)
- ✅ Implement user profile page and edit form
- ✅ Profile update functionality (displayName, email, password change)
- ✅ Google Authentication (Sign in with Google on login/register pages)
- ✅ Google profile photo display in Header component

**Backend Tasks (Firestore):**
- ✅ Create Firestore user document on Firebase Auth signup (via userRepository)
- ✅ Implement userRepository (createUser, getUserById, updateUser, userExists)
- ✅ Document Firestore security rules deployment process (08-firebase-deployment.md)
- 📋 Deploy Firestore security rules (manual step - see deployment guide)
- 📋 Set custom claims (role: player | editor | superadmin) - deferred to Sprint 2

**Domain Layer:**
- ✅ Implement domain entity types (Player, League, Season, Match, etc.) with JSDoc
- ✅ Domain types file created (app/js/types/domain.js)
- 📋 Domain validation services - deferred to Sprint 2 (implemented per-feature)

**Testing:**
- 📋 Auth flow integration tests - deferred to Sprint 5 (testing sprint)
- 📋 User profile CRUD tests - deferred to Sprint 5

**Completed Deliverables:**
- ✅ Login/register working (Firebase Auth integration)
- ✅ Google Authentication (Sign in/Sign up with Google)
- ✅ Auto-create Firestore user document on Google sign-in
- ✅ User dashboard page with protected route
- ✅ Protected route guards (ProtectedRoute + PublicRoute)
- ✅ Logout flow with Header navigation
- ✅ userRepository abstraction layer
- ✅ User profile page (view + edit mode)
- ✅ Profile update (name, email, password)
- ✅ Profile photo display (Google or initial avatar)
- ✅ Domain entity types defined (JSDoc)
- ✅ Firebase deployment guide (08-firebase-deployment.md)
- ✅ Google authentication setup guide (09-google-auth-setup.md)

**Deferred Items:**
- 📋 Firebase security rules deployment (manual step - requires Firebase project setup)
- 📋 Role-based access control setup (custom claims via Admin SDK - Sprint 2)
- 📋 Comprehensive testing suite (Sprint 5)
- 📋 Domain validation services (implement per-feature in Sprint 2+)

---

## Sprint 1.5 - Design System & UI Foundation

**Status:** IN PROGRESS (checklist-driven execution active)

**Goal:** Create a cohesive design system inspired by Roland Garros visual identity

**Completed Tasks:**
- ✅ Custom tennis league color palette defined
  - ✅ Primary: `#033629` (Deep forest green)
  - ✅ Secondary: `#cc4e00` (Burnt orange - clay court accent)
  - ✅ Text: `#242424`, Background: `#ffffff`, Light BG: `#fafafa`
- ✅ Tailwind config updated with custom Roland Garros theme (tailwind.config.js)
- ✅ Tailwind typography + spacing tokens added for UI library
  - ✅ 2 font families configured (heading + body)
  - ✅ section/card/form spacing tokens added
- ✅ All pages updated with custom color system (replaced hardcoded blues)
- ✅ Hybrid folder structure implemented (features + shared/components/hooks/services)
- ✅ Layout foundation:
  - ✅ Header component (navigation, user profile, logout)
  - ✅ ProtectedRoute component (authenticated routes)
  - ✅ PublicRoute component (login/register routes)
- ✅ Dedicated UI showcase route and page created
  - ✅ `/ui-showcase` route in `app/js/app.jsx`
  - ✅ `app/js/features/ui/pages/UIShowcasePage.jsx`
- ✅ Domain types with TypeScript JSDoc support
- ✅ Role-based access control (RBAC) defined:
  - ✅ superadmin, editor, player roles
  - ✅ Role permissions matrix (canManageLeagues, canPlayMatches, etc.)
  - ✅ Helper functions (hasRole, hasPermission)
  - ✅ Support for multi-role users (editor/superadmin can be player simultaneously)
- ✅ Firebase config improvements:
  - ✅ Replaced deprecated `enableIndexedDbPersistence` with `initializeFirestore` + `persistentLocalCache`
  - ✅ Added service worker check before Cloud Messaging
  - ✅ Better error handling and logging

**Remaining Tasks (Execution Checklist):**
- 📋 Tailwind design tokens (keep current color palette as source of truth)
  - ✅ Add exactly 2 font families (heading + body)
  - ✅ Add spacing tokens for section/card/form rhythm
  - 📋 Keep flat style constraints (no card shadows, no rounded corners in reusable UI components)
- 📋 Build reusable UI component library (`app/js/shared/components/ui/`)
  - ✅ `SectionTitle`
  - ✅ Button variations (`primary`, `secondary`, `outline`, `ghost`)
  - ✅ Form fields (text input, select, checkbox, radio wrappers)
  - ✅ Card base + `MatchCard`, `TournamentCard`, `NewsCard`, `PlayerCard`
  - ✅ `Badge/StatusBadge` (state mapping)
  - ✅ `Alert` primitive
  - 📋 Data table component for rankings/results
  - 📋 Toast notification system
- 📋 Dedicated UI showcase page (required)
  - ✅ Create `/ui-showcase` route in `app/js/app.jsx`
  - ✅ Build `app/js/features/ui/pages/UIShowcasePage.jsx`
  - ✅ Showcase all required components and states (default/hover/focus/disabled/loading)
- 📋 Incremental adoption in existing pages
  - ✅ Refactor `LoginPage` and `RegisterPage`
  - ✅ Refactor `DashboardPage`, `HomePage`, `ProfilePage`

**Execution Order:**
1. Tailwind tokens (fonts/spacing/elevation)
2. Core primitives (`SectionTitle`, `Button`, form fields, `Card` base)
3. Domain cards (`MatchCard`, `TournamentCard`, `NewsCard`, `PlayerCard`) + badges
4. Dedicated `/ui-showcase` page and route
5. Incremental adoption across existing pages

**Design System Reference:**
- Clay court orange/terracotta color palette
- Athletic typography (bold headlines, clean body text)
- Card-based layouts with flat surfaces (no rounded corners, no drop shadows)
- Elegant use of whitespace
- Tennis-specific iconography
- Responsive grid system
- Smooth animations and transitions

**Typography:**
- Heading font: Bold, athletic sans-serif (similar to Montserrat/Poppins)
- Body font: Clean, readable sans-serif (Inter/Open Sans)
- Constraint: use max 2 font families in Tailwind config for Sprint 1.5

**Study Reference:**
- [Roland Garros Website](https://www.rolandgarros.com)
- Extract color codes from screenshots
- Analyze card layouts and spacing patterns
- Note animation styles (hover effects, transitions)

---

## Sprint 2 - Players, Season, League & Tournament Setup

**Goal:** Admin can manage players, create seasons, configure leagues/tournaments with draw structure, assign players to groups, and have match slots auto-generated

**Domain Model Recap:**
- **Season** = top-level yearly container (e.g. "2025", "2026"); all competitions live inside a season
- **League** = competition spanning most/all of a season; format: `round_robin` | `knockout` | `round_robin_knockout`
- **Tournament** = shorter self-contained competition within a season; same format options
- **Group** = sub-division of players ("Group A", "Group B") within RR or hybrid competitions; knockout has no groups, just a seeded player list

**Creation Order (strict prerequisite chain):**
1. Admin creates **Players** (player profiles must exist in the system before competitions can be set up)
2. Admin creates a **Season** (must exist before creating any competition)
3. Admin creates a **League** or **Tournament** (must select an existing season)
4. Admin assigns players to the competition draw (requires players from step 1)

---

### Part A — Player Management (MVP UC-02)

> Players must exist in the system before they can be assigned to any competition draw.

**Frontend Tasks:**
- ✅ Player creation form: name, email, optional avatar upload
- ✅ Player list page (admin view): name, avatar, linked status
- ✅ Player list accessible from main navigation
- ✅ Admin user management (create, edit, role change)
- ✅ Player ↔ User linking (admin can link/unlink one player per user)
- ✅ Header avatar + display name sourced from linked player
- 📋 Player edit form: update name, avatar
- 📋 Player detail page: stats placeholder, competition history placeholder

**Backend Tasks (Firestore):**
- ✅ Implement `PlayerRepository` (CRUD — top-level `players` collection)
- ✅ Player documents separate from Firebase Auth user documents
  - ✅ `authUid` field on player document: null if unlinked, uid if linked
- ✅ Connection request flow (user requests link → admin approves)

**Domain Layer:**
- Player name required; email must be unique across players
- Player creation does not require a Firebase Auth account

---

### Part B — Season & Competition Setup

**UX Flow (per competition):**
1. **Season** — Admin creates a season first (name, start date, end date). A season must exist before any league or tournament can be created.
2. **Create competition** — Choose season (from existing list), name, format, rules. For `round_robin` or `round_robin_knockout`: also set number of groups and players per group. For `knockout`: only player count needed.
3. **Tab 1 — Setup**: View/edit competition config after creation.
4. **Tab 2 — Draw**: Assign players to groups (RR/hybrid: drag or select players per group) or set seeded player order for the bracket (knockout: ordered list of players).
5. **Tab 3 — Group Matches**: Shows auto-generated round-robin match slots per group. Slots appear automatically once a group reaches `players_per_group` capacity (N players → N*(N-1)/2 match slots). Visible only for `round_robin` and `round_robin_knockout` formats.
6. **Tab 4 — Knockout**: Shows auto-generated knockout bracket slots from the seeded list (1 vs N, 2 vs N-1, etc.). Visible for `knockout` and `round_robin_knockout` formats.
7. Match slots from Tab 3 and Tab 4 become the input for Sprint 3's match scheduling and results workflow.

**Frontend Tasks:**
- Season creation form (name, start date, end date)
- Season list view
- League creation form:
  - Fields: season (dropdown — required, must select existing season), name, format, rules
  - Conditional fields shown only for `round_robin` / `round_robin_knockout`: `num_groups`, `players_per_group`
  - System auto-creates empty group slots (`num_groups` × named groups) on save
- League list view with season filter
- Tournament creation form (same fields as league + `start_date` / `end_date` constrained within season bounds)
- Tournament list view with season filter
- Competition detail page with **4 tabs**:
  - **Tab 1 — Setup**: view/edit competition config (name, format, rules, dates)
  - **Tab 2 — Draw**:
    - `round_robin` / `round_robin_knockout`: assign players to groups (drag or select); shows player count vs `players_per_group` target per group
    - `knockout`: manage ordered seed list (select players, drag to reorder)
  - **Tab 3 — Group Matches** *(visible for `round_robin` and `round_robin_knockout` only)*: shows auto-generated match pair slots per group; slots appear when group is full; each slot shows player1 vs player2 with status `pending`
  - **Tab 4 — Knockout** *(visible for `knockout` and `round_robin_knockout` only)*: shows auto-generated knockout bracket; first-round matchups generated from seed order; bracket tree visualization

**Backend Tasks (Firestore):**
- Implement `SeasonRepository` (CRUD — top-level `seasons` collection)
- Implement `LeagueRepository` (CRUD — stores `season_id`, format, `num_groups`, `players_per_group`)
- Implement `TournamentRepository` (CRUD — stores `season_id`, date range, format config)
- Implement `GroupRepository` (subcollection under each competition: `leagues/{id}/groups`, `tournaments/{id}/groups`)
- Implement enrollment subcollection (`leagues/{id}/enrollments`, `tournaments/{id}/enrollments`)
- **Match slot auto-generation** (triggered server-side when group player list reaches capacity):
  - RR group of N players → write N*(N-1)/2 match documents with status `pending`
  - Knockout seeded list → write first-round bracket match documents (1 vs N, 2 vs N-1, etc.)
- Firestore real-time listeners for league/tournament/group/match-slot updates

**Domain Layer:**
- Format validation (`round_robin`, `knockout`, `round_robin_knockout` only)
- `num_groups` + `players_per_group` required for RR/hybrid; forbidden (null) for pure knockout
- Tournament date validation (within parent season date range)
- Player uniqueness per group (a player may appear in only one group per competition)
- Match slot generation: group of N → N*(N-1)/2 slots; correct pair enumeration
- Knockout bracket generation: ordered seed list → first-round matchups (seed 1 vs seed N, seed 2 vs seed N-1, etc.)

**Testing:**
- Player CRUD (create, read, update, list)
- Season CRUD
- League/Tournament CRUD with format + group config validation
- Conditional field validation (`num_groups` required for RR, null for knockout)
- Season prerequisite: cannot create competition without a season
- Group assignment: duplicate player rejection
- Match slot auto-generation: correct count and correct player pairs for various N
- Knockout bracket generation: correct bracket pairings from seed order

**Deliverables:**
- Admin can create and manage player profiles
- Admin can create a season
- Admin can create a league or tournament (must select an existing season)
- Admin can assign players to groups (or seed bracket order for knockout)
- Group Matches tab shows auto-generated match slots when group is full
- Knockout tab shows auto-generated bracket from seed list
- Competition lists filterable by season


---

## Sprint 3 - Rounds, Matches & Results

**Goal:** Full match scheduling and result recording workflow

**Frontend Tasks:**
- Round creation form (number, name, date range)
- Match creation form (select player pair, schedule date/time)
- Match list view (upcoming and finished)
- Match detail + score entry form
- Results confirmation flow

**Backend Tasks (Firestore):**
- Implement RoundRepository (nested under seasons)
- Implement MatchRepository (nested under rounds)
- Real-time listeners for matches in a round
- Firestore write permissions control (who can edit match scores)

**Domain Layer:**
- Match domain service (state transitions: scheduled → in_progress → finished)
- Route match completion to ranking update service
- Match validation (both players exist, valid scores)

**Testing:**
- Match CRUD with permission checks
- State transitions (scheduled → finished)
- Result entry flow (both player and organizer)

**Deliverables:**
- Organizer can create rounds and matches
- Players can record match results
- Match status tracked in Firestore

---

## Sprint 4 - Rankings, News & PWA

**Goal:** Automatic ranking updates, announcements, and offline capability

**Frontend Tasks:**
- Rankings page (display current season rankings)
- Ranking trending view (show rank changes over time)
- News feed page (league-specific announcements)
- News creation form (organizers only)
- PWA manifest and service worker setup
- Add "Install App" prompt for PWA

**Backend Tasks (Firestore):**
- Implement RankingRepository (denormalized rankings document)
- Implement NewsRepository
- Firestore real-time listeners for rankings and news
- Deploy FCM (Cloud Messaging) subscription handler
- Set up Firestore background update trigger (on match finish → update rankings)

**Domain Layer:**
- Ranking calculation service (wins, losses, win rate)
- Ranking update triggered on match completion
- News validation (title, content required)

**Offline:**
- Firestore offline persistence working
- Service worker caches app shell
- Background sync for queued operations

**Testing:**
- Ranking recalculation on match scores
- News visibility (public vs league-only)
- Offline read/write with sync on reconnect

**Deliverables:**
- Rankings auto-update when matches finish
- News feed visible to league members
- App installable as PWA
- Offline read capability

---

## Sprint 5 - Stabilization & Release (MVP)

**Goal:** Polish, testing, and production readiness

**Frontend Tasks:**
- Accessibility audit (WCAG 2.1 AA compliance)
- UI polish (mobile responsiveness, dark mode)
- Error handling and user feedback (toast notifications)
- Loading states and skeletons
- Browser testing (Chrome, Firefox, Safari, Edge)

**Backend Tasks (Firestore):**
- Firestore security rules audit
- Query performance optimization (add composite indexes if needed)
- Backup strategy documentation
- Rate limiting and quota monitoring

**Domain Layer:**
- Edge case handling (walkovers, postponements)
- Dispute resolution workflow (organizer override)
- Input validation comprehensive review

**Testing:**
- Unit tests: domain services (ranking, match validation)
- Integration tests: auth, league creation, match workflows
- E2E tests: full user flows (signup → join season → record result)
- Offline sync testing

**Documentation:**
- Deployment guide (Firebase setup, Vercel hosting)
- User guide (player and organizer workflows)
- Admin guide (Firebase management)
- API/Firestore schema finalization

**Deliverables:**
- MVP ready for release
- Production Firestore project configured
- Deployment automated via CI/CD
- User documentation complete

---

## Open Items

### Technical Decisions
- **Design System:** Implement Roland Garros-inspired visual identity with terra cotta palette, athletic typography, and card-based layouts (Sprint 1.5)
- **Ranking recalculation:** Client-side on match finish? Or Cloud Function trigger?
- **Notifications:** FCM for push notifications or in-app only for MVP?
- **Analytics:** Firebase Analytics integration?
- **Offline conflict resolution:** How to handle concurrent match score edits from multiple devices?

### Future Enhancements (Post-MVP)
- Tennis-specific icons (racket, ball, trophy, court) and status indicators
- Loading animations (tennis ball bounce, court draw, etc.) and skeleton loaders
- Design system documentation (`10-design-system.md`)
- Team-based matches (vs individual players)
- Tournament brackets (vs league round-robin)
- Points/rating system
- Match video upload/replay
- Social features (player profiles, comments)
- Admin dashboard for moderators
- Billing/payments (if moving away from free tier)

---

## Tech Stack (Updated v2.1)

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Frontend** | React | 19.2.4 | UI components and views |
| **Routing** | React Router | 7.0.0 | Client-side navigation |
| **Styling** | Tailwind CSS | 3.4.17 | Utility-first CSS + Roland Garros theme |
| **Build Tool** | Vite | 7.0.7 | Fast bundler and dev server |
| **Backend/DB** | Firebase (Firestore) | 11.0.0 | Real-time NoSQL database |
| **Authentication** | Firebase Auth | included | Email/password + Google OAuth |
| **Notifications** | Firebase Cloud Messaging | included | Push notifications (future) |
| **Deployment** | Vercel (frontend) + Firebase (backend) | N/A | Hosting and serverless |
| **PWA** | Service Workers | included | Offline support + installability |

---

## Development Setup

### Prerequisites
- Node.js 18+
- npm 9+
- Firebase account (free tier sufficient for MVP)

### Installation
```bash
npm install
```

### Development Commands
```bash
npm run dev          # Start Vite dev server (http://localhost:5173)
npm run build        # Build for production (dist/)
npm run preview      # Preview production build locally
npm run format       # Format code with Prettier
npm run format:fix   # Fix formatting automatically
```

### Environment Setup
1. Copy `.env.example` to `.env`
2. Get Firebase credentials from [Firebase Console](https://console.firebase.google.com)
3. Fill in `VITE_FIREBASE_*` values in `.env`
4. Restart dev server

### Project Structure
```
app/js/
├── main.jsx              # Vite entry point
├── app.jsx               # Root component
├── config/               # Firebase configuration
├── context/              # React Context (auth, etc)
├── hooks/                # Custom React hooks
├── lib/                  # Repositories and utilities
├── services/             # Business logic (domain services)
├── types/                # TypeScript interfaces
├── Pages/                # Route components
└── css/                  # Tailwind styles
```

### Key Practices
- **Domain layer:** Implement business logic in `services/` (independent of UI/DB)
- **Firestore access:** Use repositories in `lib/firestore.js`
- **Real-time data:** Use `useFirestore` and `useFirestoreDoc` hooks
- **Authentication:** Use `useAuthContext()` to get current user
- **Component isolation:** Keep components focused on UI, delegate logic to hooks/services

---

## Migration Notes (From Laravel to Firebase)

**Why Firebase?**
- No backend server needed (reduces hosting complexity)
- Built-in offline support (PWA-friendly)
- Real-time listeners (sync across devices instantly)
- Managed authentication + authorization
- Free tier generous for MVP

**Major Changes:**
- Server-side routes → Client-side routes (React Router)
- Laravel models/Eloquent → Firestore repositories  
- Request/response cycle → Real-time listeners
- Session management → Firebase Auth tokens
- Database migrations → Firestore collections (manual setup)
- Authorization middleware → Firestore security rules
