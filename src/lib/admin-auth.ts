// Checks the dashboard's HTTP Basic credentials. Shared by src/proxy.ts (page requests) and the
// dashboard's server actions, which can be called from any URL and so must check for themselves.
const ADMIN_USER = process.env.ADMIN_USER || "vendeur";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";

export function adminAuthorized(authorization: string | null | undefined): boolean {
  // Without a password the dashboard is open, which is only acceptable on a developer's machine.
  if (!ADMIN_PASSWORD) return process.env.NODE_ENV !== "production";
  const header = authorization ?? "";
  if (!header.startsWith("Basic ")) return false;
  let decoded = "";
  try {
    decoded = atob(header.slice(6));
  } catch {
    return false;
  }
  const [user, ...rest] = decoded.split(":");
  return user === ADMIN_USER && rest.join(":") === ADMIN_PASSWORD;
}
