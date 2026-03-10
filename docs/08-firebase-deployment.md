# Firebase Deployment Guide

Version: 1.0  
Last updated: 2026-02-28

---

## Overview

This guide covers deploying Firebase services (Firestore, Auth, Security Rules) for the Tennis League PWA.

---

## Prerequisites

1. **Firebase CLI installed:**
   ```bash
   npm install -g firebase-tools
   ```

2. **Firebase project created:**
   - Go to [Firebase Console](https://console.firebase.google.com)
   - Create a new project (or use existing)
   - Enable Firestore Database (Native mode)
   - Enable Authentication (Email/Password provider)

3. **Firebase CLI authenticated:**
   ```bash
   firebase login
   ```

---

## Initial Setup

### 1. Initialize Firebase in Project

From project root:

```bash
firebase init
```

Select:
- ✅ Firestore (with rules and indexes)
- ✅ Hosting (optional, if deploying frontend to Firebase Hosting)
- ✅ Storage (optional, for future file uploads)

Configuration:
- Firestore rules file: `firestore.rules`
- Firestore indexes file: `firestore.indexes.json`
- Public directory: `dist` (Vite build output)

### 2. Configure Firebase Project

```bash
firebase use --add
```

Select your Firebase project and give it an alias (e.g., `default`).

---

## Deploying Firestore Security Rules

### 1. Create `firestore.rules` File

Create `firestore.rules` in project root with the security rules from `docs/07-firebase-schema.md`:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    function hasRole(role) {
      return isAuthenticated() && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == role;
    }
    
    function isOrganizer() {
      return hasRole('organizer') || hasRole('admin');
    }
    
    function isAdmin() {
      return hasRole('admin');
    }
    
    // Users collection
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated() && request.auth.uid == userId;
      allow update: if isOwner(userId);
      allow delete: if isAdmin();
    }
    
    // Leagues collection
    match /leagues/{leagueId} {
      allow read: if isAuthenticated();
      allow create: if isOrganizer();
      allow update: if isOrganizer() && 
                       (isOwner(resource.data.organizerId) || isAdmin());
      allow delete: if isAdmin();
      
      // Seasons subcollection
      match /seasons/{seasonId} {
        allow read: if isAuthenticated();
        allow write: if isOrganizer() && 
                        (isOwner(get(/databases/$(database)/documents/leagues/$(leagueId)).data.organizerId) 
                         || isAdmin());
        
        // Rounds subcollection
        match /rounds/{roundId} {
          allow read: if isAuthenticated();
          allow write: if isOrganizer();
          
          // Matches subcollection
          match /matches/{matchId} {
            allow read: if isAuthenticated();
            allow create: if isOrganizer();
            allow update: if isAuthenticated() && 
                            (resource.data.player1Id == request.auth.uid ||
                             resource.data.player2Id == request.auth.uid ||
                             isOrganizer());
            allow delete: if isOrganizer();
          }
        }
      }
    }
    
    // Rankings collection (denormalized)
    match /rankings/{rankingId} {
      allow read: if isAuthenticated();
      allow write: if false; // Only server-side updates (via Cloud Functions)
    }
    
    // News collection
    match /news/{newsId} {
      allow read: if isAuthenticated();
      allow create: if isOrganizer();
      allow update: if isOrganizer() && isOwner(resource.data.authorId);
      allow delete: if isOrganizer() && isOwner(resource.data.authorId);
    }
    
    // Notifications collection
    match /notifications/{notificationId} {
      allow read: if isAuthenticated() && isOwner(resource.data.userId);
      allow create: if isOrganizer() || isAdmin();
      allow update: if isOwner(resource.data.userId); // Update read status
      allow delete: if isOwner(resource.data.userId);
    }
  }
}
```

### 2. Deploy Rules

```bash
firebase deploy --only firestore:rules
```

Verify deployment:
```bash
firebase firestore:rules:list
```

---

## Setting Up User Roles

By default, new users have `role: 'player'`. To promote users to organizer or admin:

### Option 1: Manual Update (via Firebase Console)

1. Go to Firebase Console → Firestore Database
2. Navigate to `users/{userId}` document
3. Edit `role` field to `'organizer'` or `'admin'`

### Option 2: Admin Script (Recommended)

Create `scripts/set-user-role.js`:

```javascript
import { initializeApp } from 'firebase/app'
import { getFirestore, doc, updateDoc } from 'firebase/firestore'

