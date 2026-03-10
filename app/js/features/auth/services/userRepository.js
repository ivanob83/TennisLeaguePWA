/**
 * User Repository
 * 
 * Firestore operations for user documents
 */

import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../../config/firebase.config.js'

const COLLECTION = 'users'

/**
 * Create a new user document in Firestore
 * Called after Firebase Auth registration
 */
export async function createUser(uid, userData) {
  const userRef = doc(db, COLLECTION, uid)
  
  await setDoc(userRef, {
    uid,
    email: userData.email,
    displayName: userData.displayName,
    role: userData.role || 'player',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...userData
  })

  return { uid, ...userData }
}

/**
 * Get user by ID
 */
export async function getUserById(uid) {
  const userRef = doc(db, COLLECTION, uid)
  const snapshot = await getDoc(userRef)

  if (!snapshot.exists()) {
    return null
  }

  return { id: snapshot.id, ...snapshot.data() }
}

/**
 * Update user profile
 */
export async function updateUser(uid, updates) {
  const userRef = doc(db, COLLECTION, uid)
  
  await updateDoc(userRef, {
    ...updates,
    updatedAt: serverTimestamp()
  })

  return { uid, ...updates }
}

/**
 * Check if user document exists
 */
export async function userExists(uid) {
  const userRef = doc(db, COLLECTION, uid)
  const snapshot = await getDoc(userRef)
  return snapshot.exists()
}
