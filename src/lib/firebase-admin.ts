import "server-only";

import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

// Server-only Firestore access with a service account. It is the only way into the database:
// firestore.rules refuse every browser and REST request, so customer data cannot be read with
// the public project id.
// Env: FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY from the service account JSON,
// project id from FIREBASE_PROJECT_ID or NEXT_PUBLIC_FIREBASE_PROJECT_ID.
// Local testing: with FIRESTORE_EMULATOR_HOST set, no service account is needed and the
// emulator is used instead of the live database.

function projectId() {
  return process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
}

const emulator = () => Boolean(process.env.FIRESTORE_EMULATOR_HOST);

/** True when the service account is set (or the emulator is used). */
export function adminConfigured() {
  return Boolean(projectId() && ((process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) || emulator()));
}

/** True when a database is meant to be used at all. Without it the store runs on built-in defaults. */
export function databaseExpected() {
  return Boolean(projectId());
}

let cached: Firestore | null = null;

export function adminDb(): Firestore {
  if (cached) return cached;
  if (!adminConfigured()) throw new Error("Firebase service account missing (FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY)");
  const app: App =
    getApps()[0] ??
    initializeApp(
      emulator()
        ? { projectId: projectId() }
        : {
            credential: cert({
              projectId: projectId(),
              clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
              // Vercel stores the key on one line with literal "\n".
              privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
            }),
          },
    );
  const db = getFirestore(app);
  db.settings({ ignoreUndefinedProperties: true });
  cached = db;
  return db;
}
