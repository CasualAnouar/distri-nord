import { NextResponse, type NextRequest } from "next/server";
import { syncOrderToWhatsApp } from "@/lib/wa/flows";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Called by the shop and the dashboard after an order is placed or changes status. The server
// reads the order itself and only sends what its current status calls for, once, so calling it
// again (or by anyone) never sends duplicates or arbitrary messages.
export async function POST(request: NextRequest) {
  const { orderId } = (await request.json().catch(() => ({}))) as { orderId?: unknown };
  if (typeof orderId !== "string" || !/^[A-Za-z0-9-]{3,40}$/.test(orderId)) return NextResponse.json({ error: "orderId" }, { status: 400 });
  try {
    return NextResponse.json(await syncOrderToWhatsApp(orderId));
  } catch (e) {
    console.error("WhatsApp sync error:", e);
    return NextResponse.json({ error: "sync failed" }, { status: 500 });
  }
}
