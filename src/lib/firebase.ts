import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { connectFirestoreEmulator, getFirestore, type Firestore } from "firebase/firestore";

// Firestore is only ever reached from the server (src/lib/server/data.ts). The browser gets its
// data from server-rendered pages and writes through server actions (src/lib/actions.ts).
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/** False on a machine without Firebase settings: the store then runs on the built-in defaults. */
export const firebaseConfigured = Boolean(firebaseConfig.projectId);

let cached: Firestore | null = null;

export function getDb(): Firestore {
  if (cached) return cached;
  const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  const db = getFirestore(app);
  // Local testing against `firebase emulators:start --only firestore`.
  const emulator = process.env.FIRESTORE_EMULATOR_HOST;
  if (emulator) {
    const [host, port] = emulator.split(":");
    connectFirestoreEmulator(db, host, Number(port));
  }
  cached = db;
  return db;
}
