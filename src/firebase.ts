import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Import the Firebase configuration
import firebaseConfig from '../firebase-applet-config.json';

  // Initialize Firebase SDK
  console.log('Initializing Firebase with config:', { 
    projectId: firebaseConfig.projectId, 
    databaseId: firebaseConfig.firestoreDatabaseId 
  });
  const app = initializeApp(firebaseConfig);
  
  // Helper to get Firestore with fallback
  const getFirestoreWithFallback = () => {
    try {
      if (firebaseConfig.firestoreDatabaseId) {
        console.log(`Using custom Firestore database: ${firebaseConfig.firestoreDatabaseId}`);
        return getFirestore(app, firebaseConfig.firestoreDatabaseId);
      }
    } catch (e) {
      console.warn('Failed to initialize Firestore with custom ID, falling back to (default)', e);
    }
    console.log('Using default Firestore database');
    return getFirestore(app);
  };

  export const db = getFirestoreWithFallback();
  export const auth = getAuth(app);

export default app;
