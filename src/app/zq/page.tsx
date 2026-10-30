"use client";

import { useState } from "react";
import { useCityName, useStore } from "@/lib/store";
import { formatDh, mapsUrl, type Order, type OrderStatus } from "@/lib/shop";
import { dicts } from "@/i18n/dict";
import { OrderChats } from "@/components/OrderChats";

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
  const { ready, orders, setStatus } = useStore();
  const cityName = useCityName();
  const [filter, setFilter] = useState<OrderStatus | "all">("all");
  const [open, setOpen] = useState<string | null>(null);
  const [chat, setChat] = useState<Order | null>(null);

  if (!ready) return null;
  const today = new Date().toDateString();
  const todays = orders.filter((o) => new Date(o.createdAt).toDateString() === today);
  const toCollect = orders.filter((o) => o.status === "confirmed" || o.status === "shipping" || o.status === "new").reduce((a, o) => a + o.total, 0);
  const collected = orders.filter((o) => o.status === "delivered" && new Date(o.history.at(-1)!.at).toDateString() === today).reduce((a, o) => a + o.total, 0);
  const list = orders.filter((o) => filter === "all" || o.status === filter);
  const liveChat = chat && orders.find((o) => o.id === chat.id);

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

      <ul className="mt-3 space-y-3">
        {list.map((o) => {
          const action = nextAction[o.status];
          const isOpen = open === o.id;
          return (
            <li key={o.id} className="overflow-hidden rounded-2xl border border-line bg-white">
              <button onClick={() => setOpen(isOpen ? null : o.id)} className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 p-4 text-start">
                <span className="font-mono text-sm font-bold">{o.id}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${badge[o.status]}`}>{t.status[o.status]}</span>
                <span className="min-w-0 flex-1 truncate text-sm">
                  {o.customer.name} · {cityName(o.customer.city)}{o.customer.district && `, ${o.customer.district}`}
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
                      {cityName(o.customer.city)}
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
                      {o.lines.map((l) => (
                        <li key={`${l.productId}-${l.mode}`} className="flex justify-between gap-2">
                          <span>{l.qty} × {l.name} {l.mode === "lot" ? `(lot ${l.unitsPerLine})` : ""}</span>
                          <span className="font-semibold">{formatDh(l.price)}</span>
                        </li>
                      ))}
                      <li className="flex justify-between border-t border-line pt-1 text-muted"><span>Livraison</span><span>{o.delivery ? formatDh(o.delivery) : "Gratuite"}</span></li>
                    </ul>
                  </div>
                  <div className="flex flex-col gap-2">
                    {action && (
                      <button onClick={() => setStatus(o.id, action.to)} className="rounded-xl bg-navy-900 px-4 py-3 text-sm font-bold text-white">
                        {action.label}
                      </button>
                    )}
                    <button onClick={() => setChat(o)} className="rounded-xl bg-wa px-4 py-3 text-sm font-bold text-white">💬 Voir la conversation WhatsApp</button>
                    {o.status !== "delivered" && o.status !== "cancelled" && (
                      <button onClick={() => confirm(`Annuler ${o.id} ?`) && setStatus(o.id, "cancelled")} className="rounded-xl border border-danger/40 px-4 py-2.5 text-sm font-semibold text-danger">
                        Annuler la commande
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
