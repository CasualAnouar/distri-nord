import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/dict";
import { getOrder } from "@/lib/server/data";
import { OrderView } from "@/components/OrderView";

// An order page is private to whoever has its link: never cached, never indexed.
export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function OrderPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();
  const order = await getOrder(id);
  return <OrderView initial={order} />;
}
