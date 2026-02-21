# Tennis League PWA – Initial Documentation

Version: 1.0  
Status: Draft  
Last updated: 2026-02-07  

---

## 1. Overview

**Name:** Tennis League PWA  

**Description:**  
Tennis League PWA is a Progressive Web App designed for recreational tennis leagues.  
It enables players and organizers to track match schedules, results, rankings, and receive notifications.  
The application is offline-capable, allowing access even in environments with limited connectivity (e.g. tennis courts).

**Primary stack:** React + Inertia.js + Laravel + SQLite

This document provides a high-level overview of the problem space, stakeholders, and core business concepts.

---

## 2. Problem Statement

### Players
- Struggle to follow match schedules and results
- Often miss matches or are unaware of current standings
- Lack a single, reliable source of truth

### Organizers
- Manual management of rounds and rankings is slow and error-prone
- Difficult to notify participants about changes or updates
- No centralized system for league operations

### Goal
Provide a centralized digital platform that:
- Automatically updates match results and rankings
- Displays schedules, rounds, and league tables
- Sends notifications to participants
- Works offline as a Progressive Web App (PWA)

---

## 3. Stakeholders

- **Players**
  - View matches, standings, rankings
  - Edit profile
  - Receive notifications and updates

- **Organizers**
  - Create rounds and matches
  - Enter match results
  - Monitor league progress and statistics
  - Manual notifications


- **System / Admin**
  - Maintain system stability
  - Monitor data integrity
  - Auto-notifications
  - Manage configuration and access

---

## 4. Business Entities (High-Level)

> This section defines the core business vocabulary of the system.  
> No technical or implementation details are included here.

| Entity   | Description                     | Attributes |
|--------|---------------------------------|------------|
| League  | Recreational tennis league       | id, name, rules |
| Season  | Annual league cycle              | id, start_date, end_date, league_id |
| Round   | One set of matches               | id, number, date, season_id |
| Match   | Individual tennis match          | id, player1_id, player2_id, score, status |
| CompetitionPlayers   | List of players in league or tournament          | id, position, player_id |
| Player  | League participant               | id, name, email, rank, team_id |
| Team    | Optional grouping of players     | id, name, player_ids |
| Ranking | Player rankings per season       | id, season_id, player_list |
| News    | League announcements and updates | id, title, content, created_at |

---

## 5. Scope Notes

### In Scope
- Recreational tennis leagues and tournaments
- Season-based competition
- Result tracking and rankings
- History of tournaments
- Offline-first user experience
- Push notifications and reminders
- Accounts

### Out of Scope (for initial version)
- Awards points for users
- Betting system with points
- Financial transactions or payments
- We can show Top Player of the week/month

---

## 6. Next Documents

This overview serves as an entry point.  
Detailed design and decisions are covered in the following documents:

- `01-mvp-definition.md`
- `02-domain-model.md`
- `03-system-architecture.md`
- `04-core-flows.md`
- `05-states-and-rules.md`
- `adr/` (Architecture Decision Records)

---