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

**Primary stack:** React + Inertia.js + Laravel + SQLite

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
- React + TypeScript (via Inertia.js)
- Inertia.js adapters and page routing
- PWA service workers
- IndexedDB or localForage for offline storage

---

### 3.2 Application Layer

**Responsibilities:**
- Orchestrates use cases and user actions
- Coordinates between UI and domain
- Implements workflows for automatically creating rounds and matches based on league or tournament rules
- Implements workflows, e.g., entering match results, updating rankings
- Validates input before calling domain services

**Components:**
- **Application Services** – handle commands like `RecordMatchResult`, `CreateRound`
- **DTOs / Request Models** – transfer data from UI to domain layer
 - **Controllers / Actions** – Laravel controllers returning Inertia responses

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
- Bridges domain layer with databases and external systems

**Components:**
- **Repositories:** CRUD access for entities (e.g., `PlayerRepository`, `MatchRepository`)
- **Notifications Service:** Laravel notifications (email, push when enabled)
- **Sync Service:** Handles offline/online data synchronization
- **External Integrations:** Optional, e.g., Google Calendar export

**Notes:**
- Infrastructure is swappable; domain does not know implementation details
 - Primary persistence is SQLite via Laravel's database layer

---

## 4. Data Flow

1. **User Interaction:** Player enters match result → UI collects data  
2. **Application Layer:** Validates input → calls domain services  
3. **Domain Layer:** Updates entities → enforces rules → produces new state  
4. **Infrastructure Layer:** Persists state (SQLite via Laravel) → triggers notifications → syncs offline data  
5. **UI Update:** Inertia response updates the React UI

---

## 5. Offline-First Considerations

- Use **IndexedDB/localForage** to cache user data and matches
- Service worker handles background sync when connectivity is restored
- Conflict resolution strategy:
  - Latest update wins for scores
  - Manual review for disputes

---

## 6. Component Diagram (High-Level)

[UI Layer: React/PWA] <--> [Application Services] <--> [Domain Layer: Entities/Services] <--> [Infrastructure: DB, Notifications, Sync]


---

## 7. Key Decisions

- Domain layer remains framework-agnostic for flexibility
- Use layered architecture to separate responsibilities
- PWA offline-first is a primary requirement
- Domain services handle ranking, disputes, and match validation
- Infrastructure is abstracted to allow future DB or API changes

---

## 8. Open Questions / To Be Defined

- Offline conflict resolution edge cases
- Exact ranking calculation algorithm
- Notification strategies for rounds/matches
- Team management across seasons
- Tournament support alongside leagues
