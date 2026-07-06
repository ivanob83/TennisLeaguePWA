/**
 * Firebase Auth Hook
 *
 * Custom React hook for authentication state management
 */

import { useState, useEffect, useContext, createContext } from 'react'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
} from 'firebase/auth'
import { auth } from '../../../infrastructure/firebase.js'

/**
 * Auth Context
 */
export const AuthContext = createContext(null)

export function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        setUser(currentUser)
        setLoading(false)
      },
      (err) => {
        setError(err)
        setLoading(false)
      },
    )

    return unsubscribe
  }, [])

  const login = async (email, password) => {
    setError(null)
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      setUser(userCredential.user)
      return userCredential.user
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  const register = async (email, password) => {
    setError(null)
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      setUser(userCredential.user)
      return userCredential.user
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  const logout = async () => {
    setError(null)
    try {
      await signOut(auth)
      setUser(null)
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  const loginWithGoogle = async () => {
    setError(null)
    try {
      const provider = new GoogleAuthProvider()
      const userCredential = await signInWithPopup(auth, provider)
      const user = userCredential.user

      // Check if user document exists in Firestore, create if not
      // User document creation is handled by AuthContext.loadProfile

      setUser(user)
      return user
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  return {
    user,
    loading,
    error,
    login,
    register,
    logout,
    loginWithGoogle,
    isAuthenticated: !!user,
  }
}
