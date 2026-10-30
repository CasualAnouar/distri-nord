import { cities, formatDh, SELLER_PHONE, type Order, type OrderStatus } from "./shop";

// Scripted WhatsApp conversations for the demo. In production these are WhatsApp Business
// template messages sent by the server on each status change, and the buttons are quick replies.

export type ChatView = "buyer" | "seller";
export type ChatAction = { kind: "status"; to: OrderStatus } | { kind: "confirm" } | { kind: "location" } | { kind: "write" };
export type ChatButton = { label: string; action?: ChatAction };
export type ChatLocation = { lat: number; lng: number; label: string };
export type ChatMessage = { id: string; from: "them" | "me"; text: string; at: string; buttons?: ChatButton[]; location?: ChatLocation };

const reached = (o: Order, s: OrderStatus) => o.history.find((h) => h.status === s)?.at;

export function conversation(o: Order, view: ChatView, locale: "fr" | "ar"): ChatMessage[] {
  const ar = locale === "ar";
  const dh = (n: number) => formatDh(n, locale);
  const city = cities.find((c) => c.id === o.customer.city)?.[locale] ?? o.customer.city;
  const first = o.customer.name.split(" ")[0];
  const items = o.lines.map((l) => `• ${l.qty} × ${l.name}${l.mode === "lot" ? (ar ? ` (علبة ${l.unitsPerLine})` : ` (lot ${l.unitsPerLine})`) : ""}`).join("\n");
  // The address can come from the checkout form, or later from WhatsApp as a pin or a typed message.
  const hasAddress = Boolean(o.customer.address.trim());
  const addr = hasAddress
    ? `${o.customer.address}, ${o.customer.district}, ${city}${o.customer.landmark ? `\n🏁 ${o.customer.landmark}` : ""}`
    : `${city} · ${ar ? "العنوان سيُرسل عبر واتساب" : "adresse à recevoir sur WhatsApp"}`;
  const reply = o.addressReply;
  const pin = reply?.via === "location" ? { lat: reply.lat, lng: reply.lng, label: `${o.customer.name} · ${city}` } : undefined;
  const confirmedAt = reached(o, "confirmed");
  const shippingAt = reached(o, "shipping");
  const deliveredAt = reached(o, "delivered");
  const cancelledAt = reached(o, "cancelled");
  const msgs: ChatMessage[] = [];
  const push = (m: Omit<ChatMessage, "id">) => msgs.push({ ...m, id: `${view}-${msgs.length}` });

  if (view === "buyer") {
    push({
      from: "them",
      at: o.createdAt,
      text: ar
        ? `السلام عليكم ${first} 👋\nشكراً على طلبك *${o.id}* من ديستري نور.\n\n${items}\n\n💵 المبلغ عند الاستلام: *${dh(o.total)}*`
        : `Salam ${first} 👋\nMerci pour votre commande *${o.id}* chez Distri Nord.\n\n${items}\n\n💵 À payer à la livraison : *${dh(o.total)}*`,
    });
    push({
      from: "them",
      at: o.createdAt,
      text: hasAddress
        ? ar
          ? `المرجو تأكيد عنوان التوصيل:\n\n${addr}\n\nأو أرسل لنا موقعك 📍 أو اكتب عنواناً آخر.`
          : `Merci de confirmer votre adresse de livraison :\n\n${addr}\n\nVous pouvez aussi nous envoyer votre position 📍 ou écrire une autre adresse.`
        : ar
          ? `للتوصيل إلى ${city}، أرسل لنا موقعك 📍 أو اكتب عنوانك في رسالة.`
          : `Pour vous livrer à ${city}, envoyez-nous votre position 📍 ou écrivez votre adresse dans un message.`,
      buttons:
        o.status === "new"
          ? [
              ...(hasAddress ? [{ label: ar ? "✅ تأكيد" : "✅ Confirmer", action: { kind: "confirm" } as const }] : []),
              { label: ar ? "📍 إرسال موقعي" : "📍 Envoyer ma position", action: { kind: "location" } },
              { label: hasAddress ? (ar ? "✏️ كتابة عنوان آخر" : "✏️ Écrire une autre adresse") : ar ? "✏️ كتابة عنواني" : "✏️ Écrire mon adresse", action: { kind: "write" } },
            ]
          : undefined,
    });
    if (confirmedAt) {
      if (reply?.via === "location") push({ from: "me", at: confirmedAt, text: "", location: pin });
      else if (reply?.via === "text") push({ from: "me", at: confirmedAt, text: reply.text });
      else push({ from: "me", at: confirmedAt, text: ar ? "✅ تأكيد" : "✅ Confirmer" });
      push({
        from: "them",
        at: confirmedAt,
        text:
          (reply?.via === "location" ? (ar ? "📍 توصلنا بموقعك، شكراً!\n" : "📍 Position bien reçue, merci !\n") : reply?.via === "text" ? (ar ? "✏️ توصلنا بعنوانك، شكراً!\n" : "✏️ Adresse bien reçue, merci !\n") : "") +
          (ar ? "تم تأكيد طلبك ✅\nالتوصيل متوقع اليوم بين 14:00 و 18:00." : "Votre commande est confirmée ✅\nLivraison prévue aujourd'hui entre 14h et 18h."),
      });
    }
    if (shippingAt) {
      push({
        from: "them",
        at: shippingAt,
        text: ar
          ? `🚚 طلبك في الطريق!\nللتواصل: *${SELLER_PHONE}*\nجهّز *${dh(o.total)}* نقداً من فضلك.`
          : `🚚 Votre commande est en route !\nContact : *${SELLER_PHONE}*\nMerci de préparer *${dh(o.total)}* en espèces.`,
      });
    }
    if (deliveredAt) {
      push({
        from: "them",
        at: deliveredAt,
        text: ar ? `📦 تم التسليم. شكراً على ثقتك في ديستري نور!\nكيف كانت تجربتك؟` : `📦 Commande livrée. Merci de votre confiance !\nComment s'est passée votre commande ?`,
        buttons: [{ label: "⭐⭐⭐⭐⭐" }, { label: ar ? "💬 ملاحظة" : "💬 Un souci" }],
      });
    }
    if (cancelledAt) push({ from: "them", at: cancelledAt, text: ar ? "❌ تم إلغاء طلبك. لأي سؤال، أجبنا هنا." : "❌ Votre commande a été annulée. Une question ? Répondez ici." });
    return msgs;
  }

  push({
    from: "them",
    at: o.createdAt,
    text: ar
      ? `🆕 *طلب جديد ${o.id}*\n👤 ${o.customer.name} · ${o.customer.phone}\n📍 ${addr}\n\n${items}\n\n💵 *${dh(o.total)}* عند الاستلام${o.customer.note ? `\n📝 ${o.customer.note}` : ""}\n\n⏳ في انتظار تأكيد العنوان من الزبون…`
      : `🆕 *Nouvelle commande ${o.id}*\n👤 ${o.customer.name} · ${o.customer.phone}\n📍 ${addr}\n\n${items}\n\n💵 *${dh(o.total)}* à encaisser${o.customer.note ? `\n📝 ${o.customer.note}` : ""}\n\n⏳ En attente de la confirmation d'adresse par le client…`,
  });
  if (confirmedAt) {
    const sellerButtons: ChatButton[] | undefined =
      o.status === "confirmed"
        ? [{ label: ar ? "🚚 إطلاق التوصيل" : "🚚 Lancer la livraison", action: { kind: "status", to: "shipping" } }, { label: ar ? "❌ إلغاء" : "❌ Annuler", action: { kind: "status", to: "cancelled" } }]
        : undefined;
    if (reply?.via === "location") {
      push({ from: "them", at: confirmedAt, text: ar ? `📍 الزبون أرسل موقعه للطلب ${o.id}:` : `📍 Le client a envoyé sa position pour ${o.id} :`, location: pin, buttons: sellerButtons });
    } else if (reply?.via === "text") {
      push({ from: "them", at: confirmedAt, text: ar ? `✏️ الزبون كتب عنوانه للطلب ${o.id}:\n\n${reply.text}` : `✏️ Le client a écrit son adresse pour ${o.id} :\n\n${reply.text}`, buttons: sellerButtons });
    } else {
      push({ from: "them", at: confirmedAt, text: ar ? `✅ الزبون أكّد عنوانه للطلب ${o.id}.` : `✅ Le client a confirmé son adresse pour ${o.id}.`, buttons: sellerButtons });
    }
  }
  if (shippingAt) {
    push({ from: "me", at: shippingAt, text: ar ? "🚚 إطلاق التوصيل" : "🚚 Lancer la livraison" });
    push({
      from: "them",
      at: shippingAt,
      text: ar ? `🚚 أنت في الطريق إلى ${o.customer.name}. تم إخبار الزبون 👍` : `🚚 Vous êtes en route vers ${o.customer.name}. Le client est prévenu 👍`,
      buttons: o.status === "shipping" ? [{ label: ar ? "📦 تم التسليم" : "📦 Marquer livrée", action: { kind: "status", to: "delivered" } }] : undefined,
    });
  }
  if (deliveredAt) {
    push({ from: "me", at: deliveredAt, text: ar ? "📦 تم التسليم" : "📦 Marquer livrée" });
    push({ from: "them", at: deliveredAt, text: ar ? `💰 تم تسليم ${o.id}. المبلغ المحصّل: *${dh(o.total)}*.` : `💰 ${o.id} livrée. Montant encaissé : *${dh(o.total)}*.` });
  }
  if (cancelledAt) push({ from: "them", at: cancelledAt, text: ar ? `❌ تم إلغاء ${o.id} وإخبار الزبون.` : `❌ ${o.id} annulée, le client est prévenu.` });
  return msgs;
}
