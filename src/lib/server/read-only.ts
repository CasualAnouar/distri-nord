/**
 * Preview deployments (and STORE_READ_ONLY=1) share the live Firestore, so they may read it but
 * never write: data writes refuse, WhatsApp sends nothing, and checkout says orders are off.
 */
export const READ_ONLY = process.env.VERCEL_ENV === "preview" || process.env.STORE_READ_ONLY === "1";
