"use client";

import Link from "next/link";
import { useLocale } from "@/i18n/locale";
import { useStore } from "@/lib/store";
import { cartTotals, formatDh, MIN_CART } from "@/lib/shop";

// Sticky reminder of the 100 DH minimum while browsing.
export function CartBar() {
  const { locale, t } = useLocale();
  const { cart, getProduct } = useStore();
  const { subtotal, count, missing } = cartTotals(cart, getProduct);
  if (count === 0) return null;
  const pct = Math.min(100, (subtotal / MIN_CART) * 100);
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className={`text-xs font-semibold ${missing > 0 ? "text-warn" : "text-ok"}`}>
            {missing > 0 ? t.minLeft(formatDh(missing, locale)) : t.minOk}
          </p>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line">
            <div className={`h-full rounded-full transition-all ${missing > 0 ? "bg-sun-500" : "bg-ok"}`} style={{ width: `${pct}%` }} />
          </div>
        </div>
        <Link href={`/${locale}/panier`} className="shrink-0 rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-bold text-white">
          {t.cart} · {formatDh(subtotal, locale)}
        </Link>
      </div>
    </div>
  );
}
