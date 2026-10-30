"use client";

import Link from "next/link";
import { use } from "react";
import { useLocale } from "@/i18n/locale";
import { useStore } from "@/lib/store";
import { formatDh } from "@/lib/shop";
import { OrderChats } from "@/components/OrderChats";
import { StatusSteps } from "@/components/StatusSteps";

export default function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { locale, t } = useLocale();
  const { ready, orders } = useStore();
  const order = orders.find((o) => o.id === id);

  if (!ready) return <main className="min-h-[60vh]" />;
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
      <p className="mx-auto mt-8 max-w-xl text-center font-semibold">{t.orderIntro}</p>
      <div className="mt-6">
        <OrderChats order={order} />
      </div>
      <div className="mt-10 text-center">
        <Link href={`/${locale}`} className="inline-block rounded-xl bg-sun-400 px-6 py-3 font-bold text-navy-950">{t.continueShopping}</Link>
      </div>
    </main>
  );
}
