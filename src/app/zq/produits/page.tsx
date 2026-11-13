"use client";

import { useEffect, useRef, useState } from "react";
import type { Product } from "@/data/products";
import { slugify } from "@/lib/config";
import { useStore } from "@/lib/store";
import { badAmounts, formatDh, lotSaving, validAmount } from "@/lib/shop";
import { ProductTile } from "@/components/ProductTile";
import { fileToDataUrl } from "@/lib/product-image";
import { DecimalInput, Field, Modal, Toggle, inputCls } from "@/components/admin/ui";

// An uploaded photo arrives as a data URL, and comes back from the server as its own image address.
const isUpload = (image?: string) => Boolean(image?.startsWith("data:") || image?.startsWith("/api/images/"));

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
  const valid = p.name.trim() && p.brand.trim() && (p.lotOnly || p.unitPrice > 0) && p.lot.qty > 1 && p.lot.price > 0 && badAmounts(p).length === 0;

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
      <div className="grid gap-3 rounded-xl bg-paper p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <Field label="Code-barres (EAN)" hint="Si aucune photo n'est ajoutée, celle d'Open Food Facts est utilisée.">
          <input className={inputCls} inputMode="numeric" value={p.barcode ?? ""} onChange={(e) => set({ barcode: e.target.value.replace(/\D/g, "") || undefined })} placeholder="6111…" />
        </Field>
        <Field label="Photo (lien)">
          <input className={inputCls} value={isUpload(p.image) ? "Photo importée" : (p.image ?? "")} readOnly={isUpload(p.image)} onChange={(e) => set({ image: e.target.value.trim() || undefined })} placeholder="https://…" />
        </Field>
        <div className="flex gap-2">
          <label className="cursor-pointer rounded-lg bg-navy-900 px-3 py-2 text-sm font-semibold text-white">
            Importer
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) set({ image: await fileToDataUrl(file) });
                e.target.value = "";
              }}
            />
          </label>
          {p.image && (
            <button type="button" onClick={() => set({ image: undefined })} className="rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold">
              Retirer
            </button>
          )}
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
        <Field label="Couleur (si pas de photo)">
          <input type="color" className="h-[38px] w-full cursor-pointer rounded-lg border border-line bg-white p-1" value={p.color} onChange={(e) => set({ color: e.target.value })} />
        </Field>
      </div>
      <div className="flex items-center gap-3 rounded-xl bg-paper p-3">
        <Toggle checked={!p.lotOnly} onChange={(v) => set({ lotOnly: !v })} label="Vendu aussi à la pièce" />
        <span className="text-sm font-semibold">{p.lotOnly ? "Vendu uniquement par lot complet" : "Vendu par lot et à la pièce"}</span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="Prix à la pièce (DH)" hint={p.lotOnly ? "Pas de vente à la pièce" : undefined}>
          <DecimalInput value={p.unitPrice} disabled={p.lotOnly} className="disabled:opacity-40" onChange={(unitPrice) => set({ unitPrice })} />
        </Field>
        <Field label="Pièces par lot">
          <DecimalInput integer value={p.lot.qty} onChange={(qty) => set({ lot: { ...p.lot, qty } })} />
        </Field>
        <Field label="Prix du lot (DH)" hint={p.lot.qty > 1 && p.lot.price > 0 ? `${formatDh(+(p.lot.price / p.lot.qty).toFixed(2))}/pièce${lotSaving(p) > 0 ? ` · -${lotSaving(p)}%` : ""}` : undefined}>
          <DecimalInput value={p.lot.price} onChange={(price) => set({ lot: { ...p.lot, price } })} />
        </Field>
        <Field label="Stock (pièces)">
          <DecimalInput integer value={p.stock} onChange={(stock) => set({ stock })} />
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
        {badAmounts(p).length > 0 && <span className="text-sm font-semibold text-danger">Un nombre est invalide (en rouge) : tapez la bonne valeur.</span>}
        <button type="submit" disabled={!valid} className="rounded-xl bg-navy-900 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-40">
          {isNew ? "Ajouter le produit" : "Enregistrer"}
        </button>
      </div>
    </form>
  );
}

