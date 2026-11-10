"use client";

import { useState } from "react";
import type { Box } from "@/data/boxes";
import { slugify } from "@/lib/config";
import { useStore } from "@/lib/store";
import { boxAvailable, boxValue, formatDh, suggestBoxPrices } from "@/lib/shop";
import { ProductTile } from "@/components/ProductTile";
import { Field, Modal, Toggle, inputCls, num } from "@/components/admin/ui";

const tags: { value: Box["tag"] | ""; label: string }[] = [
  { value: "", label: "Aucun" },
  { value: "best", label: "Top vente" },
  { value: "new", label: "Nouveau" },
  { value: "promo", label: "Promo" },
];

const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

function PriceAdvice({ box, onPick }: { box: Box; onPick: (price: number) => void }) {
  const { getProduct } = useStore();
  const value = boxValue(box, getProduct);
  const s = suggestBoxPrices(value);
  if (value.retail <= 0) return null;
  const options = [
    { key: "light", label: "Léger", price: s.light },
    { key: "recommended", label: "Recommandé", price: s.recommended },
    { key: "aggressive", label: "Agressif", price: s.aggressive },
  ];
  const belowWholesale = box.price < value.wholesale;
  return (
    <div className="rounded-xl bg-paper p-3 text-sm">
      <div className="flex flex-wrap gap-x-6 gap-y-1">
        <span>Valeur à la pièce : <b>{formatDh(value.retail)}</b></span>
        <span>Valeur au prix de gros : <b>{formatDh(value.wholesale)}</b></span>
        <span>
          Remise client : <b className={belowWholesale ? "text-danger" : "text-ok"}>{formatDh(Math.max(0, value.retail - box.price))} (-{pct(Math.max(0, value.retail - box.price), value.retail)}%)</b>
        </span>
      </div>
      <p className="mt-2 text-xs font-semibold text-muted">Prix suggérés (finissent en 4 ou 9, jamais sous le prix de gros) :</p>
      <div className="mt-1 flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o.key}
            type="button"
            onClick={() => onPick(o.price)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${box.price === o.price ? "border-navy-900 bg-navy-900 text-white" : "border-line bg-white"}`}
          >
            {o.label} · {formatDh(o.price)} <span className="opacity-70">(-{pct(value.retail - o.price, value.retail)}%)</span>
          </button>
        ))}
      </div>
      {belowWholesale && <p className="mt-2 text-xs font-semibold text-danger">Attention : ce prix est sous votre prix de gros, la box coûte moins cher que les lots.</p>}
    </div>
  );
}

function BoxForm({ initial, onDone }: { initial: Box; onDone: () => void }) {
  const { config, saveBox, removeBox, getProduct } = useStore();
  const [b, setB] = useState<Box>(initial);
  const [pick, setPick] = useState("");
  const isNew = !config.boxes.some((x) => x.id === initial.id);
  const set = (patch: Partial<Box>) => setB({ ...b, ...patch });
  const valid = b.name.fr.trim() && b.name.ar.trim() && b.items.length > 0 && b.price > 0;
  const setItem = (productId: string, qty: number) =>
    set({ items: qty > 0 ? b.items.map((it) => (it.productId === productId ? { ...it, qty } : it)) : b.items.filter((it) => it.productId !== productId) });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        saveBox(b);
        onDone();
      }}
      className="space-y-4"
    >
      <div className="grid gap-3 sm:grid-cols-[80px_1fr_1fr]">
        <Field label="Icône">
          <input className={`${inputCls} text-center`} value={b.icon} onChange={(e) => set({ icon: e.target.value })} />
        </Field>
        <Field label="Nom · Français">
          <input className={inputCls} value={b.name.fr} onChange={(e) => set({ name: { ...b.name, fr: e.target.value } })} required />
        </Field>
        <Field label="Nom · العربية">
          <input className={inputCls} dir="rtl" lang="ar" value={b.name.ar} onChange={(e) => set({ name: { ...b.name, ar: e.target.value } })} required />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Description · Français">
          <textarea className={inputCls} rows={2} value={b.description.fr} onChange={(e) => set({ description: { ...b.description, fr: e.target.value } })} />
        </Field>
        <Field label="Description · العربية">
          <textarea className={inputCls} rows={2} dir="rtl" lang="ar" value={b.description.ar} onChange={(e) => set({ description: { ...b.description, ar: e.target.value } })} />
        </Field>
      </div>

      <div>
        <p className="text-xs font-semibold text-muted">Contenu de la box</p>
        <ul className="mt-1 divide-y divide-line rounded-xl border border-line">
          {b.items.map((it) => {
            const p = getProduct(it.productId);
            return (
              <li key={it.productId} className="flex items-center gap-3 p-2">
                {p && <ProductTile product={p} compact className="w-10 shrink-0 rounded-md" />}
                <span className="min-w-0 flex-1 truncate text-sm">
                  {p?.name ?? <span className="text-danger">Produit supprimé ({it.productId})</span>}
                  {p && <span className="text-xs text-muted"> · {formatDh(p.unitPrice)} / pièce</span>}
                </span>
                <input type="number" min={0} className={`${inputCls} w-20`} value={it.qty} onChange={(e) => setItem(it.productId, Math.floor(num(e.target.value)))} aria-label="Quantité" />
                <button type="button" onClick={() => setItem(it.productId, 0)} className="px-2 text-xs font-semibold text-danger" aria-label="Retirer">✕</button>
              </li>
            );
          })}
          {b.items.length === 0 && <li className="p-3 text-sm text-muted">Ajoutez au moins un produit.</li>}
        </ul>
        <div className="mt-2 flex gap-2">
          <select className={inputCls} value={pick} onChange={(e) => setPick(e.target.value)}>
            <option value="">Ajouter un produit…</option>
            {config.products
              .filter((p) => !b.items.some((it) => it.productId === p.id))
              .map((p) => (
                <option key={p.id} value={p.id}>{p.name} · {p.size} · {formatDh(p.unitPrice)}</option>
              ))}
          </select>
          <button
            type="button"
            disabled={!pick}
            onClick={() => {
              set({ items: [...b.items, { productId: pick, qty: 1 }] });
              setPick("");
            }}
            className="shrink-0 rounded-lg bg-navy-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            Ajouter
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Prix de la box (DH)">
          <input type="number" min={0} className={inputCls} value={b.price} onChange={(e) => set({ price: num(e.target.value) })} />
        </Field>
        <Field label="Badge">
          <select className={inputCls} value={b.tag ?? ""} onChange={(e) => set({ tag: (e.target.value || undefined) as Box["tag"] })}>
            {tags.map((t) => (
              <option key={t.label} value={t.value}>{t.label}</option>
            ))}
          </select>
        </Field>
        <div className="flex items-end gap-3 pb-2">
          <Toggle checked={!b.hidden} onChange={(v) => set({ hidden: !v })} label="Visible" />
          <span className="text-sm font-semibold">{b.hidden ? "Masquée" : "Visible"}</span>
        </div>
      </div>
      <PriceAdvice box={b} onPick={(price) => set({ price })} />

      <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
        {!isNew && (
          <button
            type="button"
            onClick={() => {
              if (confirm(`Supprimer « ${initial.name.fr} » ?`)) {
                removeBox(initial.id);
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
          {isNew ? "Créer la box" : "Enregistrer"}
        </button>
      </div>
    </form>
  );
}

export default function AdminBoxes() {
  const { ready, config, getProduct, saveBox } = useStore();
  const [editing, setEditing] = useState<Box | null>(null);
  if (!ready) return null;
  const blank = (): Box => ({ id: slugify("box"), icon: "🎁", name: { fr: "", ar: "" }, description: { fr: "", ar: "" }, items: [], price: 0 });

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Box</h1>
          <p className="text-sm text-muted">Des produits du catalogue vendus ensemble à un prix rond. Elles s&apos;affichent en haut de la boutique.</p>
        </div>
        <button onClick={() => setEditing(blank())} className="rounded-xl bg-sun-400 px-4 py-2.5 text-sm font-bold text-navy-950">+ Nouvelle box</button>
      </div>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="bg-paper text-xs text-muted">
            <tr>
              <th className="p-3 text-start">Box</th>
              <th className="p-3 text-start">Valeur pièce</th>
              <th className="p-3 text-start">Valeur gros</th>
              <th className="p-3 text-start">Prix (DH)</th>
              <th className="p-3 text-start">Remise</th>
              <th className="p-3 text-start">Dispo</th>
              <th className="p-3 text-start">Visible</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {config.boxes.map((b) => {
              const v = boxValue(b, getProduct);
              const avail = boxAvailable(b, getProduct);
              return (
                <tr key={b.id} className={b.hidden ? "opacity-50" : ""}>
                  <td className="p-3">
                    <p className="font-semibold">{b.icon} {b.name.fr}</p>
                    <p className="text-xs text-muted">{b.items.map((it) => `${it.qty} × ${getProduct(it.productId)?.name ?? "?"}`).join(", ")}</p>
                  </td>
                  <td className="p-3">{formatDh(v.retail)}</td>
                  <td className="p-3">{formatDh(v.wholesale)}</td>
                  <td className="p-3">
                    <input key={`p${b.price}`} type="number" min={0} defaultValue={b.price} onBlur={(e) => saveBox({ ...b, price: num(e.target.value) })} className={`${inputCls} w-24 ${b.price < v.wholesale ? "border-danger" : ""}`} />
                  </td>
                  <td className="p-3 font-semibold text-ok">-{pct(Math.max(0, v.retail - b.price), v.retail)}%</td>
                  <td className={`p-3 ${avail === 0 ? "font-bold text-danger" : ""}`}>{avail}</td>
                  <td className="p-3">
                    <Toggle checked={!b.hidden} onChange={(on) => saveBox({ ...b, hidden: !on })} label={`Visible : ${b.name.fr}`} />
                  </td>
                  <td className="p-3 text-end">
                    <button onClick={() => setEditing(b)} className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold">Modifier</button>
                  </td>
                </tr>
              );
            })}
            {config.boxes.length === 0 && (
              <tr>
                <td colSpan={8} className="p-8 text-center text-muted">Aucune box.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted">
        « Valeur gros » = les mêmes produits au prix par pièce de vos lots. Une box vendue sous cette valeur devient moins chère que l&apos;achat en gros.
        « Dispo » = nombre de box que le stock actuel permet de préparer.
      </p>
      {editing && (
        <Modal title={editing.name.fr ? `Modifier « ${editing.name.fr} »` : "Nouvelle box"} onClose={() => setEditing(null)}>
          <BoxForm initial={editing} onDone={() => setEditing(null)} />
        </Modal>
      )}
    </div>
  );
}
