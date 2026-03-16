/**
 * Firestore Hook
 * 
 * Custom React hook for Firestore data fetching and real-time listeners
 */

import { useState, useEffect } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  orderBy,
  getDoc,
} from 'firebase/firestore';
import { db } from '../infrastructure/firebase.js';

/**
 * Hook for real-time document listener
 * 
 * @param {string} collectionPath - Path to collection
 * @param {string} docId - Document ID
 * @returns {object} { data, loading, error }
 */
export function useFirestoreDoc(collectionPath, docId) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!docId) return;

    const docRef = doc(db, collectionPath, docId);
    
    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setData({ id: snapshot.id, ...snapshot.data() });
        } else {
          setData(null);
        }
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [collectionPath, docId]);

  return { data, loading, error };
}

/**
 * Hook for real-time collection listener with optional filters
 * 
 * @param {string} collectionPath - Path to collection
 * @param {Array} constraints - array of where/orderBy constraints from firebase/firestore
 * @returns {object} { data, loading, error }
 */
export function useFirestoreCollection(collectionPath, constraints = []) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const collRef = collection(db, collectionPath);
    const q = query(collRef, ...constraints);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setData(docs);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [collectionPath, JSON.stringify(constraints)]);

  return { data, loading, error };
}

/**
 * Hook for one-time document fetch (non-real-time)
 * 
 * @param {string} collectionPath - Path to collection
 * @param {string} docId - Document ID
 * @returns {object} { data, loading, error }
 */
export function useFirestoreDocOnce(collectionPath, docId) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!docId) return;

    const docRef = doc(db, collectionPath, docId);
    
    const fetchDoc = async () => {
      try {
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
          setData({ id: snapshot.id, ...snapshot.data() });
        }
        setLoading(false);
      } catch (err) {
        setError(err);
        setLoading(false);
      }
    };

    fetchDoc();
  }, [collectionPath, docId]);

  return { data, loading, error };
}
