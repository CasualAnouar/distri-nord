"use client";

import { useState } from "react";
import type { Product } from "@/data/products";
import { useLocale } from "@/i18n/locale";
import { useStore } from "@/lib/store";
import { formatDh, lotSaving, type Mode } from "@/lib/shop";
import { ProductTile } from "./ProductTile";

export function ProductCard({ product }: { product: Product }) {
  const { locale, t } = useLocale();
  const { addToCart, settings } = useStore();
  const [mode, setMode] = useState<Mode>("lot");
  const [qty, setQty] = useState(1);
  const [flash, setFlash] = useState(false);

  const needed = mode === "lot" ? product.lot.qty * qty : qty;
  const out = product.stock <= 0;
  const tooMany = needed > product.stock;
  const price = mode === "lot" ? product.lot.price : product.unitPrice;
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
          <p className="text-xs text-muted"><bdi dir="ltr">{product.size}</bdi></p>
        </div>

        <div className="grid grid-cols-2 rounded-xl bg-paper p-1 text-xs font-semibold" role="radiogroup">
          {(["lot", "unit"] as Mode[]).map((m) => (
            <button
              key={m}
              role="radio"
              aria-checked={mode === m}
              onClick={() => setMode(m)}
              className={`whitespace-nowrap rounded-lg px-1 py-1.5 text-[11px] sm:text-xs ${mode === m ? "bg-navy-900 text-white shadow" : "text-muted"}`}
            >
              {m === "lot" ? t.lotOf(product.lot.qty) : t.unit}
            </button>
          ))}
        </div>

        <div className="flex items-end justify-between gap-2">
          <div>
            <div className="text-lg font-extrabold text-navy-900">{formatDh(price, locale)}</div>
            <div className="text-[11px] text-muted">
              {mode === "lot" ? `${formatDh(+(product.lot.price / product.lot.qty).toFixed(2), locale)} ${t.perUnit}` : `${formatDh(product.unitPrice, locale)} ${t.perUnit}`}
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
        </div>
      </div>
    </article>
  );
}
