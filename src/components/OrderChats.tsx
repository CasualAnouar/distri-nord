"use client";

import { useState } from "react";
import { useLocale } from "@/i18n/locale";
import { useStore } from "@/lib/store";
import { conversation, type ChatView } from "@/lib/whatsapp";
import type { Order } from "@/lib/shop";
import { WhatsAppPhone } from "./WhatsAppPhone";

// Buyer and seller phones side by side on desktop, tabs on mobile.
export function OrderChats({ order, initial = "buyer" }: { order: Order; initial?: ChatView }) {
  const { locale, t } = useLocale();
  const { setStatus } = useStore();
  const [view, setView] = useState<ChatView>(initial);
  const dir = locale === "ar" ? "rtl" : "ltr";

  const phone = (v: ChatView) => (
    <WhatsAppPhone
      title={v === "buyer" ? "Distri Nord" : locale === "ar" ? "ديستري نور · البائع" : "Distri Nord · Vendeur"}
      subtitle={v === "buyer" ? (locale === "ar" ? "حساب تجاري" : "Compte professionnel") : locale === "ar" ? "إشعارات الطلبات" : "Alertes commandes"}
      messages={conversation(order, v, locale)}
      onButton={(b) => b.next && setStatus(order.id, b.next)}
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
      <p className="mx-auto mt-4 max-w-md text-center text-xs text-muted">{t.demoNote}</p>
    </div>
  );
}
