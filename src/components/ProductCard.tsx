"use client";

import Link from "next/link";
import { useState } from "react";
import type { Product } from "@/data/products";
import { useLocale } from "@/i18n/locale";
import { useStore } from "@/lib/store";
import { formatDh, lotSaving, type Channel } from "@/lib/shop";
import { ProductTile } from "./ProductTile";

// Retail shop sells by the piece; the wholesale shop (/gros) sells by the lot.
export function ProductCard({ product, channel = "detail" }: { product: Product; channel?: Channel }) {
  const { locale, t } = useLocale();
  const { addToCart, settings, cart } = useStore();
  const mode = channel === "gros" ? "lot" : "unit";
  const [qty, setQty] = useState(1);
  const [flash, setFlash] = useState(false);

  const inCart = cart.filter((l) => l.productId === product.id && l.mode !== "box").reduce((a, l) => a + (l.mode === "lot" ? product.lot.qty : 1) * l.qty, 0);
  const needed = (mode === "lot" ? product.lot.qty : 1) * qty + inCart;
  const out = product.stock <= 0;
  const tooMany = needed > product.stock;
  const price = mode === "lot" ? product.lot.price : product.unitPrice;
  const perPiece = +(product.lot.price / product.lot.qty).toFixed(2);
  const saving = lotSaving(product);

  const add = () => {
    addToCart(product.id, mode, qty);
    setQty(1);
    setFlash(true);
    setTimeout(() => setFlash(false), 1200);
  };

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
      <div className="relative">
        <ProductTile product={product} />
        {product.tag && (
          <span className="absolute start-2 top-2 rounded-full bg-sun-400 px-2 py-0.5 text-[11px] font-bold text-navy-950">{t.tags[product.tag]}</span>
        )}
        {out ? (
          <span className="absolute end-2 top-2 rounded-full bg-danger px-2 py-0.5 text-[11px] font-bold text-white">{t.outOfStock}</span>
        ) : product.stock < settings.lowStockAt ? (
          <span className="absolute end-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-bold text-warn">{t.lowStock}</span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-3">
        <div>
          <h3 className="text-sm font-semibold leading-snug">{product.name}</h3>
          <p className="text-xs text-muted">
            <bdi dir="ltr">{product.size}</bdi>
            {mode === "lot" && <> · {t.lotOf(product.lot.qty)}</>}
          </p>
        </div>

        <div className="flex items-end justify-between gap-2">
          <div>
            <div className="text-lg font-extrabold text-navy-900">{formatDh(price, locale)}</div>
            <div className="text-[11px] text-muted">
              {mode === "lot" ? `${formatDh(perPiece, locale)} ${t.perUnit}` : t.unit}
            </div>
          </div>
          {mode === "lot" && saving > 0 && <span dir="ltr" className="rounded-md bg-ok/10 px-1.5 py-0.5 text-xs font-bold text-ok">{t.save(saving)}</span>}
        </div>

        <div className="mt-auto flex flex-col gap-2">
          <div className="flex items-center justify-between rounded-xl border border-line" dir="ltr">
            <button className="px-2.5 py-2 text-lg leading-none text-muted disabled:opacity-30" onClick={() => setQty(Math.max(1, qty - 1))} disabled={qty <= 1} aria-label="-">−</button>
            <span className="w-6 text-center text-sm font-semibold">{qty}</span>
            <button className="px-2.5 py-2 text-lg leading-none text-muted" onClick={() => setQty(qty + 1)} aria-label="+">+</button>
          </div>
          <button
            onClick={add}
            disabled={out || tooMany}
            className={`w-full rounded-xl px-3 py-2.5 text-sm font-bold transition ${flash ? "bg-ok text-white" : "bg-sun-400 text-navy-950 hover:bg-sun-500"} disabled:bg-line disabled:text-muted`}
          >
            {out ? t.outOfStock : flash ? t.added : t.add}
          </button>
          {mode === "unit" && settings.wholesaleEnabled && saving > 0 && (
            <Link href={`/${locale}/gros`} className="text-center text-[11px] font-semibold text-navy-800 hover:underline">
              {t.wholesaleHint(formatDh(perPiece, locale), product.lot.qty)}
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
