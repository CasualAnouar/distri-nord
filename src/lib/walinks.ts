import type { Config } from "./config";
import { formatDh, sortedLines, waId, type Order, type OrderStatus } from "./shop";

// WhatsApp without the Meta API: wa.me links that open the shop phone's WhatsApp with the message for
// the customer already written, in the language the order was placed in. The customer does nothing.

// Emojis came out as "�" in prefilled links, so they are left out until a test confirms they survive.
const plain = (text: string) =>
  text
    .replace(/[ \t]*[\p{Extended_Pictographic}\u{1F3FB}-\u{1F3FF}\uFE0F\u200D]+/gu, "")
    .replace(/•/g, "-")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

export function waUrl(phone: string, text: string) {
  const id = waId(phone);
  return id ? `https://api.whatsapp.com/send?phone=${id}&text=${encodeURIComponent(plain(text))}` : null;
}

type L = "fr" | "ar";
const lang = (o: Order): L => (o.locale === "ar" ? "ar" : "fr");

// One line per product, A to Z: quantity, name, lot size and line price; then delivery and total.
function details(o: Order, l: L) {
  const lines = sortedLines(o).map(
    (x) => `• ${x.qty} × ${x.name}${x.mode === "lot" ? (l === "ar" ? ` (علبة ${x.unitsPerLine})` : ` (lot ${x.unitsPerLine})`) : ""} : ${formatDh(x.price, l)}`,
  );
  const delivery = l === "ar" ? `التوصيل: ${o.delivery ? formatDh(o.delivery, l) : "مجاني"}` : `Livraison : ${o.delivery ? formatDh(o.delivery, l) : "gratuite"}`;
  const total = l === "ar" ? `المبلغ عند الاستلام: *${formatDh(o.total, l)}*` : `À payer à la livraison : *${formatDh(o.total, l)}*`;
  return [...lines, delivery, total].join("\n");
}

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
          ? `السلام عليكم ${first} 👋\nشكراً على طلبك *${o.id}* من ${store}.\n\n${details(o, "ar")}\n\nهل هذا هو العنوان الصحيح؟\n${addr}\nيمكنك أيضاً إرسال موقعك 📍.`
          : `السلام عليكم ${first} 👋\nشكراً على طلبك *${o.id}* من ${store}.\n\n${details(o, "ar")}\n\nأرسل لنا موقعك 📍 أو اكتب عنوانك من فضلك.`;
      case "confirmed":
        return `تم تأكيد طلبك *${o.id}* ✅\nالتوصيل متوقع ${settings.deliveryWindow.ar}.\n\n${details(o, "ar")}`;
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
        ? `Salam ${first} 👋\nMerci pour votre commande *${o.id}* chez ${store}.\n\n${details(o, "fr")}\n\nEst-ce bien la bonne adresse ?\n${addr}\nVous pouvez aussi nous envoyer votre position 📍.`
        : `Salam ${first} 👋\nMerci pour votre commande *${o.id}* chez ${store}.\n\n${details(o, "fr")}\n\nEnvoyez-nous votre position 📍 ou écrivez votre adresse, s'il vous plaît.`;
    case "confirmed":
      return `Votre commande *${o.id}* est confirmée ✅\nLivraison prévue ${settings.deliveryWindow.fr}.\n\n${details(o, "fr")}`;
    case "shipping":
      return `Votre commande *${o.id}* est en route 🚚\nMerci de préparer *${total}* en espèces.`;
    case "delivered":
      return `Votre commande *${o.id}* a été livrée 📦\nMerci de votre confiance, à bientôt chez ${store}.`;
    case "cancelled":
      return `Votre commande *${o.id}* a été annulée.\nUne question ? Répondez simplement à ce message.`;
  }
}
