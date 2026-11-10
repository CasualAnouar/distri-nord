"use client";

import { useState } from "react";
import type { Box } from "@/data/boxes";
import { useLocale } from "@/i18n/locale";
import { useStore } from "@/lib/store";
import { boxAvailable, boxValue, formatDh } from "@/lib/shop";
import { ProductTile } from "./ProductTile";

function BoxCard({ box }: { box: Box }) {
  const { locale, t } = useLocale();
  const { getProduct, addToCart, cart } = useStore();
  const [flash, setFlash] = useState(false);
  const value = boxValue(box, getProduct).retail;
  const saving = Math.max(0, value - box.price);
  const inCart = cart.find((l) => l.mode === "box" && l.productId === box.id)?.qty ?? 0;
  const out = boxAvailable(box, getProduct) <= inCart;
  const pieces = box.items.reduce((a, it) => a + it.qty, 0);
  const photos = box.items.map((it) => getProduct(it.productId)).filter((p) => p !== undefined).slice(0, 4);

  const add = () => {
    addToCart(box.id, "box", 1);
    setFlash(true);
    setTimeout(() => setFlash(false), 1200);
  };

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
      <div className="relative grid grid-cols-2 gap-px bg-line">
        {photos.map((p) => (
          <ProductTile key={p.id} product={p} compact className="!aspect-square" />
        ))}
        <span className="absolute start-2 top-2 rounded-full bg-navy-900 px-2 py-0.5 text-[11px] font-bold text-white">
          {box.icon} {t.box}
        </span>
        {box.tag && <span className="absolute end-2 top-2 rounded-full bg-sun-400 px-2 py-0.5 text-[11px] font-bold text-navy-950">{t.tags[box.tag]}</span>}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <div>
          <h3 className="font-bold leading-snug">{box.name[locale]}</h3>
          <p className="mt-0.5 text-xs text-muted">{box.description[locale]}</p>
        </div>
        <ul className="space-y-0.5 text-xs">
          {box.items.map((it) => (
            <li key={it.productId} className="flex gap-1.5">
              <span className="font-bold text-navy-800" dir="ltr">{it.qty}×</span>
              <span className="truncate">{getProduct(it.productId)?.name}</span>
            </li>
          ))}
        </ul>
        <div className="mt-auto flex items-end justify-between gap-2 pt-1">
          <div>
            <div className="text-lg font-extrabold text-navy-900">{formatDh(box.price, locale)}</div>
            {saving > 0 && (
              <div className="text-[11px] text-muted">
                {t.boxWorth} <s>{formatDh(value, locale)}</s> · {t.boxContents(pieces)}
              </div>
            )}
          </div>
          {saving > 0 && <span dir="ltr" className="rounded-md bg-ok/10 px-1.5 py-0.5 text-xs font-bold text-ok">-{formatDh(saving, locale)}</span>}
        </div>
        <button
          onClick={add}
          disabled={out}
          className={`w-full rounded-xl px-3 py-2.5 text-sm font-bold transition ${flash ? "bg-ok text-white" : "bg-sun-400 text-navy-950 hover:bg-sun-500"} disabled:bg-line disabled:text-muted`}
        >
          {out ? t.outOfStock : flash ? t.added : t.add}
        </button>
      </div>
    </article>
  );
}

export function Boxes() {
  const { t } = useLocale();
  const { boxes } = useStore();
  if (boxes.length === 0) return null;
  return (
    <section id="box" className="mx-auto max-w-6xl scroll-mt-20 px-4 pt-8">
      <h2 className="text-2xl font-extrabold">{t.boxesTitle}</h2>
      <p className="text-sm text-muted">{t.boxesText}</p>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {boxes.map((b) => (
          <BoxCard key={b.id} box={b} />
        ))}
      </div>
    </section>
  );
}
