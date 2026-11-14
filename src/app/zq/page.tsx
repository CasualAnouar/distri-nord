"use client";

import { useState } from "react";
import { useCityName, useStore } from "@/lib/store";
import { editable, formatDh, mapsUrl, sortedLines, type Order, type OrderStatus } from "@/lib/shop";
import { dicts } from "@/i18n/dict";
import { OrderChats } from "@/components/OrderChats";
import { statusMessage, waUrl } from "@/lib/walinks";
import { EditOrder, OrderEdits } from "@/components/admin/EditOrder";

const t = dicts.fr;
const badge: Record<OrderStatus, string> = {
  new: "bg-sun-400/30 text-warn",
  confirmed: "bg-navy-100 text-navy-800",
  shipping: "bg-sky-100 text-sky-700",
  delivered: "bg-ok/15 text-ok",
  cancelled: "bg-danger/10 text-danger",
};
const nextAction: Partial<Record<OrderStatus, { to: OrderStatus; label: string }>> = {
  new: { to: "confirmed", label: "✅ Confirmer l'adresse (client au tél.)" },
  confirmed: { to: "shipping", label: "🚚 Lancer la livraison" },
  shipping: { to: "delivered", label: "📦 Marquer livrée" },
};
const ago = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  return m < 60 ? `il y a ${m} min` : `il y a ${Math.floor(m / 60)} h ${m % 60}`;
};

