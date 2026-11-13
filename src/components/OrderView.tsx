"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLocale } from "@/i18n/locale";
import { useStore } from "@/lib/store";
import { fetchOrder } from "@/lib/actions";
import { formatDh, type Order } from "@/lib/shop";
import { OrderChats } from "./OrderChats";
import { StatusSteps } from "./StatusSteps";

// The buyer's order page. The order comes from the server; it is re-read every few seconds so the
// status follows what the seller does.
export function OrderView({ initial }: { initial: Order | null }) {
  const { locale, t } = useLocale();
  const { settings } = useStore();
  const wa = settings.whatsapp;
  const waLink = wa.businessPhone.replace(/\D/g, "").replace(/^0/, "212");
  const [order, setOrder] = useState(initial);
  const id = initial?.id;
  const done = order?.status === "delivered" || order?.status === "cancelled";

  useEffect(() => {
    if (!id || done) return;
    const tick = () => {
      if (document.visibilityState === "visible") fetchOrder(id).then((o) => o && setOrder(o)).catch(() => {});
    };
    const timer = window.setInterval(tick, 10000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [id, done]);

  if (!order)
    return (
      <main className="mx-auto max-w-xl px-4 py-20 text-center">
        <p className="text-lg font-semibold">{t.orderNotFound}</p>
        <Link href={`/${locale}`} className="mt-6 inline-block rounded-xl bg-sun-400 px-6 py-3 font-bold text-navy-950">{t.continueShopping}</Link>
      </main>
    );

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <section className="rounded-2xl border border-line bg-white p-5 text-center">
        <p className="text-4xl" aria-hidden>🎉</p>
        <h1 className="mt-2 text-2xl font-extrabold">{t.orderPlaced}</h1>
        <p className="mt-1 text-muted">
          {t.orderNumber} <strong className="text-ink" dir="ltr">{order.id}</strong> · {formatDh(order.total, locale)}
        </p>
        <div className="mx-auto mt-5 max-w-lg">
          <StatusSteps status={order.status} />
        </div>
      </section>
      {!wa.enabled && <p className="mx-auto mt-8 max-w-xl text-center font-semibold">{t.orderIntroLinks(settings.sellerPhone)}</p>}
      {wa.enabled && <p className="mx-auto mt-8 max-w-xl text-center font-semibold">{t.orderIntroLive(wa.businessPhone)}</p>}
      {wa.enabled && waLink && (
        <div className="mt-4 text-center">
          <a href={`https://wa.me/${waLink}`} target="_blank" rel="noreferrer" className="inline-block rounded-xl bg-wa px-6 py-3 font-bold text-white">
            💬 {t.openWhatsApp}
          </a>
        </div>
      )}
      {wa.enabled && (
        <div className="mt-6">
          <OrderChats order={order} onChange={setOrder} sellerActions={false} />
        </div>
      )}
      <div className="mt-10 text-center">
        <Link href={`/${locale}`} className="inline-block rounded-xl bg-sun-400 px-6 py-3 font-bold text-navy-950">{t.continueShopping}</Link>
      </div>
    </main>
  );
}