// Firebase config (use Admin SDK in production)
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  // ... other config
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

async function setUserRole(userId, role) {
  const userRef = doc(db, 'users', userId)
  await updateDoc(userRef, { role })
  console.log(`✅ User ${userId} role set to: ${role}`)
}

// Usage: node scripts/set-user-role.js <userId> <role>
const [userId, role] = process.argv.slice(2)
if (!userId || !role) {
  console.error('Usage: node scripts/set-user-role.js <userId> <role>')
  process.exit(1)
}

setUserRole(userId, role).catch(console.error)
```

Run:
```bash
node scripts/set-user-role.js USER_ID_HERE organizer
```

### Option 3: Firebase Admin SDK (Production)

For production, use Firebase Admin SDK with service account credentials to set custom claims:

```javascript
const admin = require('firebase-admin')
admin.initializeApp()

await admin.auth().setCustomUserClaims(userId, { role: 'organizer' })
```

---

## Environment Variables

### 1. Get Firebase Config

From Firebase Console:
- Project Settings → General → Your apps → Web app
- Copy config values

### 2. Update `.env` File

```env
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

### 3. Restart Dev Server

```bash
npm run dev
```

---

## Testing Security Rules

### 1. Firebase Emulator (Local Testing)

```bash
firebase emulators:start --only firestore
```

Update `firebase.config.js` to connect to emulator:

```javascript
import { connectFirestoreEmulator } from 'firebase/firestore'

if (process.env.NODE_ENV === 'development') {
  connectFirestoreEmulator(db, 'localhost', 8080)
}
```

### 2. Rules Playground (Firebase Console)

- Firebase Console → Firestore Database → Rules → Rules Playground
- Test read/write operations with different auth states

---

## Monitoring & Maintenance

### View Deployed Rules

```bash
firebase firestore:rules:get
```

### Rollback Rules

If rules cause issues:

```bash
firebase firestore:rules:release --rule-set RULESET_ID
```

List previous rule sets:
```bash
firebase firestore:rules:list
```

### Audit Logs

Monitor security rule violations:
- Firebase Console → Firestore → Usage tab
- Look for denied operations

---

## Common Issues

### Issue: "Permission denied" errors

**Solution:** Check:
1. User is authenticated (`request.auth != null`)
2. User document exists in `/users/{uid}` with correct `role` field
3. Security rules match your use case

### Issue: Rules deploy fails

**Solution:** Validate syntax:
```bash
firebase deploy --only firestore:rules --dry-run
```

### Issue: User role not recognized

**Solution:** Ensure user document in Firestore has `role` field:
```javascript
// In Register.jsx after signup:
await createUser(user.uid, {
  email: user.email,
  displayName,
  role: 'player', // Default role
  createdAt: new Date().toISOString()
})
```

---

## Next Steps

1. ✅ Deploy security rules: `firebase deploy --only firestore:rules`
2. ✅ Update `.env` with Firebase credentials
3. ✅ Test authentication flow (signup, login, logout)
4. ✅ Promote first user to organizer role
5. ✅ Test league creation with organizer account
6. 📋 Set up Firebase Functions (for ranking calculations, notifications)
7. 📋 Configure Firebase Hosting (optional)
8. 📋 Set up CI/CD pipeline

---

## References

- [Firestore Security Rules Documentation](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase CLI Reference](https://firebase.google.com/docs/cli)
- [Firebase Admin SDK Setup](https://firebase.google.com/docs/admin/setup)
