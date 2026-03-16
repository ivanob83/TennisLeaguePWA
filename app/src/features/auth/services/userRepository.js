/**
 * User Repository
 * 
 * Firestore operations for user documents
 */

import { collection, doc, getDoc, getDocs, setDoc, updateDoc, query, limit, orderBy, serverTimestamp } from 'firebase/firestore'
import { db } from '../../../infrastructure/firebase.js'

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

/**
 * Returns true if no users exist yet — used to assign superadmin to first registrant
 */
export async function isFirstUser() {
  const q = query(collection(db, COLLECTION), limit(1))
  const snapshot = await getDocs(q)
  return snapshot.empty
}

/**
 * Get all users (admin only)
 */
export async function getAllUsers() {
  const q = query(collection(db, COLLECTION), orderBy('createdAt', 'asc'))
  const snapshot = await getDocs(q)
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
}

/**
 * Update a user's role (superadmin only)
 */
export async function updateUserRole(uid, role) {
  const userRef = doc(db, COLLECTION, uid)
  await updateDoc(userRef, { role, updatedAt: serverTimestamp() })
}
