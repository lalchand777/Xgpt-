import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

let firebaseApp: FirebaseApp | null = null;
let auth: Auth | null = null;
let firestore: Firestore | null = null;
let googleProvider: GoogleAuthProvider | null = null;
let firebaseEffectivelyDisabled = false;

const initializeFirebase = () => {
  if (firebaseApp) return; // Already initialized or attempted

  try {
    const firebaseConfigStr = process.env.FIREBASE_CONFIG_JSON;
    if (!firebaseConfigStr) {
      console.warn("Firebase config not found in environment variables (FIREBASE_CONFIG_JSON). Firebase features will be disabled.");
      firebaseEffectivelyDisabled = true;
      return;
    }
    const firebaseConfig = JSON.parse(firebaseConfigStr);
    if (Object.keys(firebaseConfig).length === 0) { // Check for empty config object
        console.warn("Firebase config is empty. Firebase features will be disabled.");
        firebaseEffectivelyDisabled = true;
        return;
    }
    firebaseApp = initializeApp(firebaseConfig);
    auth = getAuth(firebaseApp);
    firestore = getFirestore(firebaseApp);
    googleProvider = new GoogleAuthProvider();
    firebaseEffectivelyDisabled = false;
  } catch (error) {
    console.error("Error initializing Firebase (config might be malformed or service unavailable):", error);
    firebaseEffectivelyDisabled = true;
    // Ensure these are null if initialization fails
    firebaseApp = null; 
    auth = null;
    firestore = null;
    googleProvider = null;
  }
};

initializeFirebase(); // Initialize on load

export const getFirebaseAuth = (): Auth | null => auth;
export const getFirestoreDb = (): Firestore | null => firestore;
export const getGoogleAuthProvider = (): GoogleAuthProvider | null => googleProvider;

// This function now determines if Firebase should be considered "active"
export const isFirebaseInitialized = (): boolean => !firebaseEffectivelyDisabled && !!firebaseApp && !!auth && !!firestore;