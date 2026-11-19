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

/**
 * The service account key as pasted in Vercel can arrive in many shapes: on one line with literal
 * "\n", wrapped in quotes, with spaces instead of line breaks, or as the whole JSON file. Whatever
 * the shape, keep only the key's base64 body and rebuild a clean PEM from it.
 */
export function normalizePrivateKey(raw: string): string {
  let key = raw.trim();
  if (key.startsWith("{")) {
    try {
      key = String(JSON.parse(key).private_key ?? key);
    } catch {
      // not JSON after all: keep going with the raw text
    }
  }
  key = key.replace(/^['"]+|['"]+$/g, "").replace(/\\+n/g, "\n").replace(/\\+r/g, "");
  const m = key.match(/-----BEGIN ([A-Z ]+)-----([\s\S]*?)-----END \1-----/);
  if (!m) return key;
  const body = m[2].replace(/[^A-Za-z0-9+/=]/g, "");
  return `-----BEGIN ${m[1]}-----\n${body.match(/.{1,64}/g)?.join("\n") ?? ""}\n-----END ${m[1]}-----\n`;
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
              privateKey: normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY!),
            }),
          },
    );
  const db = getFirestore(app);
  db.settings({ ignoreUndefinedProperties: true });
  cached = db;
  return db;
}
