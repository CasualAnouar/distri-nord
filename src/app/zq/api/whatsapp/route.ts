import { NextResponse, type NextRequest } from "next/server";
import { adminConfigured } from "@/lib/firebase-admin";
import { adminAuthorized } from "@/lib/admin-auth";
import { cloudConfigured, createMissingTemplates, envStatus, listTemplates, phoneInfo, registerPhone, sendHelloWorld, sendText } from "@/lib/wa/cloud";
import { waId } from "@/lib/shop";

// Dashboard-only WhatsApp tools. Reached at /<ADMIN_PATH>/api/whatsapp behind the dashboard
// login (src/proxy.ts); a direct /zq/... request is a 404.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

// The proxy already asks for the login; route handlers check it again, and POST only accepts JSON
// from the dashboard's own address, so another site cannot make the seller's browser call it.
function allowed(request: NextRequest, post = false) {
  if (!adminAuthorized(request.headers.get("authorization"))) return false;
  if (!post) return true;
  const origin = request.headers.get("origin");
  return request.headers.get("content-type")?.startsWith("application/json") === true && (!origin || new URL(origin).host === request.headers.get("host"));
}

export async function GET(request: NextRequest) {
  if (!allowed(request)) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const env = { ...envStatus(), firebase: adminConfigured() };
  if (!cloudConfigured()) return NextResponse.json({ env });
  const [phone, templates] = await Promise.all([
    phoneInfo().catch((e) => ({ error: errMsg(e) })),
    env.wabaId ? listTemplates().catch((e) => ({ error: errMsg(e) })) : Promise.resolve({ error: "WHATSAPP_WABA_ID manquant" }),
  ]);
  return NextResponse.json({ env, phone, templates });
}

export async function POST(request: NextRequest) {
  if (!allowed(request, true)) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  if (!cloudConfigured()) return NextResponse.json({ error: "WhatsApp non configuré" }, { status: 400 });
  const body = (await request.json().catch(() => ({}))) as { action?: string; phone?: string; pin?: string };
  try {
    if (body.action === "register") {
      if (!/^\d{6}$/.test(body.pin ?? "")) return NextResponse.json({ error: "Le code doit faire 6 chiffres" }, { status: 400 });
      await registerPhone(body.pin!);
      return NextResponse.json({ ok: true });
    }
    if (body.action === "templates") return NextResponse.json({ results: await createMissingTemplates() });
    if (body.action === "test") {
      const to = waId(body.phone ?? "");
      if (!to) return NextResponse.json({ error: "Numéro marocain invalide" }, { status: 400 });
      // Plain text only reaches a number that wrote to the shop in the last 24 h (and fails
      // silently otherwise), so test with Meta's pre-approved "hello_world" template first.
      const id = await sendHelloWorld(to).catch(() => sendText(to, "✅ Test WhatsApp : la boutique peut vous écrire."));
      return NextResponse.json({ ok: true, id });
    }
  } catch (e) {
    return NextResponse.json({ error: errMsg(e) }, { status: 400 });
  }
  return NextResponse.json({ error: "action" }, { status: 400 });
}
