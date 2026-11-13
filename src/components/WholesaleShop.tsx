"use client";

import Link from "next/link";
import { useLocale } from "@/i18n/locale";
import { useStore } from "@/lib/store";
import { Catalog } from "./Catalog";
import { CartBar } from "./CartBar";
import { Footer } from "./Footer";
import { Hero, HowItWorks } from "./Home";

export function WholesaleShop() {
  const { locale, t } = useLocale();
  const { ready, settings } = useStore();
  if (!ready) return <main className="min-h-[60vh]" />;
  if (!settings.wholesaleEnabled) {
    return (
      <main className="mx-auto max-w-xl px-4 py-20 text-center">
        <p className="text-5xl" aria-hidden>📦</p>
        <p className="mt-4 text-lg font-semibold">{t.wholesaleOff}</p>
        <Link href={`/${locale}`} className="mt-6 inline-block rounded-xl bg-sun-400 px-6 py-3 font-bold text-navy-950">{t.backToShop}</Link>
      </main>
    );
  }
  return (
    <main className="pb-24">
      <Hero channel="gros" />
      <Catalog channel="gros" />
      <HowItWorks channel="gros" />
      <Footer />
      <CartBar />
    </main>
  );
}
