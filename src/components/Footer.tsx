"use client";

import Link from "next/link";
import { useLocale } from "@/i18n/locale";
import { useStore } from "@/lib/store";

export function Footer() {
  const { locale, t } = useLocale();
  const { settings } = useStore();
  return (
    <footer className="mt-8 border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-muted">
        <span>
          {settings.storeName[locale]} · {settings.tagline[locale]}
        </span>
        <Link href="/admin" className="font-semibold text-navy-800 underline-offset-4 hover:underline">{t.seller} →</Link>
      </div>
    </footer>
  );
}
