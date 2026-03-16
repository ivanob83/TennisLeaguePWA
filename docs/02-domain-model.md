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

- **Season** – A yearly time container (e.g. 2025, 2026) that groups all leagues and tournaments
- **League** – A competition that runs throughout most or all of a season; supports `round_robin`, `knockout`, or `round_robin_knockout` (hybrid) formats
- **Tournament** – A shorter, self-contained competition within a season; supports the same format options as a league
- **Round** – A set of matches played in a specific phase of a league or tournament (round-robin round or knockout stage)
- **Knockout** – A knockout-stage bracket within a league or tournament
- **Group** (also called Draw) – A sub-division of players within a league or tournament; used in round-robin and hybrid formats. Players are assigned to groups; group winners advance to the knockout bracket in hybrid format. Knockout format has no groups — players are seeded directly into a bracket.
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
Represents a recreational tennis league. Runs throughout most or all of a season.

**Responsibilities:**
- Defines competition format and rules
- Groups rounds and matches under a Season

**Attributes:**
- id
- season_id
- name
 - format: `round_robin` | `knockout` | `round_robin_knockout`
 - num_groups (required for `round_robin` and `round_robin_knockout`; null for pure knockout)
 - players_per_group (required for `round_robin` and `round_robin_knockout`; null for pure knockout)
 - rules
 
 **Invariants:**
 - A League belongs to exactly one Season.
 - Format determines which configuration fields are required.
 - Match slots for round-robin phases are auto-generated when all groups are fully assigned with players.

---

### 3.1a Tournament
Represents a recreational tennis tournament. Shorter time period than a league, but shares the same format options.

**Responsibilities:**
- Defines competition format and rules
- Groups rounds and matches under a Season

**Attributes:**
- id
- season_id
- name
 - format: `round_robin` | `knockout` | `round_robin_knockout`
 - num_groups (required for `round_robin` and `round_robin_knockout`; null for pure knockout)
 - players_per_group (required for `round_robin` and `round_robin_knockout`; null for pure knockout)
 - start_date
 - end_date
 - rules
 
 **Invariants:**
 - A Tournament belongs to exactly one Season.
 - Tournament dates must fall within the parent Season's date range.
 - Match slots are auto-generated once all groups reach full player capacity.

---

### 3.2 Season
Represents a yearly competition period (e.g. "2025", "2026"). Top-level temporal container for all leagues and tournaments.

**Responsibilities:**
- Groups leagues and tournaments under a named yearly period
- Defines overall time boundaries

**Attributes:**
- id
- name (e.g. "2025", "2026 Spring")
- start_date
- end_date

**Invariants:**
- A Season can contain many Leagues and many Tournaments.
- Seasons must not overlap in time (within the same application scope).

---

### 3.2a Group
Represents a draw/group of players in a round-robin or hybrid competition.

**Responsibilities:**
- Holds the list of players assigned to this group
- Acts as the source for auto-generating round-robin match slots (N players → N*(N-1)/2 match slots)

**Attributes:**
- id
- competition_id (league_id or tournament_id)
- competition_type (`league` | `tournament`)
- name (e.g. "Group A", "Group B")
- position (display order: 1, 2, 3...)
- player_ids (ordered list of players assigned to this group)

**Invariants:**
- A Group belongs to exactly one League or Tournament.
- A player may appear in only one group per competition.
- Knockout format has no groups.
- When a group reaches `players_per_group` capacity, match slots are auto-generated for that group.

---

### 3.3 Round
Represents a logical grouping of matches.

**Responsibilities:**
- Organizes matches within a League or Tournament

**Attributes:**
 - id
 - number
 - date
 - competition_id (league_id or tournament_id)
 - type: `round_robin` | `knockout`
 - group_id (for round-robin rounds; null for knockout rounds)

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
