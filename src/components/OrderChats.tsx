"use client";

import { useState } from "react";
import { useLocale } from "@/i18n/locale";
import { useStore } from "@/lib/store";
import { conversation, type ChatButton, type ChatView } from "@/lib/whatsapp";
import type { Order, WaLogEntry } from "@/lib/shop";
import type { ChatMessage } from "@/lib/whatsapp";
import { WhatsAppPhone } from "./WhatsAppPhone";

// Real messages sent and received on WhatsApp, as one side of the chat sees them.
function liveMessages(log: WaLogEntry[] | undefined, view: ChatView, label: string): ChatMessage[] {
  return (log ?? [])
    .filter((m) => m.party === view)
    .map((m, i) => ({
      id: `${view}-live-${i}`,
      from: m.dir === "out" ? "them" : "me",
      at: m.at,
      text: m.error ? `${m.text}\n⚠️ ${m.error}` : m.text,
      location: m.location ? { ...m.location, label } : undefined,
    }));
}

// Buyer and seller phones side by side on desktop, tabs on mobile. With WhatsApp switched on in
// the dashboard they show the real conversation; otherwise the scripted demo.
export function OrderChats({ order, initial = "buyer" }: { order: Order; initial?: ChatView }) {
  const { locale, t } = useLocale();
  const { setStatus, confirmAddress, config } = useStore();
  const cities = config.cities;
  const [view, setView] = useState<ChatView>(initial);
  const [writing, setWriting] = useState(false);
  const ar = locale === "ar";
  const live = config.settings.whatsapp.enabled;

  // Demo stand-in for WhatsApp's location share: a pin near the chosen city's centre.
  const sharePosition = () => {
    const c = cities.find((x) => x.id === order.customer.city) ?? cities[0];
    const jitter = () => (Math.random() - 0.5) * 0.02;
    confirmAddress(order.id, { via: "location", lat: +(c.lat + jitter()).toFixed(5), lng: +(c.lng + jitter()).toFixed(5) });
  };

  const onButton = (v: ChatView) => (b: ChatButton) => {
    const a = b.action;
    if (!a) return;
    if (a.kind === "status") setStatus(order.id, a.to);
    else if (a.kind === "confirm") confirmAddress(order.id, { via: "button" });
    else if (a.kind === "location") sharePosition();
    else if (a.kind === "write" && v === "buyer") setWriting(true);
  };
  const dir = locale === "ar" ? "rtl" : "ltr";

  const phone = (v: ChatView) => (
    <WhatsAppPhone
      title={v === "buyer" ? config.settings.storeName[locale] : `${config.settings.storeName[locale]} · ${locale === "ar" ? "البائع" : "Vendeur"}`}
      subtitle={v === "buyer" ? (locale === "ar" ? "حساب تجاري" : "Compte professionnel") : locale === "ar" ? "إشعارات الطلبات" : "Alertes commandes"}
      messages={live ? liveMessages(order.waLog, v, order.customer.name) : conversation(order, v, locale, config)}
      onButton={live ? () => undefined : onButton(v)}
      composer={
        !live && v === "buyer" && writing && order.status === "new"
          ? {
              placeholder: ar ? "مثال: زنقة 5، رقم 21، قرب الحمام" : "Ex : Rue 5, n° 21, à côté du hammam",
              onSend: (text) => {
                setWriting(false);
                confirmAddress(order.id, { via: "text", text });
              },
              onCancel: () => setWriting(false),
            }
          : undefined
      }
      dir={dir}
    />
  );

  return (
    <div>
      <div className="mx-auto mb-4 grid max-w-xs grid-cols-2 rounded-xl bg-white p-1 text-sm font-semibold shadow-sm lg:hidden">
        {(["buyer", "seller"] as ChatView[]).map((v) => (
          <button key={v} onClick={() => setView(v)} className={`rounded-lg py-2 ${view === v ? "bg-wa-dark text-white" : "text-muted"}`}>
            {v === "buyer" ? `📱 ${t.buyerView}` : `🏪 ${t.sellerView}`}
          </button>
        ))}
      </div>
      <div className="lg:hidden">{phone(view)}</div>
      <div className="hidden grid-cols-2 gap-10 lg:grid">
        {(["buyer", "seller"] as ChatView[]).map((v) => (
          <div key={v}>
            <p className="mb-3 text-center text-sm font-bold text-muted">{v === "buyer" ? `📱 ${t.buyerView}` : `🏪 ${t.sellerView}`}</p>
            {phone(v)}
          </div>
        ))}
      </div>
      <p className="mx-auto mt-4 max-w-md text-center text-xs text-muted">{live ? (order.waLog?.length ? t.liveNote : t.waSending) : t.demoNote}</p>
    </div>
  );
}
