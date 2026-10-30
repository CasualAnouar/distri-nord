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
        <a href="https://world.openfoodfacts.org" target="_blank" rel="noreferrer" className="text-xs hover:underline">
          {locale === "ar" ? "صور المنتجات: Open Food Facts (CC BY-SA)" : "Photos produits : Open Food Facts (CC BY-SA)"}
        </a>
      </div>
    </footer>
  );
}
