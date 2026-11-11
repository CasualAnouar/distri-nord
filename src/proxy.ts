import { NextResponse, type NextRequest } from "next/server";
import { adminAuthorized } from "@/lib/admin-auth";

// The seller dashboard has no public address. It is served only under the secret prefix in
// ADMIN_PATH (server-side env, never sent to the browser) and, when ADMIN_PASSWORD is set,
// behind HTTP Basic auth. Its internal route (src/app/zq, a deliberately meaningless name since
// Next lists route names in page payloads) answers 404 to direct visits.
const INTERNAL = "zq";
const ADMIN_PATH = (process.env.ADMIN_PATH || "").replace(/^\/+|\/+$/g, "");

function notFound(request: NextRequest) {
  return NextResponse.rewrite(new URL("/__not-found", request.url), { status: 404 });
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const [first, ...rest] = pathname.split("/").filter(Boolean);

  if (first === INTERNAL) return notFound(request);

  if (ADMIN_PATH && first === ADMIN_PATH) {
    if (!adminAuthorized(request.headers.get("authorization"))) {
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
