"use client";

import Link from "next/link";
import { useLocale } from "@/i18n/locale";
import { useStore } from "@/lib/store";
import { formatDh, type Channel } from "@/lib/shop";

export function Hero({ channel = "detail" }: { channel?: Channel }) {
  const { locale, t } = useLocale();
  const { settings, cities } = useStore();
  const zones = cities.slice(0, 3).map((c) => c[locale]).join(locale === "ar" ? "، " : ", ");
  const gros = channel === "gros";
  const min = formatDh(gros ? Math.max(settings.minCart, settings.wholesaleMinCart) : settings.minCart, locale);
  const perks = gros ? t.perksGros(min, zones) : t.perks(min, zones);
  return (
    <section className={gros ? "bg-navy-950 text-white" : "bg-navy-900 text-white"}>
      <div className="mx-auto grid max-w-6xl gap-6 px-4 pb-10 pt-8 md:grid-cols-[1.4fr_1fr] md:items-center md:py-14">
        <div>
          {gros && <span className="mb-3 inline-block rounded-full bg-sun-400 px-3 py-1 text-xs font-bold text-navy-950">{t.wholesale}</span>}
          <h1 className="text-3xl font-extrabold leading-tight tracking-tight md:text-5xl">{gros ? settings.wholesaleTitle[locale] : settings.heroTitle[locale]}</h1>
          <p className="mt-4 max-w-xl text-base text-white/80 md:text-lg">{gros ? settings.wholesaleText[locale] : settings.heroText[locale]}</p>
          <a href="#catalogue" className="mt-6 inline-block rounded-xl bg-sun-400 px-6 py-3 font-bold text-navy-950 hover:bg-sun-500">
            {t.heroCta}
          </a>
        </div>
        <ul className="grid grid-cols-2 gap-3">
          {perks.map((p, i) => (
            <li key={i} className="rounded-2xl bg-white/10 p-4 text-sm font-semibold">
              <span className="mb-2 block text-2xl" aria-hidden>{(gros ? ["📦", "🧾", "💵", "🚚"] : ["💵", "🧾", "💬", "🚚"])[i]}</span>
              {p}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// Retail home: a discreet way into the wholesale shop for big buyers.
export function WholesaleBanner() {
  const { locale, t } = useLocale();
  const { settings } = useStore();
  if (!settings.wholesaleEnabled) return null;
  return (
    <section className="mx-auto max-w-6xl px-4 pt-2">
      <Link
        href={`/${locale}/gros`}
        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-navy-900/15 bg-navy-100 px-4 py-3 text-sm font-semibold text-navy-900 hover:border-navy-900/40"
      >
        <span>📦 {t.wholesaleBanner(formatDh(Math.max(settings.minCart, settings.wholesaleMinCart), locale))}</span>
        <span className="rounded-full bg-navy-900 px-3 py-1 text-xs font-bold text-white">{t.wholesale} <span className="rtl:hidden">→</span><span className="ltr:hidden">←</span></span>
      </Link>
    </section>
  );
}

export function HowItWorks({ channel = "detail" }: { channel?: Channel }) {
  const { locale, t } = useLocale();
  const { settings } = useStore();
  const min = channel === "gros" ? Math.max(settings.minCart, settings.wholesaleMinCart) : settings.minCart;
  return (
    <section className="mx-auto max-w-6xl px-4 py-8">
      <h2 className="text-2xl font-extrabold">{t.howTitle}</h2>
      <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {t.how.map(([icon, title, text], i) => (
          <li key={title} className="rounded-2xl border border-line bg-white p-5">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-navy-100 text-xl" aria-hidden>{icon}</span>
              <span className="text-xs font-bold text-muted">0{i + 1}</span>
            </div>
            <h3 className="mt-3 font-bold">{title}</h3>
            <p className="mt-1 text-sm text-muted">{text.replace("{min}", formatDh(min, locale))}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
