'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { Auth, getAuth } from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore'
import {
    setDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    CollectionReference,
    DocumentReference,
    SetOptions,
    serverTimestamp
  } from 'firebase/firestore';
  import { errorEmitter } from '@/firebase/error-emitter';
  import {FirestorePermissionError} from '@/firebase/errors';
  import {
    signInAnonymously,
  } from 'firebase/auth';

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  if (!getApps().length) {
    // Important! initializeApp() is called without any arguments because Firebase App Hosting
    // integrates with the initializeApp() function to provide the environment variables needed to
    // populate the FirebaseOptions in production. It is critical that we attempt to call initializeApp()
    // without arguments.
    let firebaseApp;
    try {
      // Attempt to initialize via Firebase App Hosting environment variables
      firebaseApp = initializeApp();
    } catch (e) {
      // Only warn in production because it's normal to use the firebaseConfig to initialize
      // during development
      if (process.env.NODE_ENV === "production") {
        console.warn('Automatic initialization failed. Falling back to firebase config object.', e);
      }
      firebaseApp = initializeApp(firebaseConfig);
    }

    return getSdks(firebaseApp);
  }

  // If already initialized, return the SDKs with the already initialized App
  return getSdks(getApp());
}

export function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp)
  };
}

/**
 * Initiates a setDoc operation for a document reference.
 * Does NOT await the write operation internally.
 */
export function setDocumentNonBlocking(docRef: DocumentReference, data: any, options: SetOptions) {
    return setDoc(docRef, data, options).catch(error => {
      errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({
          path: docRef.path,
          operation: 'write', // or 'create'/'update' based on options
          requestResourceData: data,
        })
      )
    })
  }
  
  
  /**
   * Initiates an addDoc operation for a collection reference.
   * Does NOT await the write operation internally.
   * Returns the Promise for the new doc ref, but typically not awaited by caller.
   */
  export function addDocumentNonBlocking(colRef: CollectionReference, data: any) {
    const promise = addDoc(colRef, data)
      .catch(error => {
        errorEmitter.emit(
          'permission-error',
          new FirestorePermissionError({
            path: colRef.path,
            operation: 'create',
            requestResourceData: data,
          })
        )
      });
    return promise;
  }
  
  
  /**
   * Initiates an updateDoc operation for a document reference.
   * Does NOT await the write operation internally.
   */
  export function updateDocumentNonBlocking(docRef: DocumentReference, data: any) {
    return updateDoc(docRef, data)
      .catch(error => {
        errorEmitter.emit(
          'permission-error',
          new FirestorePermissionError({
            path: docRef.path,
            operation: 'update',
            requestResourceData: data,
          })
        )
      });
  }
  
  
  /**
   * Initiates a deleteDoc operation for a document reference.
   * Does NOT await the write operation internally.
   */
  export function deleteDocumentNonBlocking(docRef: DocumentReference) {
    deleteDoc(docRef)
      .catch(error => {
        errorEmitter.emit(
          'permission-error',
          new FirestorePermissionError({
            path: docRef.path,
            operation: 'delete',
          })
        )
      });
  }
  
  /** Initiate anonymous sign-in (non-blocking). */
  export function initiateAnonymousSignIn(authInstance: Auth): void {
    signInAnonymously(authInstance).catch(error => {
      console.error("Anonymous sign-in failed:", error);
    });
  }
  
export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './errors';
export * from './error-emitter';
export { serverTimestamp } from 'firebase/firestore';
