import type { Config } from "./config";
import { formatDh, waId, type Order, type OrderStatus } from "./shop";

// WhatsApp without the Meta API: wa.me links that open the shop phone's WhatsApp with the message for
// the customer already written, in the language the order was placed in. The customer does nothing.

export function waUrl(phone: string, text: string) {
  const id = waId(phone);
  return id ? `https://wa.me/${id}?text=${encodeURIComponent(text)}` : null;
}

type L = "fr" | "ar";
const lang = (o: Order): L => (o.locale === "ar" ? "ar" : "fr");

const items = (o: Order, l: L) =>
  o.lines.map((x) => `• ${x.qty} × ${x.name}${x.mode === "lot" ? (l === "ar" ? ` (علبة ${x.unitsPerLine})` : ` (lot ${x.unitsPerLine})`) : ""}`).join("\n");

const cityOf = (o: Order, config: Config, l: L) => config.cities.find((c) => c.id === o.customer.city)?.[l] ?? o.customer.city;

// Full address, or "" when the buyer skipped the street at checkout (they share it on WhatsApp).
function address(o: Order, config: Config, l: L) {
  if (!o.customer.address?.trim()) return "";
  const city = cityOf(o, config, l);
  const parts = [o.customer.address, o.customer.district, city].filter((x) => x?.trim());
  const landmark = o.customer.landmark ? ` (${o.customer.landmark})` : "";
  return parts.length ? parts.join(", ") + landmark : "";
}

// Seller → buyer: the message that goes with each status.
export function statusMessage(o: Order, status: OrderStatus, config: Config) {
  const l = lang(o);
  const { settings } = config;
  const store = settings.storeName[l];
  const total = formatDh(o.total, l);
  const first = o.customer.name.split(" ")[0] || o.customer.name;
  const addr = address(o, config, l);
  if (l === "ar") {
    switch (status) {
      case "new":
        return addr
          ? `السلام عليكم ${first} 👋\nشكراً على طلبك *${o.id}* من ${store}.\n${items(o, "ar")}\nالمبلغ عند الاستلام: *${total}*\n\nهل هذا هو العنوان الصحيح؟\n${addr}\nيمكنك أيضاً إرسال موقعك 📍.`
          : `السلام عليكم ${first} 👋\nشكراً على طلبك *${o.id}* من ${store}.\n${items(o, "ar")}\nالمبلغ عند الاستلام: *${total}*\n\nأرسل لنا موقعك 📍 أو اكتب عنوانك من فضلك.`;
      case "confirmed":
        return `تم تأكيد طلبك *${o.id}* ✅\nالتوصيل متوقع ${settings.deliveryWindow.ar}.\nالمبلغ عند الاستلام: *${total}*.`;
      case "shipping":
        return `طلبك *${o.id}* في الطريق 🚚\nجهّز *${total}* نقداً من فضلك.`;
      case "delivered":
        return `تم تسليم طلبك *${o.id}* 📦\nشكراً على ثقتك، نراك قريباً في ${store}.`;
      case "cancelled":
        return `تم إلغاء طلبك *${o.id}*.\nلأي سؤال، أجبنا هنا.`;
    }
  }
  switch (status) {
    case "new":
      return addr
        ? `Salam ${first} 👋\nMerci pour votre commande *${o.id}* chez ${store}.\n${items(o, "fr")}\nÀ payer à la livraison : *${total}*\n\nEst-ce bien la bonne adresse ?\n${addr}\nVous pouvez aussi nous envoyer votre position 📍.`
        : `Salam ${first} 👋\nMerci pour votre commande *${o.id}* chez ${store}.\n${items(o, "fr")}\nÀ payer à la livraison : *${total}*\n\nEnvoyez-nous votre position 📍 ou écrivez votre adresse, s'il vous plaît.`;
    case "confirmed":
      return `Votre commande *${o.id}* est confirmée ✅\nLivraison prévue ${settings.deliveryWindow.fr}.\nÀ payer à la livraison : *${total}*.`;
    case "shipping":
      return `Votre commande *${o.id}* est en route 🚚\nMerci de préparer *${total}* en espèces.`;
    case "delivered":
      return `Votre commande *${o.id}* a été livrée 📦\nMerci de votre confiance, à bientôt chez ${store}.`;
    case "cancelled":
      return `Votre commande *${o.id}* a été annulée.\nUne question ? Répondez simplement à ce message.`;
  }
}
