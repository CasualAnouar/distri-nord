import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

// Server-only Firestore access with a service account (bypasses security rules).
// Env: FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY from the service account JSON,
// project id from FIREBASE_PROJECT_ID or NEXT_PUBLIC_FIREBASE_PROJECT_ID.
// Never import this file from a client component.

export function adminConfigured() {
  return Boolean(process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY && projectId());
}

function projectId() {
  return process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
}

let cached: Firestore | null = null;

export function adminDb(): Firestore {
  if (cached) return cached;
  if (!adminConfigured()) throw new Error("Firebase service account missing (FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY)");
  const app: App =
    getApps()[0] ??
    initializeApp({
      credential: cert({
        projectId: projectId(),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // Vercel stores the key on one line with literal "\n".
        privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
      }),
    });
  cached = getFirestore(app);
  return cached;
}
