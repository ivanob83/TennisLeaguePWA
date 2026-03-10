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
5. Application service writes to Firestore (if authorized by security rules)
6. Firestore security rules verify player permissions
7. Match result saved → Rankings updated → Real-time listeners notify other clients
8. FCM push notifications sent to affected players

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
3. Application service writes to Firestore (if authorized by security rules)
4. Firestore listeners update UI for all connected clients in real-time
5. Notifications optionally triggered via FCM

#### 2.2.3 Enter Match Results
1. Similar to player flow, but organizer can override disputes
2. Domain rules validate result
3. Write to Firestore (authorization checked by security rules)
4. Rankings recalculated via domain service
5. Firestore updated with new rankings
6. Real-time listeners push updates to all clients
7. FCM push notifications sent to affected players

#### 2.2.4 Publish News
1. Organizer creates announcement
2. Content is saved to Firestore with timestamp
3. Firestore real-time listeners notify all clients
4. FCM push notifications sent to players
5. News appears in app immediately for all connected clients

---

## 3. System Flows

### 3.1 Offline Sync Flow
1. User performs actions offline (match entry, news read)
2. Actions are queued in Firestore's local offline cache (automatic)
3. Service worker detects online availability
4. Firestore SDK automatically syncs pending writes to server
5. Conflicts resolved:
   - Automatic rules (latest timestamp wins for match scores)
   - Firestore security rules prevent unauthorized overwrites
   - Manual review if organizer override needed for disputes

### 3.2 Ranking Update Flow
1. Match status changes to `finished`
2. Application service calls domain service to calculate new rankings for affected players
3. Rankings written to Firestore (validated by security rules)
4. Real-time Firestore listeners push updated rankings to all connected clients
5. FCM push notifications sent to players with ranking changes

### 3.3 Notification Flow
1. Event triggers notification (new match, result, news)
2. Application layer formats notification message
3. Infrastructure layer (Firebase Admin SDK or client-side) sends FCM push
4. Device receives push and displays notification to user
5. Notification click opens relevant app view

---

## 4. Flow Diagram (High-Level)

[Player/Organizer] --> [UI] --> [Application Layer] --> [Domain Layer] --> [Firestore SDK]
^ |                                                                              |
|-----> [Firestore Security Rules] --> [Firestore DB]
        [FCM / Real-time Listeners] <----|

---

## 5. Key Notes

- Flows respect domain rules (e.g., no match finished without score)
- Offline-first flows handled automatically by Firestore SDK (no manual queue management)
- Rankings are updated only after domain validation
- News and notifications are real-time via Firestore listeners and FCM
- Teams are optional; flows should work for both individual and team matches
- Firestore security rules enforce authorization at database level (reduces need for client-side permission checks)
- Real-time listeners keep all connected clients in sync automatically

---

## 6. Open Questions / To Be Defined

- Edge cases for walkovers or postponed matches
- How to handle player unavailability in match scheduling
- Offline conflict resolution strategy for multiple users entering results simultaneously
- Ranking algorithm details
