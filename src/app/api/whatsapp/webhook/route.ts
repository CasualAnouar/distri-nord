import { NextResponse, type NextRequest } from "next/server";
import { validSignature, verifyToken } from "@/lib/wa/cloud";
import { handleWebhook } from "@/lib/wa/flows";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Meta calls this once with a challenge when the webhook is set up in the app dashboard.
export function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  const expected = verifyToken();
  const given = (q.get("hub.verify_token") ?? "").trim();
  if (expected && q.get("hub.mode") === "subscribe" && given === expected) {
    return new NextResponse(q.get("hub.challenge") ?? "", { status: 200, headers: { "Content-Type": "text/plain" } });
  }
  // Visible in Vercel logs without revealing the token itself.
  console.warn(`WhatsApp webhook verification refused: ${expected ? `token mismatch (expected ${expected.length} chars, got ${given.length})` : "WHATSAPP_VERIFY_TOKEN is not set"}`);
  return new NextResponse(expected ? "Forbidden: verify token mismatch" : "Forbidden: WHATSAPP_VERIFY_TOKEN not set on the server", { status: 403 });
}

// Incoming messages and delivery statuses. Signed by Meta with the app secret.
export async function POST(request: NextRequest) {
  const raw = await request.text();
  if (!validSignature(raw, request.headers.get("x-hub-signature-256"))) return new NextResponse("Invalid signature", { status: 401 });
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return new NextResponse("Bad JSON", { status: 400 });
  }
  try {
    await handleWebhook(body as Parameters<typeof handleWebhook>[0], `${request.nextUrl.origin}/fr`);
  } catch (e) {
    // Answer 200 anyway: Meta would retry the same payload for days and we already logged it.
    console.error("WhatsApp webhook error:", e);
  }
  return NextResponse.json({ ok: true });
}
