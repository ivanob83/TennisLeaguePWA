# Domain Model

Version: 1.0  
Status: Draft  
Last updated: 2026-02-07  

---

## 1. Purpose

This document defines the **domain model** of the Tennis League PWA.

The domain model describes:
- Core business concepts
- Their responsibilities and relationships
- Business rules and invariants

This document is **technology-agnostic** and must not depend on:
- UI frameworks (React)
- APIs
- Databases
- Infrastructure concerns

---

## 2. Ubiquitous Language

The following terms are used consistently across the system:

- **League** – An organizational unit for competition
- **Tournament** – An organizational unit for competition (shorter period then league)
- **Tournament** – An organizational unit for competition (shorter period than league)
- **Season** – A time-bounded competition cycle for league and tournaments
- **Round** – A set of matches played in a specific phase of a league or tournament
- **Knockout** – A set of matches played in a specific phase of a league or tournament
- **Match** – A tennis game between two players
- **Player** – A participant in the league
- **CompetitionPlayers** - List of players in specific league or tournament
- **Team** – Optional grouping of players
- **Ranking** – Ordered list of players based on results
- **News** – Announcements related to the league
- **Winner** - Match Winner
- **Top Player** - Top Player of given time range
- **Champion** - Winner of league or tournament final
- **Vice Champion** - Finalist of league or tournament final

These terms must not be reinterpreted or renamed at the implementation level.

---

## 3. Core Entities

### 3.1 League
Represents a recreational tennis league.

**Responsibilities:**
- Defines competition rules
- Groups seasons under a single identity

**Attributes:**
- id
- name
- rules

**Notes:**

---

### 3.1a Tournament
Represents a recreational tennis tournament.

**Responsibilities:**
- Defines competition rules
- Groups seasons under a single identity

**Attributes:**
- id
- name
- rules

**Notes:**

---

### 3.2 Season
Represents a single competition cycle and can have league(s) and tournament(s).

**Responsibilities:**
- Groups rounds and matches
- Defines time boundaries for competition

**Attributes:**
- id
- start_date
- end_date
- league_id
- tournament_id

**Invariants:**
- A Season can have many leagues and tournaments.
- A Season must not overlap with another active Season in the same League.

---

### 3.3 Round
Represents a logical grouping of matches.

**Responsibilities:**
- Organizes matches within a League or Tournament

**Attributes:**
- id
- number
- date
- season_id

**Invariants:**
- A Round belongs to exactly one League or Tournament.
- Round numbers are unique within a League or Tournament.

---

### 3.4 Match
Represents a single tennis match between two players.

**Responsibilities:**
- Holds match participants
- Tracks match state and score

**Attributes:**
- id
- player1_id
- player2_id
- score
- status

**Invariants:**
- A Match must have exactly two distinct players or teams (doubles matches).
- A Match belongs to one Round and one League or Tournament.
- A score may only exist if the Match is finished.

---

### 3.5 Player
Represents an individual participant.

**Responsibilities:**
- Participates in matches
- Appears in rankings

**Attributes:**
- id
- name
- email
- avatar
- rank
- team_id

**Invariants:**
- A Player may participate in multiple Leagues or Tournaments.
- A Player may belong to zero or one Team.

---

### 3.6 Team (Optional)
Represents a group of players.

**Responsibilities:**
- Groups players for organizational or competitive purposes

**Attributes:**
- id
- name
- player_ids

**Notes:**
- Teams are optional and league-dependent.

---

### 3.7 Ranking
Represents player ordering for a Season, League or Tournament.

**Responsibilities:**
- Calculates and stores player order

**Attributes:**
- id
- season_id
- player_list

**Invariants:**
- A Ranking reflects only finished matches.

---

### 3.8 News
Represents announcements and updates.

**Responsibilities:**
- Communicates information to players and organizers

**Attributes:**
- id
- title
- content
- created_at

---

### 3.9 CompetitionPlayers
Represents list of players inside of aggregate league or tournament.

**Responsibilities:**
- It is mapping match players slots with exact players

**Attributes:**
- id
- position
- player_id

---

## 4. Value Objects

The following concepts have no identity and are defined by value:

- **Score**
- **MatchStatus**
- **RankingPosition**
- **SeasonPeriod**

Value Objects:
- Are immutable
- Are compared by value, not identity

---

## 5. Match State Model

A Match can exist in one of the following states:

- `pending`
- `scheduled`
- `in_progress`
- `finished`
- `disputed`

### Valid transitions:
scheduled → in_progress → finished
finished → disputed


Invalid transitions are not allowed and must be rejected by the domain.

---

## 6. Key Business Rules

- A Match cannot be finished without a valid Score.
- A Player cannot play against themselves.
- Rankings are updated only after a Match is finished.
- Rules defined at the League level shouldn't be updated.

---

## 7. Domain Boundaries

The domain model:
- Does not handle persistence
- Does not handle authentication
- Does not know about notifications or UI

These concerns are handled by other layers.

---

## 8. Open Questions / To Be Defined

- Ranking calculation algorithm
- Match walkover, postpone ...
- Dispute resolution workflow
- Team relevance across Seasons
- Multi-league player participation

These items will be refined in future versions.

---
