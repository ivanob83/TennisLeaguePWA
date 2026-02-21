# 04 – Core Flows

Version: 1.0  
Status: Draft  
Last updated: 2026-02-08  

---

## 1. Overview

This document describes the **core user and system flows** for the Tennis League PWA.  
Flows represent typical interactions between **Players**, **Organizers**, and the system.  
They focus on **business behavior**, not implementation details.

---

## 2. User Flows

### 2.1 Player Flows

#### 2.1.1 View Match Schedule
1. Player opens the app (online/offline)
2. App fetches cached or live rounds and matches
3. Player sees upcoming matches sorted by date and round
4. Optional: Player sets reminders or notifications

#### 2.1.2 Enter Match Result (if allowed)
1. Player selects a finished match
2. Enters score
3. App validates score format
4. Domain layer checks match state and rules
5. Match result saved → Rankings updated
6. Notifications sent to affected players

#### 2.1.3 View Rankings
1. Player navigates to Rankings screen
2. Domain layer provides ordered list of players for the relevant season
3. App displays positions, points (if applicable), and trends

#### 2.1.4 View News
1. Player opens News section
2. App fetches latest announcements
3. Player can mark as read or share

---

### 2.2 Organizer Flows

#### 2.2.1 Create Season & Rounds
1. Organizer defines a new season (start/end dates)
2. System checks for overlapping seasons
3. Organizer creates a league or tournament inside the season
4. System automatically creates rounds and matches
5. Domain layer enforces round numbering and uniqueness
6. Rounds are persisted and available to players

#### 2.2.2 Schedule Matches
1. Organizer selects a round
2. Edits matches between players or teams and schedules date and time of play
3. Matches are saved → Notifications optionally triggered

#### 2.2.3 Enter Match Results
1. Similar to player flow, but organizer can override disputes
2. Domain rules validate result
3. Rankings recalculated
4. Notifications sent

#### 2.2.4 Publish News
1. Organizer creates announcement
2. Content is saved with timestamp
3. Players are notified (push/email)
4. News appears in app for all relevant players

---

## 3. System Flows

### 3.1 Offline Sync Flow
1. User performs actions offline (match entry, news read)
2. Actions are queued in local storage
3. Service worker detects online availability
4. Queued actions sent to backend
5. Conflicts resolved:
   - Automatic rules (latest score wins)
   - Manual review if dispute

### 3.2 Ranking Update Flow
1. Match status changes to `finished`
2. Domain service calculates new rankings for affected players
3. Updated ranking persisted in repository
4. Notifications sent to players about changes

### 3.3 Notification Flow
1. Event triggers notification (new match, result, news)
2. Application layer formats notification
3. Infrastructure layer sends push/email
4. Device displays notification to user

---

## 4. Flow Diagram (High-Level)

[Player/Organizer] --> [UI] --> [Application Layer] --> [Domain Layer] --> [Infrastructure]
^ |
|-------------------------------------------------------------------|
Offline sync / Notifications / Data persistence

---

## 5. Key Notes

- Flows respect domain rules (e.g., no match finished without score)
- Offline-first flows must handle conflict resolution gracefully
- Rankings are updated only after domain validation
- News and notifications are asynchronous but consistent
- Teams are optional; flows should work for both individual and team matches

---

## 6. Open Questions / To Be Defined

- Edge cases for walkovers or postponed matches
- How to handle player unavailability in match scheduling
- Offline conflict resolution strategy for multiple users entering results simultaneously
- Ranking algorithm details
