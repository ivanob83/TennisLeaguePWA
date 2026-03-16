# 07 – Firebase Schema & Security Rules

Version: 1.0  
Status: Draft  
Last updated: 2026-02-28  

---

## 1. Overview

This document defines the **Firestore database schema**, **Firebase Authentication setup**, and **Firestore Security Rules** for the Tennis League PWA.

All business entities from [02-domain-model.md](02-domain-model.md) map to Firestore collections. Authentication and authorization are handled by Firebase Auth + Firestore security rules.

---

## 2. Firestore Collections

### 2.1 Collection Structure (Root Level)

```
firestore/
├── users/                  # Firebase Auth user profiles
├── leagues/                # Leagues (top-level organizations)
│   └── {leagueId}
│       └── seasons/       # Seasons within a league
│           └── {seasonId}
│               ├── rounds/        # Rounds within a season
│               │   └── {roundId}
│               │       └── matches/   # Matches within a round
│               ├── players/       # Competition players (enrolled)
│               └── rankings/      # Season rankings (computed)
├── news/                   # League announcements
```

---

## 3. Document Schemas

### 3.1 `users` Collection

**Path:** `users/{userId}`

**Purpose:** User account and profile information.

```typescript
{
  uid: string                    // Firebase Auth UID
  email: string                  // User email
  displayName: string            // User's full name
  role: 'player' | 'editor' | 'superadmin'  // User role (custom claim)
  createdAt: Timestamp           // Account creation date
  updatedAt: Timestamp           // Last profile update
  profilePicture?: string        // URL to profile image (optional)
  phone?: string                 // Contact phone (optional)
}
```

**Notes:**
- `uid` matches Firebase Auth UID
- `role` is set as a Firebase Auth custom claim for efficient authorization checks
- Only users can read/write their own document

---

### 3.2 `leagues` Collection

**Path:** `leagues/{leagueId}`

**Purpose:** League organization and metadata.

```typescript
{
  id: string                     // Auto-generated Firestore ID
  name: string                   // League name (e.g., "Monday Night Tennis")
  description: string            // League description
  createdBy: string              // User ID of league organizer
  createdAt: Timestamp           // League creation date
  status: 'active' | 'archived'  // League status
  settings: {
    autoCreateSequentialMatches: boolean  // Auto-schedule based on rules
    allowPlayerResultEntry: boolean       // Players can enter scores
    requireOrganizerConfirm: boolean      // Organizer must confirm results
  }
}
```

**Notes:**
- `createdBy` determines who can manage league
- Permissions: League creator acts as organizer; players can view

---

### 3.3 `leagues/{leagueId}/seasons` Subcollection

**Path:** `leagues/{leagueId}/seasons/{seasonId}`

**Purpose:** Season (tournament cycle) within a league.

