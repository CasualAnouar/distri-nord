"use client";

import { useState } from "react";
import { categories } from "@/data/products";
import { useStore } from "@/lib/store";
import { formatDh } from "@/lib/shop";
import { ProductTile } from "@/components/ProductTile";

export default function AdminProducts() {
  const { ready, catalog, updateProduct } = useStore();
  const [q, setQ] = useState("");
  if (!ready) return null;
  const list = catalog.filter((p) => `${p.name} ${p.brand}`.toLowerCase().includes(q.toLowerCase()));
  const num = (v: string) => Math.max(0, Number(v.replace(",", ".")) || 0);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Produits & stock</h1>
          <p className="text-sm text-muted">Les changements apparaissent tout de suite dans la boutique.</p>
        </div>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher…" className="rounded-xl border border-line bg-white px-3 py-2" />
      </div>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-paper text-start text-xs text-muted">
            <tr>
              <th className="p-3 text-start">Produit</th>
              <th className="p-3 text-start">Catégorie</th>
              <th className="p-3 text-start">Prix pièce (DH)</th>
              <th className="p-3 text-start">Prix lot (DH)</th>
              <th className="p-3 text-start">Stock (pièces)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {list.map((p) => (
              <tr key={p.id}>
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <ProductTile product={p} compact className="w-14 shrink-0 rounded-lg" />
                    <div>
                      <p className="font-semibold">{p.name}</p>
                      <p className="text-xs text-muted">{p.size} · lot de {p.lot.qty} · {formatDh(+(p.lot.price / p.lot.qty).toFixed(2))}/pièce en lot</p>
                    </div>
                  </div>
                </td>
                <td className="p-3 text-muted">{categories.find((c) => c.id === p.category)?.fr}</td>
                <td className="p-3">
                  <input type="number" min={0} step="0.5" defaultValue={p.unitPrice} onBlur={(e) => updateProduct(p.id, { unitPrice: num(e.target.value) })} className="w-24 rounded-lg border border-line px-2 py-1.5" />
                </td>
                <td className="p-3">
                  <input type="number" min={0} defaultValue={p.lot.price} onBlur={(e) => updateProduct(p.id, { lotPrice: num(e.target.value) })} className="w-24 rounded-lg border border-line px-2 py-1.5" />
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <input
                      key={p.stock}
                      type="number"
                      min={0}
                      defaultValue={p.stock}
                      onBlur={(e) => updateProduct(p.id, { stock: Math.floor(num(e.target.value)) })}
                      className={`w-24 rounded-lg border px-2 py-1.5 ${p.stock === 0 ? "border-danger text-danger" : p.stock < 120 ? "border-warn" : "border-line"}`}
                    />
                    {p.stock === 0 ? <span className="text-xs font-bold text-danger">Rupture</span> : p.stock < 120 ? <span className="text-xs font-bold text-warn">Bas</span> : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
