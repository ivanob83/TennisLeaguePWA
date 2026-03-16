/**
 * Firebase Configuration
 * 
 * Initialize Firebase and Firestore
 * Values loaded from environment variables
 */

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  connectFirestoreEmulator,
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentSingleTabManager,
} from 'firebase/firestore';
import { getMessaging, onMessage } from 'firebase/messaging';

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Initialize Auth
export const auth = getAuth(app);

// Initialize Firestore (recommended localCache API with graceful fallback)
const useEmulator = import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true';
let firestoreInstance;

try {
  if (!useEmulator && typeof window !== 'undefined' && 'indexedDB' in window) {
    firestoreInstance = initializeFirestore(app, {
      localCache: persistentLocalCache({
        // Keeps old single-tab behavior and avoids cross-tab ownership conflicts.
        tabManager: persistentSingleTabManager(),
      }),
    });
  } else {
    firestoreInstance = getFirestore(app);
  }
} catch (err) {
  console.warn('Offline persistence not available, falling back to in-memory Firestore:', err?.code || err?.message);
  firestoreInstance = getFirestore(app);
}

export const db = firestoreInstance;

// Initialize Cloud Messaging (optional - requires service worker)
let messaging = null;
try {
  // Check if service worker is available before initializing messaging
  if ('serviceWorker' in navigator) {
    messaging = getMessaging(app);
    
    // Handle messages in the foreground
    onMessage(messaging, payload => {
      console.log('Message received:', payload);
      // Handle notification display here
      if (Notification.permission === 'granted' && payload.notification) {
        new Notification(payload.notification.title, {
          body: payload.notification.body,
          icon: '/favicon.ico',
        });
      }
    });
  }
} catch (err) {
  console.warn('Cloud Messaging not available:', err.message);
}

export { messaging };

// Development: Connect to emulators if running locally
if (import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true') {
  console.log('Connecting to Firebase emulators...');
  connectFirestoreEmulator(db, 'localhost', 8080);
}

export default app;
