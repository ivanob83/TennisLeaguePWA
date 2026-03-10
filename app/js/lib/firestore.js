/**
 * Firestore Repository Layer
 * 
 * Abstraction for Firestore CRUD operations
 * Used by application services to interact with Firestore
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Query,
  DocumentReference,
  CollectionReference,
} from 'firebase/firestore';

import { db } from '../config/firebase.config';

/**
 * Generic repository for Firestore collections
 */
export class FirestoreRepository {
  constructor(collectionPath) {
    this.collectionPath = collectionPath;
    this.collectionRef = collection(db, collectionPath);
  }

  /**
   * Get a single document by ID
   */
  async getById(id) {
    const docRef = doc(db, this.collectionPath, id);
    const snapshot = await getDoc(docRef);
    return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
  }

  /**
   * Get all documents in collection
   */
  async getAll() {
    const snapshot = await getDocs(this.collectionRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  /**
   * Create a new document
   */
  async create(data) {
    const docRef = await addDoc(this.collectionRef, {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return { id: docRef.id, ...data, createdAt: new Date(), updatedAt: new Date() };
  }

  /**
   * Update a document
   */
  async update(id, data) {
    const docRef = doc(db, this.collectionPath, id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: new Date(),
    });
    return { id, ...data, updatedAt: new Date() };
  }

  /**
   * Delete a document
   */
  async delete(id) {
    const docRef = doc(db, this.collectionPath, id);
    await deleteDoc(docRef);
    return id;
  }

  /**
   * Query with filters (returns unsubscribe function for real-time listener)
   * Usage: const unsubscribe = await repository.query([where('status', '==', 'active')], callback);
   */
  async query(constraints = [], callback = null) {
    const q = query(this.collectionRef, ...constraints);
    
    if (callback) {
      // Return real-time listener
      const unsubscribe = onSnapshot(q, snapshot => {
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(docs);
      });
      return unsubscribe;
    } else {
      // Return one-time query
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
  }
}

/**
 * Specialized repositories for domain entities
 */

export const playersRepository = new FirestoreRepository('players');
export const leaguesRepository = new FirestoreRepository('leagues');
export const seasonRepository = (leagueId) => ({
  path: `leagues/${leagueId}/seasons`,
  // Methods specific to seasons subcollection
  async getAll() {
    const ref = collection(db, `leagues/${leagueId}/seasons`);
    const snapshot = await getDocs(ref);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },
});

export const roundsRepository = (leagueId, seasonId) => ({
  path: `leagues/${leagueId}/seasons/${seasonId}/rounds`,
  async getAll() {
    const ref = collection(db, `leagues/${leagueId}/seasons/${seasonId}/rounds`);
    const snapshot = await getDocs(ref);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },
});

export const matchesRepository = (leagueId, seasonId, roundId) => ({
  path: `leagues/${leagueId}/seasons/${seasonId}/rounds/${roundId}/matches`,
  async getAll() {
    const ref = collection(db, `leagues/${leagueId}/seasons/${seasonId}/rounds/${roundId}/matches`);
    const snapshot = await getDocs(ref);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },
});

export const rankingsRepository = (leagueId, seasonId) => ({
  path: `leagues/${leagueId}/seasons/${seasonId}/rankings`,
});

export const newsRepository = new FirestoreRepository('news');
