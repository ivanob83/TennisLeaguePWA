/**
 * Authentication Context
 *
 * Provides auth state (Firebase Auth user) + Firestore profile (role, etc.)
 */

import React, { useEffect, useState, useCallback } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { where } from 'firebase/firestore'
import { auth } from '../../../infrastructure/firebase.js'
import { getUserById, createUser, isFirstUser } from '../services/userRepository.js'
import { playersRepository } from '../../../infrastructure/firestore.js'

export const AuthContext = React.createContext({
  user: null,
  profile: null,
  linkedPlayer: null,
  loading: true,
  isAuthenticated: false,
  isSuperadmin: false,
  isEditor: false,
  logout: () => {},
  refreshProfile: () => {},
})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [linkedPlayer, setLinkedPlayer] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (uid, firebaseUser = null) => {
    try {
      let data = await getUserById(uid)
      if (!data && firebaseUser) {
        const first = await isFirstUser()
        await createUser(uid, {
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0],
          photoURL: firebaseUser.photoURL || null,
          role: first ? 'superadmin' : 'player',
        })
        data = await getUserById(uid)
      }
      setProfile(data)

      const linked = await playersRepository.query([where('authUid', '==', uid)])
      console.log('[AuthContext] linkedPlayer query result:', linked)
      setLinkedPlayer(linked[0] || null)
    } catch (err) {
      console.error('Failed to load user profile:', err)
      setProfile(null)
      setLinkedPlayer(null)
    }
  }, [])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser)
      if (currentUser) {
        await loadProfile(currentUser.uid, currentUser)
      } else {
        setProfile(null)
      }
      setLoading(false)
    })

    return unsubscribe
  }, [loadProfile])

  const logout = async () => {
    try {
      await signOut(auth)
      setUser(null)
      setProfile(null)
    } catch (err) {
      console.error('Logout error:', err)
      throw err
    }
  }

  const refreshProfile = useCallback(async () => {
    if (user?.uid) await loadProfile(user.uid)
  }, [user?.uid, loadProfile])

  const role = profile?.role
  const isSuperadmin = role === 'superadmin'
  const isEditor = role === 'editor' || role === 'superadmin'

  const value = {
    user,
    profile,
    linkedPlayer,
    loading,
    isAuthenticated: !!user,
    isSuperadmin,
    isEditor,
    logout,
    refreshProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuthContext() {
  const context = React.useContext(AuthContext)
  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider')
  }
  return context
}
