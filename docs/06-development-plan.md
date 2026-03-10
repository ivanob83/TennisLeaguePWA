# Development Plan

Version: 2.1  
Status: Active  
Last updated: 2026-02-28

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
- 📋 Set custom claims (role: player | organizer | admin) - deferred to Sprint 2

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

**Status:** � IN PROGRESS (~60% complete)

**Goal:** Create a cohesive design system inspired by Roland Garros visual identity

**Completed Tasks:**
- ✅ Custom tennis league color palette defined
  - ✅ Primary: `#033629` (Deep forest green)
  - ✅ Secondary: `#cc4e00` (Burnt orange - clay court accent)
  - ✅ Text: `#242424`, Background: `#ffffff`, Light BG: `#fafafa`
- ✅ Tailwind config updated with custom Roland Garros theme (tailwind.config.js)
- ✅ All pages updated with custom color system (replaced hardcoded blues)
- ✅ Hybrid folder structure implemented (features + shared/components/hooks/services)
- ✅ Layout foundation:
  - ✅ Header component (navigation, user profile, logout)
  - ✅ ProtectedRoute component (authenticated routes)
  - ✅ PublicRoute component (login/register routes)
- ✅ Domain types with TypeScript JSDoc support
- ✅ Role-based access control (RBAC) defined:
  - ✅ superadmin, admin, player roles
  - ✅ Role permissions matrix (canManageLeagues, canPlayMatches, etc.)
  - ✅ Helper functions (hasRole, hasPermission)
  - ✅ Support for multi-role users (admin can be player simultaneously)
- ✅ Firebase config improvements:
  - ✅ Replaced deprecated `enableIndexedDbPersistence` with `initializeFirestore` + `persistentLocalCache`
  - ✅ Added service worker check before Cloud Messaging
  - ✅ Better error handling and logging

**Remaining Tasks:**
- 📋 Build reusable UI component library (app/js/components/ui/)
  - 📋 Button variations (primary, secondary, outline, ghost)
  - 📋 Card components (match cards, player cards, league cards)
  - 📋 Form components (text input, select, checkbox, radio)
  - 📋 Data table component for rankings/results
  - 📋 Badge/Trophy components
  - 📋 Toast notification system
- 📋 Icons and visual elements
  - 📋 Tennis-specific icons (racket, ball, trophy, court)
  - 📋 Status indicators
- 📋 Loading states and animations
  - 📋 Skeleton loaders
  - 📋 Loading animations (tennis ball bounce, court draw, etc.)
- 📋 Create Storybook or component showcase page
- 📋 Design system documentation (10-design-system.md)

**Design System Reference:**
- Clay court orange/terracotta color palette
- Athletic typography (bold headlines, clean body text)
- Card-based layouts with subtle shadows
- Elegant use of whitespace
- Tennis-specific iconography
- Responsive grid system
- Smooth animations and transitions

**Typography:**
- 📝 Heading font: Bold, athletic sans-serif (similar to Montserrat/Poppins)
- 📝 Body font: Clean, readable sans-serif (Inter/Open Sans)
- 📝 Mono font: Code/timestamps (Fira Code/Roboto Mono)

**Study Reference:**
- [Roland Garros Website](https://www.rolandgarros.com)
- Extract color codes from screenshots
- Analyze card layouts and spacing patterns
- Note animation styles (hover effects, transitions)

---

## Sprint 2 - League & Season Management

**Goal:** Organizers can create and manage leagues and seasons

**Frontend Tasks:**
- League creation form (name, description, settings)
- League list view (all leagues user can manage or join)
- Season creation form (dates, name)
- Season list within league
- Player enrollment page (show seasons and enroll players)

**Backend Tasks (Firestore):**
- Implement LeagueRepository (CRUD operations)
- Implement SeasonRepository (nested under leagues)
- Implement PlayerRepository (season-specific enrollment)
- Add Firestore listeners for real-time league/season updates

**Domain Layer:**
- Season validation (non-overlapping dates per league)
- Player enrollment validation (no duplicate enrollments)

**Testing:**
- League CRUD (organizer permissions)
- Season CRUD (validation, date constraints)
- Player enrollment flow

**Deliverables:**
- Organizer can create leagues (stored in Firestore)
- Organizer can create seasons with date validation
- Players can join seasons

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
