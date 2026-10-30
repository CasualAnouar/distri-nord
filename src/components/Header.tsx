"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./Logo";
import { useLocale } from "@/i18n/locale";
import { useStore } from "@/lib/store";
import { formatDh } from "@/lib/shop";

export function Header() {
  const { locale, t } = useLocale();
  const { totals, settings } = useStore();
  const pathname = usePathname();
  const { subtotal, count } = totals();
  const other = locale === "fr" ? "ar" : "fr";
  const switchHref = pathname.replace(/^\/(fr|ar)/, `/${other}`);

  return (
    <header className="sticky top-0 z-30 bg-navy-900 text-white shadow-md">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        <Link href={`/${locale}`} aria-label={settings.storeName[locale]}>
          <Logo name={settings.storeName[locale]} />
        </Link>
        <span className="hidden text-sm text-white/70 md:inline">{settings.tagline[locale]}</span>
        <div className="ms-auto flex items-center gap-2">
          <Link href={switchHref} className="rounded-full px-3 py-2 text-sm font-medium text-white/85 hover:bg-white/10" lang={other}>
            {t.language}
          </Link>
          <Link
            href={`/${locale}/panier`}
            className="flex items-center gap-2 rounded-full bg-sun-400 px-4 py-2 text-sm font-bold text-navy-950 hover:bg-sun-500"
          >
            <span aria-hidden>🛒</span>
            <span>{count > 0 ? formatDh(subtotal, locale) : t.cart}</span>
            {count > 0 && <span className="grid size-5 place-items-center rounded-full bg-navy-900 text-[11px] text-white">{count}</span>}
          </Link>
        </div>
      </div>
    </header>
  );
}