/**
 * Drag and drop of the product rows, with a mouse or a finger. Only the grip handle starts a drag
 * (so the page still scrolls normally on a phone); while it is held, the row follows the pointer
 * and the page scrolls by itself near the top or bottom of the screen. The order is saved on release.
 */
function useRowDrag(visibleIds: string[], onDrop: (ids: string[]) => void) {
  const [order, setOrder] = useState<string[] | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const rows = useRef(new Map<string, HTMLElement>());
  const live = useRef<{ id: string; order: string[]; start: string[]; y: number; frame: number; stop: () => void } | null>(null);
  const dropRef = useRef(onDrop);
  useEffect(() => {
    dropRef.current = onDrop;
  });

  // Moves the held product to the row under the pointer.
  const moveTo = (y: number) => {
    const d = live.current;
    if (!d) return;
    let target = -1;
    d.order.forEach((id, i) => {
      const r = rows.current.get(id)?.getBoundingClientRect();
      if (r && y >= r.top && y < r.bottom) target = i;
    });
    if (target === -1) {
      const first = rows.current.get(d.order[0])?.getBoundingClientRect();
      const last = rows.current.get(d.order[d.order.length - 1])?.getBoundingClientRect();
      if (first && y < first.top) target = 0;
      else if (last && y >= last.bottom) target = d.order.length - 1;
      else return;
    }
    if (target === d.order.indexOf(d.id)) return;
    const next = d.order.filter((id) => id !== d.id);
    next.splice(target, 0, d.id);
    d.order = next;
    setOrder(next);
  };

  const finish = (save: boolean) => {
    const d = live.current;
    if (!d) return;
    live.current = null;
    d.stop();
    setDragId(null);
    setOrder(null);
    if (save && d.order.some((id, i) => id !== d.start[i])) dropRef.current(d.order);
  };

  useEffect(() => () => finish(false), []);

  const start = (id: string, e: React.PointerEvent<HTMLElement>) => {
    if (e.button !== 0 || live.current) return;
    e.preventDefault();
    // Listen on the whole window: the held row moves in the page, which would break a capture on it.
    const onMove = (ev: PointerEvent) => {
      if (ev.pointerId !== e.pointerId || !live.current) return;
      ev.preventDefault();
      live.current.y = ev.clientY;
      moveTo(ev.clientY);
    };
    const onUp = (ev: PointerEvent) => ev.pointerId === e.pointerId && finish(true);
    const noSelect = (ev: Event) => ev.preventDefault();
    const tick = () => {
      const d = live.current;
      if (!d) return;
      const edge = 70;
      const push = d.y < edge ? d.y - edge : d.y > window.innerHeight - edge ? d.y - (window.innerHeight - edge) : 0;
      const speed = Math.max(-18, Math.min(18, push / 4));
      if (speed) {
        window.scrollBy(0, speed);
        moveTo(d.y);
      }
      d.frame = requestAnimationFrame(tick);
    };
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    document.addEventListener("selectstart", noSelect);
    const d = {
      id,
      order: visibleIds,
      start: visibleIds,
      y: e.clientY,
      frame: requestAnimationFrame(tick),
      stop: () => {
        cancelAnimationFrame(d.frame);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
        document.removeEventListener("selectstart", noSelect);
      },
    };
    live.current = d;
    setDragId(id);
    setOrder(visibleIds);
  };

  const handleProps = (id: string) => ({
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => start(id, e),
    onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => {
      const step = e.key === "ArrowUp" ? -1 : e.key === "ArrowDown" ? 1 : 0;
      const from = visibleIds.indexOf(id);
      if (!step || from + step < 0 || from + step >= visibleIds.length) return;
      e.preventDefault();
      const next = [...visibleIds];
      next.splice(from, 1);
      next.splice(from + step, 0, id);
      onDrop(next);
    },
  });

  const rowRef = (id: string) => (el: HTMLElement | null) => {
    if (el) rows.current.set(id, el);
    else rows.current.delete(id);
  };

  return { order, dragId, handleProps, rowRef };
}

