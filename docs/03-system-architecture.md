# 03 – System Architecture

Version: 1.0  
Status: Draft  
Last updated: 2026-02-08  

---

## 1. Overview

This document describes the **high-level architecture** of the Tennis League PWA.  
It defines how the system is organized into layers and components, without delving into detailed implementation yet.  

**Goals:**
- Support offline-first capabilities (PWA)
- Maintain data integrity and consistency
- Separate concerns (UI, domain, persistence)
- Enable scalability and maintainability

**Primary stack:** React + Firebase (Firestore) + PWA + Service Workers

---

## 2. Architectural Principles

- **Layered Architecture:** The system is divided into layers with clear responsibilities.
- **Domain-Centric:** Business logic resides in the domain layer; the UI and persistence layers delegate to it.
- **Technology-Agnostic Domain:** Domain entities, value objects, and rules are independent of frameworks, databases, or infrastructure.
- **Offline-First PWA:** Client-side caching and synchronization allow working without internet connection.
- **Separation of Concerns:** UI, application services, domain logic, and infrastructure are decoupled.

---

## 3. Layers

### 3.1 Presentation Layer (UI)

**Responsibilities:**
- Display matches, rounds, rankings, and news
- Collect user input (match results, profile updates)
- Handle push notifications
- Offline caching via service workers

**Technologies:**
- React 19 + TypeScript
- React Router for client-side navigation
- PWA service workers
- IndexedDB or localForage for offline storage

---

### 3.2 Application Layer (Client-Side Services)

**Responsibilities:**
- Orchestrates use cases and user actions (fully client-side)
- Coordinates between UI and domain
- Implements workflows for automatically creating rounds and matches based on league or tournament rules
- Implements workflows, e.g., entering match results, updating rankings
- Validates input before calling domain services
- Manages Firestore SDK calls and offline queue management

**Components:**
- **Application Services** – TypeScript services handling commands like `RecordMatchResult`, `CreateRound`
- **DTOs / Models** – transfer data between UI components and domain layer
- **Firestore Repository Layer** – abstracts Firestore CRUD operations (replaces Laravel Eloquent models)
- **Firebase Hooks** – React hooks for auth state, data fetching, real-time listeners

---

### 3.3 Domain Layer

**Responsibilities:**
- Encapsulates core business logic
- Enforces invariants and rules
- Exposes domain entities and value objects

**Components:**
- **Entities:** Player, Match, Round, Season, League, Team, Ranking, News
- **Value Objects:** Score, MatchStatus, RankingPosition, SeasonPeriod
- **Domain Services:** Ranking calculation, dispute resolution
- **Aggregates:** Season (root for rounds/matches), League/Tournament (root for seasons)

**Notes:**
- No dependencies on UI, database, or external systems
- All state transitions and rules are enforced here

---

### 3.4 Infrastructure Layer

**Responsibilities:**
- Provides persistence, notifications, and external integrations
- Bridges domain layer with Firestore and external systems

**Components:**
- **Firestore Repositories:** CRUD access via Firebase SDK (e.g., `PlayerRepository`, `MatchRepository`)
- **Firebase Auth Service:** Manages user authentication and role claims
- **Notifications Service:** Firebase Cloud Messaging (FCM) + browser push when enabled
- **Sync Service:** Handles offline/online data synchronization via Firestore listeners and offline cache
- **Firestore Security Rules:** Enforce authorization and data validation at database layer
- **External Integrations:** Optional, e.g., Google Calendar export

**Notes:**
- Infrastructure is swappable; domain does not know implementation details
- Primary persistence is Firestore (NoSQL, real-time, offline-capable)

---

## 4. Data Flow

1. **User Interaction:** Player enters match result → React component collects data
2. **Application Layer:** Validates input → calls domain services → updates local state
3. **Domain Layer:** Updates entities → enforces rules → produces new state
4. **Infrastructure Layer:** Persists state to Firestore via SDK → offline cache updated → FCM notification queued
5. **UI Update:** React state updates → component re-renders; Firestore listener pushes real-time updates to other clients
6. **Offline Queue:** Changes queued locally; service worker syncs to Firestore when online

---

## 5. Offline-First Considerations

- **Firestore Offline Persistence:** Built-in via Firestore SDK (no manual IndexedDB needed)
- **Service Worker:** Handles background sync and push notifications
- **Offline Queue:** Client-side service tracks pending writes; syncs on reconnect
- **Conflict Resolution Strategy:**
  - Latest timestamp wins for match scores
  - Concurrent organizer edits flagged for manual review
  - Firestore security rules prevent unauthorized overwrites

---

## 6. Component Diagram (High-Level)

[React Components] <--> [Application Services] <--> [Domain Layer: Entities/Services] <--> [Firestore SDK] <--> [Firestore Database]
                                                                                            ↓
                                                                                     [Local Cache / Offline]
                                                                                            ↓
                                                                                     [Service Worker / FCM]


---

## 7. Key Decisions

- Domain layer remains framework-agnostic for flexibility; can be tested in isolation
- Use layered architecture to separate responsibilities
- PWA offline-first is a primary requirement
- Domain services handle ranking, disputes, and match validation
- Firestore chosen for real-time capabilities and offline support out-of-box
- All business logic runs client-side (Firestore security rules handle authorization)
- No backend server required; Firebase Cloud Functions used only for future advanced features

---

## 8. Open Questions / To Be Defined

- Offline conflict resolution edge cases (how to handle conflicting edits)
- Exact ranking calculation algorithm and frequency
- Notification strategies for rounds/matches (Firestore triggers? Client-side only?)
- Team management across seasons
- Tournament support alongside leagues
- Firestore collection structure and sub-collections vs. root-level collections
