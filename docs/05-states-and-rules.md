# 05 – States and Rules

Version: 1.0  
Status: Draft  
Last updated: 2026-02-08  

---

## 1. Overview

This document defines the **states** of key entities and the **business rules** that govern their transitions in the Tennis League PWA.  
It ensures that all flows, domain logic, and validations are consistent with the domain model.

---

## 2. Match States

A **Match** can exist in one of the following states:

| State          | Description                                   |
|----------------|-----------------------------------------------|
| `pending`    | Match is created but not scheduled              |
| `scheduled`    | Match is planned but not started              |
| `in_progress`  | Match has started                             |
| `finished`     | Match is completed and score is recorded     |
| `disputed`     | Result is contested and requires review      |

### 2.1 Valid Transitions

- `pending` → `scheduled` → `in_progress`
- `in_progress` → `finished`
- `finished` → `disputed`

**Notes:**
- Invalid transitions must be rejected by the domain.
- Score can only be recorded when a match is `finished`.

---

## 3. Season States

A **Season** has implicit lifecycle states:

| State       | Description                                   |
|------------|-----------------------------------------------|
| `planned`   | Season defined but not started                |
| `active`    | Current season where rounds and matches occur|
| `completed` | All rounds finished, rankings finalized      |

**Rules:**
- Seasons cannot overlap other seasons.
- Rounds can only be added in `planned` or `active` states. 

---

## 4. Player and Team Rules

### 4.1 Player
- A player cannot play against themselves.
- A player may belong to zero or one team.
- Players can participate in multiple leagues or tournaments.

### 4.2 Team
- Teams are optional and league-dependent.
- Team membership is validated when scheduling matches.
- Teams may persist across seasons if league allows.

---

## 5. Ranking Rules

- Rankings are updated only after a match is marked `finished`.
- Rankings reflect **only completed matches**.
- Ranking calculation is domain service responsibility (algorithm TBD).
- Ties must be handled consistently (e.g., equal points → same rank).

---

## 6. News Rules

- News items are immutable after creation.
- Created news must include title, content, and timestamp.
- News is visible to all relevant participants in the league or tournament.

---

## 7. Additional Business Rules

- League rules apply to all seasons within the league.
- Score must be valid to mark match as `finished`.
- Walkovers, postponements, or disputes are handled via domain services.
- Notifications triggered by match result, new round, or news creation.

---

## 8. Open Questions / To Be Defined

- Exact ranking calculation algorithm
- Walkover, postponement, or default rules
- Dispute resolution workflow for matches
- Offline conflict resolution edge cases
- Team relevance across multiple seasons
