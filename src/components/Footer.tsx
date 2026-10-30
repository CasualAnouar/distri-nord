"use client";

import { useLocale } from "@/i18n/locale";
import { useStore } from "@/lib/store";

export function Footer() {
  const { locale } = useLocale();
  const { settings } = useStore();
  return (
    <footer className="mt-8 border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-muted">
        <span>
          {settings.storeName[locale]} · {settings.tagline[locale]}
        </span>
      </div>
    </footer>
  );
}
