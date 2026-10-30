"use client";

import { useMemo, useState } from "react";
import { useLocale } from "@/i18n/locale";
import { useStore } from "@/lib/store";
import { ProductCard } from "./ProductCard";

export function Catalog() {
  const { locale, t } = useLocale();
  const { catalog, categories } = useStore();
  const [cat, setCat] = useState<string>("all");
  const [q, setQ] = useState("");

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return catalog.filter(
      (p) => (cat === "all" || p.category === cat) && (!needle || `${p.name} ${p.brand} ${p.size}`.toLowerCase().includes(needle)),
    );
  }, [catalog, cat, q]);

  return (
    <section id="catalogue" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-8">
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t.search}
        className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-base shadow-sm outline-none focus:border-navy-800"
      />
      <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-2">
        {[{ id: "all", icon: "✨", fr: t.all, ar: t.all }, ...categories.filter((c) => catalog.some((p) => p.category === c.id))].map((c) => (
          <button
            key={c.id}
            onClick={() => setCat(c.id)}
            className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold ${cat === c.id ? "border-navy-900 bg-navy-900 text-white" : "border-line bg-white text-ink"}`}
          >
            <span aria-hidden>{c.icon}</span> {c[locale]}
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <p className="py-16 text-center text-muted">{t.noResults}</p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {list.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </section>
  );
}