```typescript
{
  id: string                     // Auto-generated Firestore ID
  leagueId: string               // Parent league ID
  name: string                   // Season name (e.g., "Spring 2026")
  startDate: Timestamp           // Season start date
  endDate: Timestamp             // Season end date
  status: 'pending' | 'active' | 'completed'
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

**Notes:**
- Season must have non-overlapping dates within a league
- Validation: `startDate < endDate`

---

### 3.4 `leagues/{leagueId}/seasons/{seasonId}/rounds` Subcollection

**Path:** `leagues/{leagueId}/seasons/{seasonId}/rounds/{roundId}`

**Purpose:** A set of matches within a season (e.g., "Round 1", "Semifinals").

```typescript
{
  id: string                     // Auto-generated Firestore ID
  seasonId: string               // Parent season ID
  number: integer                // Round number (e.g., 1, 2, 3...)
  name: string                   // Round name (e.g., "Round 1" or "Semifinals")
  startDate: Timestamp           // Scheduled start of round
  endDate: Timestamp             // Expected completion date
  status: 'scheduled' | 'in_progress' | 'completed'
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

**Notes:**
- `number` should be unique within a season
- All matches in a round should fall between `startDate` and `endDate`

---

### 3.5 `leagues/{leagueId}/seasons/{seasonId}/rounds/{roundId}/matches` Subcollection

**Path:** `leagues/{leagueId}/seasons/{seasonId}/rounds/{roundId}/matches/{matchId}`

**Purpose:** Individual match (game between two players/teams).

```typescript
{
  id: string                     // Auto-generated Firestore ID
  roundId: string                // Parent round ID
  scheduledDate: Timestamp       // When match should be played
  player1Id: string              // First player UID
  player2Id: string              // Second player UID
  player1Score?: integer         // Score for player 1 (null if not finished)
  player2Score?: integer         // Score for player 2 (null if not finished)
  status: 'scheduled' | 'in_progress' | 'finished' | 'cancelled' | 'walkover'
  resultEnteredBy: string | null // UID of user who entered result
  resultEnteredAt: Timestamp | null
  createdAt: Timestamp
  updatedAt: Timestamp
  notes?: string                 // Optional notes (e.g., postponement reason)
}
```

**Notes:**
- Scores only valid when `status === 'finished'`
- `resultEnteredBy` tracks who entered the result (for audit)
- Validation: `player1Id !== player2Id`

---

### 3.6 `leagues/{leagueId}/seasons/{seasonId}/players` Subcollection

**Path:** `leagues/{leagueId}/seasons/{seasonId}/players/{playerId}`

**Purpose:** Track players enrolled in a season (competition entry record).

```typescript
{
  id: string                     // Auto-generated Firestore ID
  seasonId: string               // Parent season ID
  userId: string                 // Reference to user UID
  joinedAt: Timestamp            // When player joined the season
  status: 'active' | 'inactive' | 'removed'
}
```

**Notes:**
- Separate from `users` collection to track season-specific enrollment
- Multiple entries possible if a player exists in multiple seasons

---

### 3.7 `leagues/{leagueId}/seasons/{seasonId}/rankings` Subcollection

**Path:** `leagues/{leagueId}/seasons/{seasonId}/rankings/{rankingId}`

**Purpose:** Computed rankings for a season (one document per season, updated when matches finish).

```typescript
{
  id: string                     // Auto-generated Firestore ID (typically "current")
  seasonId: string               // Parent season ID
  players: [
    {
      userId: string             // Player UID
      position: integer          // Rank position (1, 2, 3...)
      wins: integer              // Number of wins
      losses: integer            // Number of losses
      matchesPlayed: integer     // Total matches in season
      winRate: float             // Calculated: wins / matchesPlayed
    }
  ]
  updatedAt: Timestamp           // When rankings last recalculated
}
```

**Notes:**
- Denormalized for performance (avoids aggregation queries)
- Updated by domain service when match status changes to `finished`
- Sorted by position for quick UI display

---

### 3.8 `news` Collection

**Path:** `news/{newsId}`

**Purpose:** League announcements and updates (global or league-specific).

```typescript
{
  id: string                     // Auto-generated Firestore ID
  leagueId: string | null        // League ID (null if platform-wide)
  title: string                  // Announcement title
  content: string                // Announcement content (markdown supported)
  createdBy: string              // User UID of author
  createdAt: Timestamp           // Publication date
  updatedAt: Timestamp           // Last edit date
  visibility: 'public' | 'leagueOnly'  // Who can see this news
}
```

**Notes:**
- If `leagueId` is null, all players see news
- If `leagueId` specified, only league members see news

---

## 4. Firestore Security Rules

### 4.1 Base Rules

```rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }

    function isUser(userId) {
      return request.auth.uid == userId;
    }

    function userRole() {
      return request.auth.token.role;
    }

    function isEditorOrSuperadmin() {
      return userRole() in ['editor', 'superadmin'];
    }

    function leagueCreator(leagueId) {
      return get(/databases/$(database)/documents/leagues/$(leagueId)).data.createdBy == request.auth.uid;
    }

    // --- Users Collection ---
    match /users/{userId} {
      allow read: if isUser(userId);
      allow create: if isUser(userId);
      allow update: if isUser(userId);
      allow delete: if isUser(userId);
    }

    // --- Leagues Collection ---
    match /leagues/{leagueId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated() && request.resource.data.createdBy == request.auth.uid;
      allow update: if leagueCreator(leagueId) || isEditorOrSuperadmin();
      allow delete: if leagueCreator(leagueId) || isEditorOrSuperadmin();

      // Seasons subcollection
      match /seasons/{seasonId} {
        allow read: if isAuthenticated();
        allow create: if leagueCreator(leagueId);
        allow update: if leagueCreator(leagueId);
        allow delete: if leagueCreator(leagueId);

        // Rounds subcollection
        match /rounds/{roundId} {
          allow read: if isAuthenticated();
          allow create: if leagueCreator(leagueId);
          allow update: if leagueCreator(leagueId);
          allow delete: if leagueCreator(leagueId);

          // Matches subcollection
          match /matches/{matchId} {
            allow read: if isAuthenticated();
            allow create: if leagueCreator(leagueId);
            allow update: if leagueCreator(leagueId) || 
              (request.resource.data.status == 'finished' && 
               (isUser(request.resource.data.player1Id) || isUser(request.resource.data.player2Id)));
            allow delete: if leagueCreator(leagueId);
          }
        }

        // Players subcollection (seasonal enrollment)
        match /players/{playerId} {
          allow read: if isAuthenticated();
          allow create: if leagueCreator(leagueId);
          allow update: if leagueCreator(leagueId) || isUser(resource.data.userId);
          allow delete: if leagueCreator(leagueId);
        }

        // Rankings subcollection
        match /rankings/{rankingId} {
          allow read: if isAuthenticated();
          allow create, update, delete: if leagueCreator(leagueId) || isEditorOrSuperadmin();
        }
      }
    }

    // --- News Collection ---
    match /news/{newsId} {
      allow read: if isAuthenticated();
      allow create: if isEditorOrSuperadmin();
      allow update: if isEditorOrSuperadmin() || isUser(resource.data.createdBy);
      allow delete: if isEditorOrSuperadmin() || isUser(resource.data.createdBy);
    }
  }
}
```

### 4.2 Rules Explanation

| Collection | Read | Create | Update | Delete |
|-----------|------|--------|--------|--------|
| users | Self only | Self | Self | Self |
| leagues | All authenticated | Authenticated (set creator) | League creator or superadmin | League creator or superadmin |
| seasons | All authenticated | League creator | League creator | League creator |
| rounds | All authenticated | League creator | League creator | League creator |
| matches | All authenticated | League creator | League creator **or** match player (if finishing) | League creator |
| players | All authenticated | League creator | League creator or self | League creator |
| rankings | All authenticated | League creator or superadmin | League creator or superadmin | League creator or superadmin |
| news | All authenticated | Editor or superadmin | Editor or author | Editor or author |

**Notes:**
- Players can only update a match if they are one of the participants and the match is transitioning to `finished`
- All writes to rankings should include domain-layer validation before hitting Firestore
- League creator has full control over their league

---

## 5. Firebase Authentication Setup

### 5.1 Authentication Methods

**Enabled Providers:**
1. **Email/Password** (primary for MVP)
   - User registration and login
   - Password reset via email

2. **Optional for future:**
   - Google Sign-In
   - Facebook Sign-In

### 5.2 Custom Claims (Firebase Auth)

Custom claims are set via Firebase Admin SDK (backend script or Cloud Function):

```json
{
  "role": "player" | "editor" | "superadmin",
  "leagueIds": ["league1", "league2"]
}
```

**How to set (example via Cloud Function or Node.js script):**

```javascript
admin.auth().setCustomUserClaims(uid, {
  role: 'editor',
  leagueIds: []
})
.then(() => console.log('Custom claims set'))
.catch(error => console.log(error));
```

### 5.3 User Onboarding Flow

1. User signs up with email/password via `firebase.auth().createUserWithEmailAndPassword()`
2. Firebase Auth creates user and generates UID
3. Trigger Cloud Function (or app-side) to:
   - Create user document in `users/{uid}` collection
   - Set custom claim `role: 'player'` (default)
4. User is now authenticated; can join leagues as player

---

## 6. Real-Time Listeners

### 6.1 Listener Patterns (React Examples)

**Listen to a single league:**

```javascript
const unsubscribe = db.collection('leagues')
  .doc(leagueId)
  .onSnapshot(doc => {
    console.log('League updated:', doc.data());
  });
```

**Listen to all rounds in a season:**

```javascript
const unsubscribe = db.collection('leagues')
  .doc(leagueId)
  .collection('seasons')
  .doc(seasonId)
  .collection('rounds')
  .onSnapshot(snapshot => {
    const rounds = snapshot.docs.map(doc => doc.data());
    console.log('Rounds:', rounds);
  });
```

**Listen to matches in a round (with filtering):**

```javascript
const unsubscribe = db.collection('leagues')
  .doc(leagueId)
  .collection('seasons')
  .doc(seasonId)
  .collection('rounds')
  .doc(roundId)
  .collection('matches')
  .where('status', '==', 'finished')
  .onSnapshot(snapshot => {
    console.log('Finished matches:', snapshot.docs.map(d => d.data()));
  });
```

### 6.2 Listener Best Practices

- **Unsubscribe on cleanup:** Always call the returned unsubscribe function when component unmounts
- **Combine listeners efficiently:** Use React Context or Redux to share listeners across components
- **Debounce heavy listeners:** For large collections, consider pagination with `limit()` and `startAfter()`
- **Firestore offline persistence:** Listeners automatically use offline cache when disconnected

---

## 7. Offline Considerations

### 7.1 Firestore Offline Persistence

Firestore SDK provides built-in offline support:

```javascript
// Enable offline persistence (call once on app startup)
firebase.firestore().enablePersistence()
  .catch(err => {
    if (err.code == 'failed-precondition') {
      console.log('Offline persistence requires single tab');
    } else if (err.code == 'unimplemented') {
      console.log('Browser does not support offline persistence');
    }
  });
```

**Behavior:**
- Reads: Served from local cache if offline
- Writes: Queued locally; synced to server automatically when online
- Listeners: Triggered from cache offline; sync from server when online

### 7.2 Conflict Resolution

**Default strategy (Firestore database-level):**
- Latest timestamp wins for document updates
- Firestore handles merge of concurrent writes

**Application-level handling:**
- Before writing match scores, client-side domain logic validates state
- Firestore security rules prevent unauthorized overwrites
- For disputes: editor can override via `editor_override` field (future enhancement)

---

## 8. Indexes (Optional Reference)

For MVP, Firestore auto-indexes single-field queries. Composite indexes needed only for complex queries:

**Recommended composite indexes:**

| Collection | Fields | Use Case |
|-----------|--------|----------|
| matches | `status`, `scheduledDate` | Filter finished matches by date |
| players | `seasonId`, `status` | List active players in season |
| news | `leagueId`, `createdAt` | Paginate news by league |

---

## 9. Backup & Recovery

**Firestore Backups:**
- Enable automated backups in Firebase Console
- For MVP: weekly backups to Cloud Storage
- Restoration: via Firebase Console or `gcloud` CLI

**Data Export:**
```bash
gcloud firestore export gs://backup-bucket/backup-name --async
```

---

## 10. Monitoring & Quotas

**Free tier limits (pay-as-you-go):**
- Reads: 50,000/day free
- Writes: 20,000/day free
- Deletes: 20,000/day free
- Storage: 1GB free

**Estimated usage for MVP:**
- ~10-50 reads per active user per session
- ~1-5 writes per session
- Should stay well within free tier

---

## 11. Open Questions / To Be Defined

- How to auto-generate rankings? (Cloud Function on match finish, or client-side?)
- Should match update permissions allow players to correct scores within a time window?
- How to handle editor-disputed results? (Add `status: 'disputed'` field?)
- Pagination strategy for large match/news lists?
- Multi-league management: can player join multiple leagues in same season?

---
