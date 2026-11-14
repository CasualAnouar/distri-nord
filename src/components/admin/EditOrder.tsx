"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { formatDh, lineUnitPrice, linePrice, type Mode, type Order } from "@/lib/shop";
import { DecimalInput, Field, Modal, inputCls } from "./ui";

// Seller edit of an order after it was placed: the customer often changes it at the door. The
// seller sets the final quantities, adds or removes products, the delivery fee and the cash really
// collected, with a note. The server keeps the order as placed and moves stock by the difference.
// No message goes to the customer.

type Row = { productId: string; mode: Mode; qty: number; name: string; unitsPerLine: number; unitPrice: number; before: number };

const round2 = (n: number) => Math.round(n * 100) / 100;
const lotLabel = (r: { mode: Mode; unitsPerLine: number }) => (r.mode === "lot" ? ` (lot ${r.unitsPerLine})` : " (pièce)");

export function EditOrder({ order, onClose }: { order: Order; onClose: () => void }) {
  const { config, editOrder } = useStore();
  const [rows, setRows] = useState<Row[]>(() =>
    order.lines.map((l) => ({ productId: l.productId, mode: l.mode, qty: l.qty, name: l.name, unitsPerLine: l.unitsPerLine, unitPrice: lineUnitPrice(l), before: l.qty })),
  );
  const [delivery, setDelivery] = useState(order.delivery);
  const [total, setTotal] = useState(order.total);
  const [totalTouched, setTotalTouched] = useState(order.total !== round2(order.subtotal + order.delivery));
  const [note, setNote] = useState("");
  const [pick, setPick] = useState("");
  const [pickMode, setPickMode] = useState<Mode>("lot");
  const [saving, setSaving] = useState(false);
  // The version this form was opened on: if the order is edited elsewhere meanwhile, saving is refused.
  const [seen] = useState(order.edits?.length ?? 0);

  const products = useMemo(() => [...config.products].sort((a, b) => a.name.localeCompare(b.name, "fr", { sensitivity: "base" })), [config.products]);
  const byId = useMemo(() => new Map(config.products.map((p) => [p.id, p])), [config.products]);
  const picked = byId.get(pick);

  const subtotal = round2(rows.reduce((a, r) => a + r.unitPrice * r.qty, 0));
  const computed = round2(subtotal + delivery);
  const shownTotal = totalTouched ? total : computed;
  const kept = rows.filter((r) => r.qty > 0);

  const setQty = (i: number, qty: number) => setRows((list) => list.map((r, j) => (j === i ? { ...r, qty: Math.max(0, Math.min(10000, qty)) } : r)));

  const add = () => {
    if (!picked) return;
    const mode: Mode = picked.lotOnly ? "lot" : pickMode;
    const i = rows.findIndex((r) => r.productId === picked.id && r.mode === mode);
    if (i >= 0) setQty(i, rows[i].qty + 1);
    else
      setRows((list) => [
        ...list,
        { productId: picked.id, mode, qty: 1, name: picked.name, unitsPerLine: mode === "lot" ? picked.lot.qty : 1, unitPrice: linePrice(picked, mode, 1), before: 0 },
      ]);
    setPick("");
  };

  // Units taken from or put back into stock, per product, for the warning below the list.
  const stockMoves = useMemo(() => {
    const m = new Map<string, { name: string; diff: number }>();
    for (const r of rows) {
      const cur = m.get(r.productId) ?? { name: r.name, diff: 0 };
      cur.diff += (r.qty - r.before) * r.unitsPerLine;
      m.set(r.productId, cur);
    }
    return [...m].filter(([, v]) => v.diff !== 0);
  }, [rows]);

  const changed = rows.some((r) => r.qty !== r.before) || delivery !== order.delivery || shownTotal !== order.total;

  const save = async () => {
    if (saving) return;
    if (!kept.length) return alert("Gardez au moins un produit. Si le client ne prend rien, annulez la commande.");
    if (!changed && !note.trim()) return onClose();
    setSaving(true);
    try {
      const r = await editOrder(order.id, {
        lines: kept.map((x) => ({ productId: x.productId, mode: x.mode, qty: x.qty })),
        delivery,
        total: shownTotal,
        note: note.trim(),
        seen,
      });
      if (r.ok) return onClose();
      alert(
        r.error === "stale"
          ? "Cette commande vient d'être modifiée ailleurs. Rouvrez-la pour voir la dernière version."
          : r.error === "closed"
            ? "Une commande annulée ne peut pas être modifiée."
            : r.error === "empty"
              ? "Gardez au moins un produit."
              : "Commande introuvable.",
      );
      if (r.error === "stale" || r.error === "closed") onClose();
    } catch {
      alert("Erreur réseau : la modification n'a pas été enregistrée. Réessayez.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={`Modifier ${order.id}`} onClose={onClose}>
      <p className="text-sm text-muted">
        Mettez la commande telle qu&apos;elle a vraiment été livrée. L&apos;original reste visible dans l&apos;historique, le stock est corrigé et le client ne reçoit aucun message.
      </p>

      <ul className="mt-4 divide-y divide-line rounded-xl border border-line">
        {rows.map((r, i) => (
          <li key={`${r.productId}-${r.mode}`} className={`flex flex-wrap items-center gap-x-3 gap-y-2 p-3 ${r.qty === 0 ? "bg-danger/5" : ""}`}>
            <div className="min-w-0 flex-1 basis-40">
              <p className={`text-sm font-semibold ${r.qty === 0 ? "text-danger line-through" : ""}`}>
                {r.name}
                <span className="font-normal text-muted">{lotLabel(r)}</span>
              </p>
              <p className="text-xs text-muted">
                {formatDh(r.unitPrice)} {r.mode === "lot" ? "le lot" : "la pièce"}
                {r.before !== r.qty && <span className="font-semibold text-warn"> · avant : {r.before}</span>}
              </p>
            </div>
            <div className="ms-auto flex items-center gap-1">
              <button type="button" onClick={() => setQty(i, r.qty - 1)} className="size-10 rounded-lg border border-line bg-white text-lg font-bold" aria-label={`Un de moins : ${r.name}`}>
                −
              </button>
              <DecimalInput integer value={r.qty} onChange={(n) => setQty(i, n)} className="!w-16 text-center" aria-label={`Quantité : ${r.name}`} />
              <button type="button" onClick={() => setQty(i, r.qty + 1)} className="size-10 rounded-lg border border-line bg-white text-lg font-bold" aria-label={`Un de plus : ${r.name}`}>
                +
              </button>
              <span className="w-20 text-end text-sm font-bold">{formatDh(round2(r.unitPrice * r.qty))}</span>
              <button
              type="button"
              onClick={() => setQty(i, 0)}
              disabled={r.qty === 0}
              className="rounded-lg px-2 py-2 text-sm font-semibold text-danger disabled:opacity-30"
              aria-label={`Retirer ${r.name}`}
            >
              ✕
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex flex-wrap items-end gap-2 rounded-xl bg-paper p-3">
        <Field label="Ajouter un produit" className="min-w-0 flex-1 basis-48">
          <select value={pick} onChange={(e) => setPick(e.target.value)} className={inputCls}>
            <option value="">Choisir…</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.size ? ` · ${p.size}` : ""}
                {p.hidden ? " (caché)" : ""}
              </option>
            ))}
          </select>
        </Field>
        {picked && !picked.lotOnly && (
          <Field label="Vendu par">
            <select value={pickMode} onChange={(e) => setPickMode(e.target.value as Mode)} className={inputCls}>
              <option value="lot">Lot de {picked.lot.qty} · {formatDh(picked.lot.price)}</option>
              <option value="unit">Pièce · {formatDh(picked.unitPrice)}</option>
            </select>
          </Field>
        )}
        <button type="button" onClick={add} disabled={!picked} className="rounded-lg bg-navy-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-40">
          + Ajouter
        </button>
      </div>

      {stockMoves.length > 0 && (
        <ul className="mt-3 space-y-0.5 text-xs text-muted">
          {stockMoves.map(([id, v]) => {
            const left = byId.get(id)?.stock;
            return (
              <li key={id}>
                Stock {v.name} : {v.diff > 0 ? `−${v.diff}` : `+${-v.diff}`} {Math.abs(v.diff) > 1 ? "unités" : "unité"}
                {v.diff > 0 && left !== undefined && v.diff > left && <span className="font-semibold text-warn"> (il n&apos;en reste que {left} en stock)</span>}
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Field label="Livraison (DH)">
          <DecimalInput value={delivery} onChange={setDelivery} />
        </Field>
        <Field label="Montant encaissé (DH)" hint={totalTouched && shownTotal !== computed ? `Calculé : ${formatDh(computed)}` : "Produits + livraison"}>
          <DecimalInput
            value={shownTotal}
            onChange={(n) => {
              setTotal(n);
              setTotalTouched(true);
            }}
          />
        </Field>
      </div>
      {totalTouched && shownTotal !== computed && (
        <button type="button" onClick={() => setTotalTouched(false)} className="mt-1 text-xs font-semibold text-sky-700 underline">
          Revenir au montant calculé ({formatDh(computed)})
        </button>
      )}

      <Field label="Note (facultatif)" className="mt-3">
        <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={2} placeholder="Ex. : le client a pris 1 lot de moins à la porte" className={inputCls} />
      </Field>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <p className="text-sm">
          {order.total !== shownTotal ? (
            <>
              <span className="text-muted line-through">{formatDh(order.total)}</span> → <strong className="text-navy-900">{formatDh(shownTotal)}</strong>
            </>
          ) : (
            <strong className="text-navy-900">{formatDh(shownTotal)}</strong>
          )}
        </p>
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold">
            Annuler
          </button>
          <button type="button" onClick={save} disabled={saving || (!changed && !note.trim())} className="rounded-xl bg-navy-900 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-40">
            {saving ? "…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/** What changed on an order, oldest edit first, with the order as placed. */
export function OrderEdits({ order }: { order: Order }) {
  if (!order.edits?.length) return null;
  const when = (iso: string) => new Date(iso).toLocaleString("fr-MA", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  const st: Record<Order["status"], string> = { new: "nouvelle", confirmed: "confirmée", shipping: "en livraison", delivered: "livrée", cancelled: "annulée" };
  return (
    <div className="mt-3 rounded-xl border border-sun-400/60 bg-sun-400/10 p-3 text-xs">
      <p className="font-bold text-warn">✏️ Commande modifiée</p>
      <ol className="mt-1 space-y-2">
        {order.edits.map((e, i) => (
          <li key={e.at + i}>
            <p className="font-semibold">
              {when(e.at)} · commande {st[e.status]}
            </p>
            <ul className="ms-3 list-disc">
              {e.changes.map((c) => (
                <li key={`${c.productId}-${c.mode}`}>
                  {c.name}
                  {lotLabel(c)} : {c.from === 0 ? `ajouté (${c.to})` : c.to === 0 ? `retiré (${c.from})` : `${c.from} → ${c.to}`}
                </li>
              ))}
              {e.delivery && <li>Livraison : {formatDh(e.delivery.from)} → {formatDh(e.delivery.to)}</li>}
              {e.total.from !== e.total.to && (
                <li>
                  Total : {formatDh(e.total.from)} → <strong>{formatDh(e.total.to)}</strong>
                </li>
              )}
              {e.note && <li className="italic">📝 {e.note}</li>}
            </ul>
          </li>
        ))}
      </ol>
      {order.original && (
        <details className="mt-2">
          <summary className="cursor-pointer font-semibold text-muted">Commande d&apos;origine · {formatDh(order.original.total)}</summary>
          <ul className="mt-1 space-y-0.5 text-muted">
            {[...order.original.lines]
              .sort((a, b) => a.name.localeCompare(b.name, "fr", { sensitivity: "base" }))
              .map((l) => (
                <li key={`${l.productId}-${l.mode}`} className="flex justify-between gap-2">
                  <span>
                    {l.qty} × {l.name}
                    {l.mode === "lot" ? ` (lot ${l.unitsPerLine})` : ""}
                  </span>
                  <span>{formatDh(l.price)}</span>
                </li>
              ))}
            <li className="flex justify-between gap-2">
              <span>Livraison</span>
              <span>{order.original.delivery ? formatDh(order.original.delivery) : "Gratuite"}</span>
            </li>
          </ul>
        </details>
      )}
    </div>
  );
}
