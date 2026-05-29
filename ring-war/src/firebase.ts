import { initializeApp, FirebaseApp } from "firebase/app";
import { getDatabase, Database } from "firebase/database";
import {
  getAuth,
  Auth,
  GoogleAuthProvider,
  setPersistence,
  browserLocalPersistence,
  indexedDBLocalPersistence,
  browserSessionPersistence,
  inMemoryPersistence,
} from "firebase/auth";
import { isOfflineModePreferred } from "./lib/offlineMode";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const hasFirebaseConfig =
  !!(firebaseConfig.projectId && firebaseConfig.databaseURL && firebaseConfig.apiKey);

let app: FirebaseApp | null = null;
let _db: Database | null = null;
let _auth: Auth | null = null;

// Resolves once persistence has been configured (or immediately if no auth).
// Sign-in calls should await this to ensure the session is saved to
// localStorage/IndexedDB and survives reloads.
export let authReady: Promise<void> = Promise.resolve();

// HARD OFFLINE GUARD: if the user explicitly chose Offline Mode, do NOT
// initialize Firebase at all. Bot/hot-seat games run 100% locally.
const offlinePreferred = isOfflineModePreferred();
if (offlinePreferred) {
  console.log("[OFFLINE MODE] Firebase init skipped (user preference)");
}

if (hasFirebaseConfig && !offlinePreferred) {
  try {
    app = initializeApp(firebaseConfig);
    _db = getDatabase(app);
    _auth = getAuth(app);

    // Persist auth state across page reloads, tab restarts and mobile browsers.
    // Try IndexedDB first (works in more environments incl. some mobile browsers),
    // then fall back to localStorage, then session, then in-memory.
    authReady = setPersistence(_auth, indexedDBLocalPersistence)
      .catch(() => setPersistence(_auth!, browserLocalPersistence))
      .catch(() => setPersistence(_auth!, browserSessionPersistence))
      .catch(() => setPersistence(_auth!, inMemoryPersistence))
      .then(() => {
        console.log("[firebase] auth persistence enabled");
      })
      .catch((error) => {
        console.error("[firebase] persistence error:", error);
      });
  } catch {
    app = null;
    _db = null;
    _auth = null;
  }
}

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export { _db as db, _auth as auth };
export default app;
