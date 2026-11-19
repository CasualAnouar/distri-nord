"use client";

import { useLocale } from "@/i18n/locale";

// Shown when a shop page fails to load (for example the database is unreachable and nothing is cached).
export default function ShopError({ retry }: { error: unknown; retry: () => void }) {
  const { locale, t } = useLocale();
  return (
    <main className="mx-auto max-w-md px-4 py-20 text-center">
      <h1 className="text-xl font-bold">{t.errorTitle}</h1>
      <p className="mt-2 text-muted">{t.errorText}</p>
      <div className="mt-6 flex justify-center gap-3">
        <button onClick={() => retry()} className="rounded-xl bg-navy-900 px-5 py-2.5 font-bold text-white">
          {t.retry}
        </button>
        <a href={`/${locale}`} className="rounded-xl border border-line px-5 py-2.5 font-bold">
          {t.backToShop}
        </a>
      </div>
    </main>
  );
}