export default function AdminOrders() {
  const { ready, orders, setStatus, markLinkSent, resetOrder, config } = useStore();
  const live = config.settings.whatsapp.enabled;
  const [busy, setBusy] = useState<string | null>(null);

  // Link mode (no WhatsApp API): each step opens the shop phone's WhatsApp with the customer's message
  // already written. Steps go in order, and a step's message opens only once the server accepted the
  // step, so nothing is skipped or sent twice. The tab is opened inside the click (popup blockers) and
  // pointed at WhatsApp afterwards.
  // Meta mode: the server sends the messages, the button only moves the order.
  const move = async (o: Order, to: OrderStatus) => {
    if (busy) return;
    setBusy(o.id);
    try {
      const r = await setStatus(o.id, to);
      if (r && !r.changed) alert(`${o.id} est déjà « ${t.status[r.order.status]} ».`);
    } catch {
      alert("Erreur réseau : réessayez.");
    } finally {
      setBusy(null);
    }
  };

  // Link mode: every step is a real link to WhatsApp. Phones only open the WhatsApp app from a link
  // the finger actually taps (opening it from code after a save leaves an empty tab and sends
  // nothing), so the tap opens WhatsApp and the step is saved alongside. Cancelling a confirm box
  // stops the link.
  const onStep = (e: React.MouseEvent, o: Order, to: OrderStatus) => {
    if (busy) return e.preventDefault();
    if (o.status === "new" && to === "confirmed" && !o.linkSent?.includes("new")) {
      if (!confirm(`Le client n'a pas encore reçu le message de la commande (étape 1).\n\nConfirmer ${o.id} et lui envoyer seulement la confirmation ?`)) return e.preventDefault();
    }
    if (to === "cancelled" && !confirm(`Annuler ${o.id} et prévenir le client ?`)) return e.preventDefault();
    setBusy(o.id);
    setStatus(o.id, to, true)
      .then((r) => {
        if (r && !r.changed) alert(`${o.id} était déjà « ${t.status[r.order.status]} » : n'envoyez pas ce message, le client l'a déjà reçu.`);
      })
      .catch(() => alert("Erreur réseau : l'étape n'a pas été enregistrée. Envoyez le message puis réessayez."))
      .finally(() => setBusy(null));
  };

  // Step 1 of link mode: the order details and the address question.
  const onSendOrder = (e: React.MouseEvent, o: Order) => {
    if (o.linkSent?.includes("new") && !confirm(`Le message de la commande ${o.id} a déjà été envoyé. L'envoyer une deuxième fois ?`)) return e.preventDefault();
    markLinkSent(o.id, "new");
  };

  const onResend = (e: React.MouseEvent, o: Order) => {
    if (!confirm(`Ce message (« ${t.status[o.status]} ») a déjà été envoyé à ${o.customer.name}. Le renvoyer ?`)) e.preventDefault();
  };

  const restart = async (o: Order) => {
    if (!confirm(`Remettre ${o.id} à l'étape 1 ?\n\nLa commande redevient « ${t.status.new} » et tous ses messages pourront être envoyés à nouveau.`)) return;
    const r = await resetOrder(o.id);
    if (!r) alert("Erreur : la commande n'a pas été remise à l'étape 1.");
  };

  const cityName = useCityName();
  const [filter, setFilter] = useState<OrderStatus | "all">("all");
  const [sort, setSort] = useState<"recent" | "old" | "name" | "id">("recent");
  const [open, setOpen] = useState<string | null>(null);
  const [chat, setChat] = useState<Order | null>(null);
  const [editing, setEditing] = useState<string | null>(null);

  if (!ready) return null;
  const today = new Date().toDateString();
  const todays = orders.filter((o) => new Date(o.createdAt).toDateString() === today);
  const toCollect = orders.filter((o) => o.status === "confirmed" || o.status === "shipping" || o.status === "new").reduce((a, o) => a + o.total, 0);
  const collected = orders.filter((o) => o.status === "delivered" && new Date(o.history.at(-1)!.at).toDateString() === today).reduce((a, o) => a + o.total, 0);
  const list = orders
    .filter((o) => filter === "all" || o.status === filter)
    .sort((a, b) =>
      sort === "old" ? a.createdAt.localeCompare(b.createdAt) : sort === "name" ? a.customer.name.localeCompare(b.customer.name, "fr", { sensitivity: "base" }) : sort === "id" ? a.id.localeCompare(b.id) : b.createdAt.localeCompare(a.createdAt),
    );
  const liveChat = chat && orders.find((o) => o.id === chat.id);
  const editingOrder = editing ? orders.find((o) => o.id === editing) : undefined;

  return (
    <div>
      <h1 className="text-2xl font-extrabold">Commandes</h1>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["Commandes du jour", String(todays.length)],
          ["À confirmer", String(orders.filter((o) => o.status === "new").length)],
          ["Cash à encaisser", formatDh(toCollect)],
          ["Encaissé aujourd'hui", formatDh(collected)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-line bg-white p-4">
            <p className="text-xs font-semibold text-muted">{label}</p>
            <p className="mt-1 text-2xl font-extrabold text-navy-900">{value}</p>
          </div>
        ))}
      </div>

      <div className="-mx-4 mt-6 flex gap-2 overflow-x-auto px-4 pb-2">
        {(["all", "new", "confirmed", "shipping", "delivered", "cancelled"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-semibold ${filter === s ? "border-navy-900 bg-navy-900 text-white" : "border-line bg-white"}`}
          >
            {s === "all" ? "Toutes" : t.status[s]} <span className="opacity-60">{s === "all" ? orders.length : orders.filter((o) => o.status === s).length}</span>
          </button>
        ))}
      </div>
      <div className="mt-2 flex justify-end">
        <label className="flex items-center gap-2 text-sm text-muted">
          Trier par
          <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="rounded-lg border border-line bg-white px-2 py-1.5 text-sm font-semibold text-ink">
            <option value="recent">Plus récentes</option>
            <option value="old">Plus anciennes</option>
            <option value="name">Client (A → Z)</option>
            <option value="id">N° de commande</option>
          </select>
        </label>
      </div>

      <ul className="mt-3 space-y-3">
        {list.map((o) => {
          const action = nextAction[o.status];
          const isOpen = open === o.id;
          return (
            <li key={o.id} className="overflow-hidden rounded-2xl border border-line bg-white">
              <button onClick={() => setOpen(isOpen ? null : o.id)} className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 p-4 text-start">
                <span className="font-mono text-sm font-bold">{o.id}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${badge[o.status]}`}>{t.status[o.status]}</span>
                {(o.edits?.length ?? 0) > 0 && <span className="rounded-full bg-sun-400/30 px-2 py-0.5 text-xs font-bold text-warn">✏️ Modifiée</span>}
                <span className="min-w-0 flex-1 truncate text-sm">
                  {o.customer.name} · {cityName(o.customer.city) || "Ville à confirmer"}{o.customer.district && `, ${o.customer.district}`}
                </span>
                <span className="text-xs text-muted">{ago(o.createdAt)}</span>
                <span className="font-extrabold text-navy-900">{formatDh(o.total)}</span>
              </button>
              {isOpen && (
                <div className="grid gap-4 border-t border-line bg-paper/60 p-4 md:grid-cols-2">
                  <div className="text-sm">
                    <p className="font-semibold">📞 <a href={`tel:${o.customer.phone}`} className="underline">{o.customer.phone}</a></p>
                    <p className="mt-1">
                      🏠 {o.customer.address ? `${o.customer.address}, ${o.customer.district}, ` : ""}
                      {cityName(o.customer.city) || "Ville à confirmer"}
                      {!o.customer.address && !o.addressReply && <span className="text-warn"> · adresse attendue sur WhatsApp</span>}
                    </p>
                    {o.addressReply?.via === "location" && (
                      <a href={mapsUrl(o.addressReply.lat, o.addressReply.lng)} target="_blank" rel="noreferrer" className="mt-1 inline-block font-semibold text-sky-700 underline">
                        📍 Position WhatsApp · ouvrir dans Maps
                      </a>
                    )}
                    {o.addressReply?.via === "text" && <p className="mt-1">✏️ Adresse écrite sur WhatsApp : {o.addressReply.text}</p>}
                    {o.customer.landmark && <p className="mt-1 text-muted">Repère : {o.customer.landmark}</p>}
                    {o.customer.note && <p className="mt-1 text-muted">📝 {o.customer.note}</p>}
                    <ul className="mt-3 space-y-1">
                      {sortedLines(o).map((l) => (
                        <li key={`${l.productId}-${l.mode}`} className="flex justify-between gap-2">
                          <span>{l.qty} × {l.name} {l.mode === "lot" ? `(lot ${l.unitsPerLine})` : ""}</span>
                          <span className="font-semibold">{formatDh(l.price)}</span>
                        </li>
                      ))}
                      <li className="flex justify-between border-t border-line pt-1 text-muted"><span>Livraison</span><span>{o.delivery ? formatDh(o.delivery) : "Gratuite"}</span></li>
                      {Math.abs(o.total - (o.subtotal + o.delivery)) > 0.001 && (
                        <li className="flex justify-between text-muted"><span>Ajustement</span><span>{formatDh(Math.round((o.total - o.subtotal - o.delivery) * 100) / 100)}</span></li>
                      )}
                      <li className="flex justify-between font-bold"><span>Total</span><span>{formatDh(o.total)}</span></li>
                    </ul>
                    <OrderEdits order={o} />
                  </div>
                  <div className="flex flex-col gap-2">
                    {!live && o.status === "new" && waUrl(o.customer.phone, "") &&
                      (o.linkSent?.includes("new") ? (
                        <p className="rounded-xl bg-ok/10 px-4 py-3 text-sm font-semibold text-ok">
                          ✓ Étape 1 faite : commande envoyée au client.{" "}
                          <a href={waUrl(o.customer.phone, statusMessage(o, "new", config))!} target="_blank" rel="noopener noreferrer" onClick={(e) => onSendOrder(e, o)} className="font-normal underline">
                            Renvoyer
                          </a>
                        </p>
                      ) : (
                        <a
                          href={waUrl(o.customer.phone, statusMessage(o, "new", config))!}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => onSendOrder(e, o)}
                          className="rounded-xl bg-wa px-4 py-3 text-center text-sm font-bold text-white"
                        >
                          1 · Envoyer la commande au client (détails, total, adresse)
                        </a>
                      ))}
                    {action &&
                      (live || !waUrl(o.customer.phone, "") ? (
                        <button onClick={() => move(o, action.to)} disabled={busy === o.id} className="rounded-xl bg-navy-900 px-4 py-3 text-sm font-bold text-white disabled:opacity-50">
                          {busy === o.id ? "…" : action.label}
                        </button>
                      ) : (
                        <a
                          href={waUrl(o.customer.phone, statusMessage(o, action.to, config))!}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => onStep(e, o, action.to)}
                          aria-disabled={busy === o.id}
                          className={`rounded-xl px-4 py-3 text-center text-sm font-bold text-white ${busy === o.id ? "pointer-events-none opacity-50" : ""} ${o.status === "new" && !o.linkSent?.includes("new") ? "bg-navy-900/40" : "bg-navy-900"}`}
                        >
                          {busy === o.id ? "…" : o.status === "new" ? `2 · ${action.label}` : action.label}
                        </a>
                      ))}
                    {live && <button onClick={() => setChat(o)} className="rounded-xl bg-wa px-4 py-3 text-sm font-bold text-white">💬 Voir la conversation WhatsApp</button>}
                    {!live && (
                      <p className="text-xs text-muted">
                        Chaque étape ouvre WhatsApp avec le message pour le client déjà écrit, dans sa langue : appuyez sur Envoyer, une seule fois.
                        {o.status !== "new" && o.linkSent?.includes(o.status) && waUrl(o.customer.phone, "") && (
                          <>
                            {" "}
                            <a href={waUrl(o.customer.phone, statusMessage(o, o.status, config))!} target="_blank" rel="noopener noreferrer" onClick={(e) => onResend(e, o)} className="font-semibold underline">
                              Renvoyer le dernier message
                            </a>
                          </>
                        )}
                      </p>
                    )}
                    {o.status !== "delivered" && o.status !== "cancelled" &&
                      (live || !waUrl(o.customer.phone, "") ? (
                        <button onClick={() => confirm(`Annuler ${o.id} ?`) && move(o, "cancelled")} className="rounded-xl border border-danger/40 px-4 py-2.5 text-sm font-semibold text-danger">
                          Annuler la commande
                        </button>
                      ) : (
                        <a
                          href={waUrl(o.customer.phone, statusMessage(o, "cancelled", config))!}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => onStep(e, o, "cancelled")}
                          className="rounded-xl border border-danger/40 px-4 py-2.5 text-center text-sm font-semibold text-danger"
                        >
                          Annuler la commande
                        </a>
                      ))}
                    {editable(o) && (
                      <button onClick={() => setEditing(o.id)} className="rounded-xl border border-navy-900/30 bg-white px-4 py-2.5 text-sm font-semibold text-navy-900">
                        ✏️ Modifier la commande (produits, quantités, montant)
                      </button>
                    )}
                    {(o.status !== "new" || (o.linkSent?.length ?? 0) > 0) && (
                      <button onClick={() => restart(o)} className="self-start text-xs font-semibold text-muted underline">
                        ↺ Remettre à l&apos;étape 1
                      </button>
                    )}
                    <ol className="mt-2 space-y-1 text-xs text-muted">
                      {o.history.map((h) => (
                        <li key={h.status + h.at}>{new Date(h.at).toLocaleTimeString("fr-MA", { hour: "2-digit", minute: "2-digit" })} · {t.status[h.status]}</li>
                      ))}
                    </ol>
                  </div>
                </div>
              )}
            </li>
          );
        })}
        {list.length === 0 && <li className="py-10 text-center text-muted">Aucune commande.</li>}
      </ul>

      {editingOrder && <EditOrder key={editingOrder.id} order={editingOrder} onClose={() => setEditing(null)} />}

      {liveChat && (
        <div className="fixed inset-0 z-40 overflow-y-auto bg-ink/60 p-4" onClick={() => setChat(null)}>
          <div className="mx-auto max-w-5xl rounded-3xl bg-paper p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-extrabold">Conversation {liveChat.id}</h2>
              <button onClick={() => setChat(null)} className="rounded-full bg-white px-3 py-1.5 text-sm font-semibold">✕ Fermer</button>
            </div>
            <OrderChats order={liveChat} initial="seller" />
          </div>
        </div>
      )}
    </div>
  );
}
