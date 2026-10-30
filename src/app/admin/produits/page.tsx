"use client";

import { useState } from "react";
import type { Product } from "@/data/products";
import { slugify } from "@/lib/config";
import { useStore } from "@/lib/store";
import { formatDh, lotSaving } from "@/lib/shop";
import { ProductTile } from "@/components/ProductTile";
import { Field, Modal, Toggle, inputCls, num } from "@/components/admin/ui";

const tags: { value: Product["tag"] | ""; label: string }[] = [
  { value: "", label: "Aucun" },
  { value: "best", label: "Top vente" },
  { value: "new", label: "Nouveau" },
  { value: "promo", label: "Promo" },
];

function ProductForm({ initial, onDone }: { initial: Product; onDone: () => void }) {
  const { categories, saveProduct, removeProduct, config } = useStore();
  const [p, setP] = useState<Product>(initial);
  const isNew = !config.products.some((x) => x.id === initial.id);
  const set = (patch: Partial<Product>) => setP({ ...p, ...patch });
  const valid = p.name.trim() && p.brand.trim() && p.unitPrice > 0 && p.lot.qty > 1 && p.lot.price > 0;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        saveProduct({ ...p, name: p.name.trim(), brand: p.brand.trim() });
        onDone();
      }}
      className="space-y-4"
    >
      <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
        <ProductTile product={p} className="rounded-xl" />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nom du produit" className="sm:col-span-2">
            <input className={inputCls} value={p.name} onChange={(e) => set({ name: e.target.value })} required />
          </Field>
          <Field label="Marque (affichée sur la vignette)">
            <input className={inputCls} value={p.brand} onChange={(e) => set({ brand: e.target.value })} required />
          </Field>
          <Field label="Format">
            <input className={inputCls} value={p.size} onChange={(e) => set({ size: e.target.value })} placeholder="50 cl, 1 kg…" />
          </Field>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Catégorie">
          <select className={inputCls} value={p.category} onChange={(e) => set({ category: e.target.value })}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.icon} {c.fr}</option>
            ))}
          </select>
        </Field>
        <Field label="Badge">
          <select className={inputCls} value={p.tag ?? ""} onChange={(e) => set({ tag: (e.target.value || undefined) as Product["tag"] })}>
            {tags.map((t) => (
              <option key={t.label} value={t.value}>{t.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Couleur de la vignette">
          <input type="color" className="h-[38px] w-full cursor-pointer rounded-lg border border-line bg-white p-1" value={p.color} onChange={(e) => set({ color: e.target.value })} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="Prix à la pièce (DH)">
          <input type="number" min={0} step="0.5" className={inputCls} value={p.unitPrice} onChange={(e) => set({ unitPrice: num(e.target.value) })} />
        </Field>
        <Field label="Pièces par lot">
          <input type="number" min={2} className={inputCls} value={p.lot.qty} onChange={(e) => set({ lot: { ...p.lot, qty: Math.floor(num(e.target.value)) } })} />
        </Field>
        <Field label="Prix du lot (DH)" hint={p.lot.qty > 1 && p.unitPrice > 0 ? `${formatDh(+(p.lot.price / p.lot.qty).toFixed(2))}/pièce · -${lotSaving(p)}%` : undefined}>
          <input type="number" min={0} className={inputCls} value={p.lot.price} onChange={(e) => set({ lot: { ...p.lot, price: num(e.target.value) } })} />
        </Field>
        <Field label="Stock (pièces)">
          <input type="number" min={0} className={inputCls} value={p.stock} onChange={(e) => set({ stock: Math.floor(num(e.target.value)) })} />
        </Field>
      </div>
      <div className="flex items-center gap-3 rounded-xl bg-paper p-3">
        <Toggle checked={!p.hidden} onChange={(v) => set({ hidden: !v })} label="Visible" />
        <span className="text-sm font-semibold">{p.hidden ? "Masqué dans la boutique" : "Visible dans la boutique"}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
        {!isNew && (
          <button
            type="button"
            onClick={() => {
              if (confirm(`Supprimer « ${initial.name} » ?`)) {
                removeProduct(initial.id);
                onDone();
              }
            }}
            className="rounded-xl border border-danger/40 px-4 py-2.5 text-sm font-semibold text-danger"
          >
            Supprimer
          </button>
        )}
        <button type="button" onClick={onDone} className="ms-auto rounded-xl px-4 py-2.5 text-sm font-semibold text-muted">Annuler</button>
        <button type="submit" disabled={!valid} className="rounded-xl bg-navy-900 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-40">
          {isNew ? "Ajouter le produit" : "Enregistrer"}
        </button>
      </div>
    </form>
  );
}

export default function AdminProducts() {
  const { ready, config, categories, settings, updateProduct } = useStore();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [editing, setEditing] = useState<Product | null>(null);
  if (!ready) return null;

  const list = config.products.filter(
    (p) => (cat === "all" || p.category === cat) && `${p.name} ${p.brand}`.toLowerCase().includes(q.toLowerCase()),
  );
  const blank = (): Product => ({
    id: slugify("produit"),
    name: "",
    brand: "",
    size: "",
    category: cat !== "all" ? cat : (categories[0]?.id ?? ""),
    unitPrice: 10,
    lot: { qty: 12, price: 108 },
    stock: 100,
    color: "#12357a",
  });

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Produits & stock</h1>
          <p className="text-sm text-muted">{config.products.length} produits · les changements apparaissent tout de suite dans la boutique.</p>
        </div>
        <button onClick={() => setEditing(blank())} className="rounded-xl bg-sun-400 px-4 py-2.5 text-sm font-bold text-navy-950">+ Nouveau produit</button>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher…" className={`${inputCls} max-w-xs`} />
        <select value={cat} onChange={(e) => setCat(e.target.value)} className={`${inputCls} w-auto`}>
          <option value="all">Toutes les catégories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.icon} {c.fr}</option>
          ))}
        </select>
      </div>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="bg-paper text-xs text-muted">
            <tr>
              <th className="p-3 text-start">Produit</th>
              <th className="p-3 text-start">Prix pièce (DH)</th>
              <th className="p-3 text-start">Prix lot (DH)</th>
              <th className="p-3 text-start">Stock (pièces)</th>
              <th className="p-3 text-start">Visible</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {list.map((p) => (
              <tr key={p.id} className={p.hidden ? "opacity-50" : ""}>
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <ProductTile product={p} compact className="w-14 shrink-0 rounded-lg" />
                    <div>
                      <p className="font-semibold">{p.name}</p>
                      <p className="text-xs text-muted">
                        {categories.find((c) => c.id === p.category)?.fr ?? "—"} · {p.size} · lot de {p.lot.qty}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="p-3">
                  <input key={`u${p.unitPrice}`} type="number" min={0} step="0.5" defaultValue={p.unitPrice} onBlur={(e) => updateProduct(p.id, { unitPrice: num(e.target.value) })} className={`${inputCls} w-24`} />
                </td>
                <td className="p-3">
                  <input key={`l${p.lot.price}`} type="number" min={0} defaultValue={p.lot.price} onBlur={(e) => updateProduct(p.id, { lot: { ...p.lot, price: num(e.target.value) } })} className={`${inputCls} w-24`} />
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <input
                      key={`s${p.stock}`}
                      type="number"
                      min={0}
                      defaultValue={p.stock}
                      onBlur={(e) => updateProduct(p.id, { stock: Math.floor(num(e.target.value)) })}
                      className={`${inputCls} w-24 ${p.stock === 0 ? "border-danger text-danger" : p.stock < settings.lowStockAt ? "border-warn" : ""}`}
                    />
                    {p.stock === 0 ? <span className="text-xs font-bold text-danger">Rupture</span> : p.stock < settings.lowStockAt ? <span className="text-xs font-bold text-warn">Bas</span> : null}
                  </div>
                </td>
                <td className="p-3">
                  <Toggle checked={!p.hidden} onChange={(v) => updateProduct(p.id, { hidden: !v })} label={`Visible : ${p.name}`} />
                </td>
                <td className="p-3 text-end">
                  <button onClick={() => setEditing(p)} className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold">Modifier</button>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted">Aucun produit.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {editing && (
        <Modal title={editing.name ? `Modifier « ${editing.name} »` : "Nouveau produit"} onClose={() => setEditing(null)}>
          <ProductForm initial={editing} onDone={() => setEditing(null)} />
        </Modal>
      )}
    </div>
  );
}
