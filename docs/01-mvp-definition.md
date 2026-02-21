# Tennis League PWA – MVP Definition

Version: 1.0  
Status: Draft  
Depends on: 00-overview.md  
Last updated: 2026-02-08

---

## 1. Purpose of This Document

This document defines the **Minimum Viable Product (MVP)** for Tennis League PWA.

Its purpose is to:
- Define what functionality is required for the **first usable version**
- Explicitly limit scope to protect delivery
- Serve as the reference point for all further design and implementation decisions

If a feature or decision is not aligned with this document, it is **not part of MVP**.

---

## 2. MVP Goal

The goal of the MVP is to provide a **usable digital system** that allows organizers to run a recreational tennis season and allows players to follow results and rankings.

The MVP must support the **full lifecycle of a season**, from setup to completed rankings, without manual data manipulation.

---

## 3. MVP User Roles

### Organizer (Primary MVP User)
- Create leagues and tournaments
- Create and manage seasons
- Enters match results
- Oversees league progress
- Create news

### Player (Read-only in MVP)
- Views matches and results
- Views rankings
- Views league information
- Views news

> Note: Players do not modify competition data in MVP.

---

## 4. MVP Use-Cases (Core)

The MVP consists of the following **five core use-cases**.

### UC-01: Create Season
An organizer creates a new season within a league.

### UC-02: Register Player
An organizer registers players for a season.

### UC-03: Create Match
An organizer creates a match between two players within a season.

### UC-04: Record Match Result
An organizer records the result of a match.
The system automatically updates standings and rankings.

### UC-05: View Ranking
Players and organizers can view current rankings for a season.

---

## 5. Explicitly Out of Scope (MVP)

The following features are **not part of MVP**, even if they exist conceptually in other documents.

- Team / doubles support
- Automated match scheduling
- Push notifications
- Email notifications
- Player self-management (self signup, self reporting)
- Advanced statistics
- Payments or financial features
- Multi-league management
- Admin dashboards beyond basic management

These features may be considered in future versions but must not affect MVP design.

---

## 6. Success Criteria (Definition of “Delivered”)

The MVP is considered **successfully delivered** when all of the following are true:

- An organizer can create a season
- An organizer can register players
- An organizer can create league or tournament
- An organizer can create matches between registered players
- An organizer can record match results
- Rankings are automatically calculated from recorded results
- Players can view rankings and match results
- No manual database or data manipulation is required

If all conditions above are met, the MVP is complete.

---

## 7. Non-Goals

The MVP is **not intended** to:
- Be fully automated
- Support all league formats
- Optimize for scalability
- Provide advanced UX or visual polish
- We can show Top Player of the week/month

The MVP prioritizes **correctness, clarity, and usability** over completeness.

---

## 8. Impact on Other Documents

- `02-domain-model.md`  
  Must include **only entities and relations required by MVP use-cases**

- `03-system-architecture.md`  
  Must reflect MVP boundaries and avoid speculative infrastructure

- `04-core-flows.md`  
  Must define contracts only for MVP use-cases

- `05-states-and-rules.md`  
  Must define states and invariants relevant to MVP only

---

## 9. Change Policy

Changes to MVP scope require:
- Explicit update of this document
- Acknowledgement that delivery timeline may be affected

Untracked scope changes are not permitted.
