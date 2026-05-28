import { initializeApp, FirebaseApp } from "firebase/app";
import { getDatabase, Database } from "firebase/database";
import { getAuth, Auth, GoogleAuthProvider } from "firebase/auth";

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

if (hasFirebaseConfig) {
  try {
    app = initializeApp(firebaseConfig);
    _db = getDatabase(app);
    _auth = getAuth(app);
  } catch {
    app = null;
    _db = null;
    _auth = null;
  }
}

export const googleProvider = new GoogleAuthProvider();
export { _db as db, _auth as auth };
export default app;
