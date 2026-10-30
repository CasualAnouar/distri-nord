import { cities, formatDh, type Order, type OrderStatus } from "./shop";

// Scripted WhatsApp conversations for the demo. In production these are WhatsApp Business
// template messages sent by the server on each status change, and the buttons are quick replies.

export type ChatView = "buyer" | "seller";
export type ChatButton = { label: string; next?: OrderStatus };
export type ChatMessage = { id: string; from: "them" | "me"; text: string; at: string; buttons?: ChatButton[] };

const reached = (o: Order, s: OrderStatus) => o.history.find((h) => h.status === s)?.at;

export function conversation(o: Order, view: ChatView, locale: "fr" | "ar"): ChatMessage[] {
  const ar = locale === "ar";
  const dh = (n: number) => formatDh(n, locale);
  const city = cities.find((c) => c.id === o.customer.city)?.[locale] ?? o.customer.city;
  const first = o.customer.name.split(" ")[0];
  const items = o.lines.map((l) => `• ${l.qty} × ${l.name}${l.mode === "lot" ? (ar ? ` (علبة ${l.unitsPerLine})` : ` (lot ${l.unitsPerLine})`) : ""}`).join("\n");
  const addr = `${o.customer.address}, ${o.customer.district}, ${city}${o.customer.landmark ? `\n📍 ${o.customer.landmark}` : ""}`;
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
      text: ar ? `المرجو تأكيد عنوان التوصيل:\n\n${addr}` : `Merci de confirmer votre adresse de livraison :\n\n${addr}`,
      buttons:
        o.status === "new"
          ? [{ label: ar ? "✅ تأكيد" : "✅ Confirmer", next: "confirmed" }, { label: ar ? "✏️ تعديل" : "✏️ Modifier" }, { label: ar ? "📍 إرسال موقعي" : "📍 Envoyer ma position" }]
          : undefined,
    });
    if (confirmedAt) {
      push({ from: "me", at: confirmedAt, text: ar ? "✅ تأكيد" : "✅ Confirmer" });
      push({
        from: "them",
        at: confirmedAt,
        text: ar ? "شكراً! تم تأكيد طلبك ✅\nالتوصيل متوقع اليوم بين 14:00 و 18:00." : "Merci ! Votre commande est confirmée ✅\nLivraison prévue aujourd'hui entre 14h et 18h.",
      });
    }
    if (shippingAt) {
      push({
        from: "them",
        at: shippingAt,
        text: ar
          ? `🚚 طلبك في الطريق!\nالموصل: *${o.driver}* · 06 00 00 00 00\nجهّز *${dh(o.total)}* نقداً من فضلك.`
          : `🚚 Votre commande est en route !\nLivreur : *${o.driver}* · 06 00 00 00 00\nMerci de préparer *${dh(o.total)}* en espèces.`,
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
    push({
      from: "them",
      at: confirmedAt,
      text: ar ? `✅ الزبون أكّد عنوانه للطلب ${o.id}.` : `✅ Le client a confirmé son adresse pour ${o.id}.`,
      buttons: o.status === "confirmed" ? [{ label: ar ? "🚚 إطلاق التوصيل" : "🚚 Lancer la livraison", next: "shipping" }, { label: ar ? "❌ إلغاء" : "❌ Annuler", next: "cancelled" }] : undefined,
    });
  }
  if (shippingAt) {
    push({ from: "me", at: shippingAt, text: ar ? "🚚 إطلاق التوصيل" : "🚚 Lancer la livraison" });
    push({
      from: "them",
      at: shippingAt,
      text: ar ? `تم إسناد الطلب إلى *${o.driver}* وإخبار الزبون 👍` : `Commande confiée à *${o.driver}*, le client est prévenu 👍`,
      buttons: o.status === "shipping" ? [{ label: ar ? "📦 تم التسليم" : "📦 Marquer livrée", next: "delivered" }] : undefined,
    });
  }
  if (deliveredAt) {
    push({ from: "me", at: deliveredAt, text: ar ? "📦 تم التسليم" : "📦 Marquer livrée" });
    push({ from: "them", at: deliveredAt, text: ar ? `💰 تم تسليم ${o.id}. المبلغ المحصّل: *${dh(o.total)}*.` : `💰 ${o.id} livrée. Montant encaissé : *${dh(o.total)}*.` });
  }
  if (cancelledAt) push({ from: "them", at: cancelledAt, text: ar ? `❌ تم إلغاء ${o.id} وإخبار الزبون.` : `❌ ${o.id} annulée, le client est prévenu.` });
  return msgs;
}