export default function AdminProducts() {
  const { ready, config, categories, settings, updateProduct, reorderProducts } = useStore();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [editing, setEditing] = useState<Product | null>(null);

  const filtered = config.products.filter(
    (p) => (cat === "all" || p.category === cat) && `${p.name} ${p.brand}`.toLowerCase().includes(q.toLowerCase()),
  );
  // A drag inside a filtered list moves the products among the places they already hold in the full list.
  const drag = useRowDrag(
    filtered.map((p) => p.id),
    (ids) => {
      const shown = new Set(ids);
      let k = 0;
      reorderProducts(config.products.map((p) => (shown.has(p.id) ? ids[k++] : p.id)));
    },
  );
  if (!ready) return null;

  const byId = new Map(config.products.map((p) => [p.id, p]));
  const list = drag.order ? drag.order.flatMap((id) => byId.get(id) ?? []) : filtered;
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
    // A new product goes to the end of the seller's order, once there is one.
    position: config.products.some((p) => p.position !== undefined) ? Math.max(...config.products.map((p) => p.position ?? -1)) + 1 : undefined,
  });

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Produits & stock</h1>
          <p className="text-sm text-muted">{config.products.length} produits · les changements apparaissent tout de suite dans la boutique.</p>
          <p className="text-sm text-muted">Pour changer l&apos;ordre dans la boutique, maintenez la poignée ⠿ et glissez le produit vers le haut ou le bas.</p>
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
        <table className="w-full min-w-[860px] text-sm">
          <thead className="bg-paper text-xs text-muted">
            <tr>
              <th className="w-10 p-3"><span className="sr-only">Ordre</span></th>
              <th className="p-3 text-start">Produit</th>
              <th className="p-3 text-start">Prix pièce (DH)</th>
              <th className="p-3 text-start">Prix lot (DH)</th>
              <th className="p-3 text-start">Stock (pièces)</th>
              <th className="p-3 text-start">À la pièce</th>
              <th className="p-3 text-start">Visible</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {list.map((p) => (
              <tr
                key={p.id}
                ref={drag.rowRef(p.id)}
                className={`${p.hidden ? "opacity-50" : ""} ${drag.dragId === p.id ? "relative z-10 bg-sun-400/20 shadow-lg outline-2 outline-sun-400" : ""}`}
              >
                <td className="py-3 ps-2 pe-0">
                  <button
                    type="button"
                    {...drag.handleProps(p.id)}
                    aria-label={`Déplacer ${p.name} (flèches haut et bas)`}
                    title="Maintenir et glisser pour changer l'ordre"
                    className={`grid h-11 w-9 touch-none select-none place-items-center rounded-lg text-xl text-muted hover:bg-paper ${drag.dragId === p.id ? "cursor-grabbing bg-paper text-ink" : "cursor-grab"}`}
                  >
                    ⠿
                  </button>
                </td>
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
                  {p.lotOnly ? (
                    <span className="text-xs font-semibold text-muted">Lot seul</span>
                  ) : (
                    <DecimalInput value={p.unitPrice} onCommit={(unitPrice) => unitPrice !== p.unitPrice && updateProduct(p.id, { unitPrice })} className="!w-24" aria-label={`Prix pièce : ${p.name}`} />
                  )}
                </td>
                <td className="p-3">
                  <DecimalInput value={p.lot.price} onCommit={(price) => price !== p.lot.price && updateProduct(p.id, { lot: { ...p.lot, price } })} className="!w-24" aria-label={`Prix lot : ${p.name}`} />
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <DecimalInput
                      integer
                      value={p.stock}
                      onCommit={(stock) => stock !== p.stock && updateProduct(p.id, { stock })}
                      className={`!w-24 ${p.stock === 0 ? "border-danger text-danger" : p.stock < settings.lowStockAt ? "border-warn" : ""}`}
                      aria-label={`Stock : ${p.name}`}
                    />
                    {!validAmount(p.stock) ? <span className="text-xs font-bold text-danger">À corriger</span> : p.stock === 0 ? <span className="text-xs font-bold text-danger">Rupture</span> : p.stock < settings.lowStockAt ? <span className="text-xs font-bold text-warn">Bas</span> : null}
                  </div>
                </td>
                <td className="p-3">
                  <Toggle checked={!p.lotOnly} onChange={(v) => updateProduct(p.id, { lotOnly: !v })} label={`Vendu à la pièce : ${p.name}`} />
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
                <td colSpan={8} className="p-8 text-center text-muted">Aucun produit.</td>
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
