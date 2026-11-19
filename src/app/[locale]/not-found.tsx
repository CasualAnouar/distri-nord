"use client";

import Link from "next/link";
import { useLocale } from "@/i18n/locale";

export default function ShopNotFound() {
  const { locale, t } = useLocale();
  return (
    <main className="mx-auto max-w-md px-4 py-20 text-center">
      <p className="text-5xl font-extrabold text-navy-900">404</p>
      <h1 className="mt-4 text-xl font-bold">{t.notFoundTitle}</h1>
      <p className="mt-2 text-muted">{t.notFoundText}</p>
      <Link href={`/${locale}`} className="mt-6 inline-block rounded-xl bg-navy-900 px-5 py-2.5 font-bold text-white">
        {t.backToShop}
      </Link>
    </main>
  );
}
