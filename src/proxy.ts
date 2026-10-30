import { NextResponse, type NextRequest } from "next/server";

// The seller dashboard has no public address. It is served only under the secret prefix in
// ADMIN_PATH (server-side env, never sent to the browser) and, when ADMIN_PASSWORD is set,
// behind HTTP Basic auth. Its internal route (src/app/zq, a deliberately meaningless name since
// Next lists route names in page payloads) answers 404 to direct visits.
const INTERNAL = "zq";
const ADMIN_PATH = (process.env.ADMIN_PATH || "").replace(/^\/+|\/+$/g, "");
const ADMIN_USER = process.env.ADMIN_USER || "vendeur";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";

function notFound(request: NextRequest) {
  return NextResponse.rewrite(new URL("/__not-found", request.url), { status: 404 });
}

function authorized(request: NextRequest) {
  if (!ADMIN_PASSWORD) return true;
  const header = request.headers.get("authorization") ?? "";
  if (!header.startsWith("Basic ")) return false;
  const [user, ...rest] = atob(header.slice(6)).split(":");
  return user === ADMIN_USER && rest.join(":") === ADMIN_PASSWORD;
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const [first, ...rest] = pathname.split("/").filter(Boolean);

  if (first === INTERNAL) return notFound(request);

  if (ADMIN_PATH && first === ADMIN_PATH) {
    if (!authorized(request)) {
      return new NextResponse("Authentification requise", { status: 401, headers: { "WWW-Authenticate": 'Basic realm="Espace", charset="UTF-8"' } });
    }
    const response = NextResponse.rewrite(new URL(`/${INTERNAL}${rest.length ? `/${rest.join("/")}` : ""}${search}`, request.url));
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};
