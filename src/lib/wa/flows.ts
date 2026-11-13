import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { adminConfigured, adminDb } from "@/lib/firebase-admin";
import { READ_ONLY } from "@/lib/server/read-only";
import { defaultSettings, type City, type Settings } from "@/lib/config";
import { formatDh, mapsUrl, normalizePhone, waId, type AddressReply, type Order, type OrderStatus, type WaLogEntry } from "@/lib/shop";
import { WaError, cloudConfigured, markRead, sendButtons, sendLocation, sendLocationRequest, sendTemplate, sendText } from "./cloud";
import { renderTemplate, type TemplateKey, type TemplateLang } from "./templates";

// The automated WhatsApp conversations, run on the server:
// - syncOrderToWhatsApp(orderId) sends whatever the order's current status calls for, once.
// - handleWebhook(body) reads buyer and seller replies (buttons, location pin, typed address)
//   and moves the order forward.
// Each message is logged on the order (orders/{id}.waLog) so the dashboard shows the real chat.

type WaState = { sent?: Record<string, string>; awaitingAddress?: boolean };
type StoredOrder = Order & { waState?: WaState };
type Party = "buyer" | "seller";

const WINDOW_MS = 23.5 * 3600 * 1000; // Meta's customer service window is 24 h
const RECENT_MS = 24 * 3600 * 1000; // never notify about status changes older than this

export function whatsappReady() {
  return cloudConfigured() && adminConfigured();
}

async function loadSettings(db: Firestore): Promise<Settings> {
  const snap = await db.collection("settings").doc("global").get();
  const s = (snap.data() ?? {}) as Partial<Settings>;
  return { ...defaultSettings, ...s, whatsapp: { ...defaultSettings.whatsapp, ...s.whatsapp } };
}

async function cityName(db: Firestore, id: string, lang: TemplateLang) {
  const snap = await db.collection("cities").doc(id).get();
  return (snap.data() as City | undefined)?.[lang] ?? id;
}

async function inWindow(db: Firestore, wa: string) {
  const snap = await db.collection("wa_contacts").doc(wa).get();
  const at = snap.data()?.lastInboundAt as string | undefined;
  return Boolean(at && Date.now() - new Date(at).getTime() < WINDOW_MS);
}

async function log(db: Firestore, orderId: string, entry: WaLogEntry) {
  const clean = Object.fromEntries(Object.entries(entry).filter(([, v]) => v !== undefined));
  await db.collection("orders").doc(orderId).update({ waLog: FieldValue.arrayUnion(clean) });
  if (entry.wamid && entry.dir === "out") await db.collection("wa_messages").doc(entry.wamid).set({ orderId, party: entry.party, at: entry.at });
}

// Sends one message, logs it on the order, and never throws (a failed WhatsApp message must
// not break the order flow).
async function deliver(db: Firestore, orderId: string, party: Party, text: string, run: () => Promise<string>, location?: { lat: number; lng: number }) {
  const at = new Date().toISOString();
  try {
    const wamid = await run();
    await log(db, orderId, { at, party, dir: "out", text, location, wamid });
    return wamid;
  } catch (e) {
    const msg = e instanceof WaError ? `${e.message}${e.code ? ` (${e.code})` : ""}` : String(e);
    console.warn(`WhatsApp send failed for ${orderId}/${party}:`, msg);
    await log(db, orderId, { at, party, dir: "out", text, location, error: msg }).catch(() => undefined);
    return "";
  }
}

// ---- Texts ----

const items = (o: Order, lang: TemplateLang) =>
  o.lines.map((l) => `${l.qty} × ${l.name}${l.mode === "lot" ? (lang === "ar" ? ` (علبة ${l.unitsPerLine})` : ` (lot ${l.unitsPerLine})`) : l.mode === "box" ? (lang === "ar" ? " (بوكس)" : " (box)") : ""}`).join(", ");

async function addressText(db: Firestore, o: Order, lang: TemplateLang) {
  const city = await cityName(db, o.customer.city, lang);
  const r = o.addressReply;
  if (r?.via === "location") return `${mapsUrl(r.lat, r.lng)} (${city})`;
  if (r?.via === "text") return `${r.text} (${city})`;
  if (o.customer.address.trim()) return [o.customer.address, o.customer.district, city].filter(Boolean).join(", ") + (o.customer.landmark ? ` · ${o.customer.landmark}` : "");
  return lang === "ar" ? `${city}، أرسل لنا موقعك 📍 أو اكتب عنوانك هنا` : `${city}, à nous envoyer ici (position 📍 ou message)`;
}

const say = {
  askLocation: { fr: "Envoyez-nous votre position 📍 avec le bouton ci-dessous, ou écrivez votre adresse complète dans un message (rue, numéro, quartier, repère).", ar: "أرسل لنا موقعك 📍 بالزر أسفله، أو اكتب عنوانك الكامل في رسالة (الزنقة، الرقم، الحي، علامة قريبة)." },
  gotLocation: { fr: "📍 Position bien reçue, merci !", ar: "📍 توصلنا بموقعك، شكراً!" },
  gotText: { fr: "✏️ Adresse bien reçue, merci !", ar: "✏️ توصلنا بعنوانك، شكراً!" },
  confirmed: (w: string) => ({ fr: `Votre commande est confirmée ✅\nLivraison prévue ${w}.`, ar: `تم تأكيد طلبك ✅\nالتوصيل متوقع ${w}.` }),
  already: (id: string, s: OrderStatus) => ({
    fr: `La commande ${id} est déjà ${{ new: "en attente", confirmed: "confirmée", shipping: "en route", delivered: "livrée", cancelled: "annulée" }[s]}.`,
    ar: `الطلب ${id} ${{ new: "في الانتظار", confirmed: "مؤكد", shipping: "في الطريق", delivered: "تم تسليمه", cancelled: "ملغى" }[s]} بالفعل.`,
  }),
  pending: (id: string, addr: string) => ({ fr: `Votre commande *${id}* attend la confirmation de l'adresse :\n${addr}`, ar: `طلبك *${id}* في انتظار تأكيد العنوان:\n${addr}` }),
  thanks: { fr: "Merci pour votre message, nous vous répondons rapidement 🙏", ar: "شكراً على رسالتك، سنجيبك قريباً 🙏" },
  noOrder: (store: string, url: string) => ({ fr: `Bonjour 👋 Ici ${store}. Pour commander : ${url}`, ar: `مرحباً 👋 معك ${store}. للطلب: ${url}` }),
  btnConfirm: { fr: "Confirmer l'adresse", ar: "تأكيد العنوان" },
  btnChange: { fr: "Changer l'adresse", ar: "تغيير العنوان" },
};

// ---- Outgoing: one notification set per status, sent once ----

export async function syncOrderToWhatsApp(orderId: string): Promise<{ sent: string[]; skipped?: string }> {
  if (READ_ONLY) return { sent: [], skipped: "preview" };
  if (!whatsappReady()) return { sent: [], skipped: "not configured" };
  const db = adminDb();
  const settings = await loadSettings(db);
  if (!settings.whatsapp.enabled) return { sent: [], skipped: "disabled" };
  const ref = db.collection("orders").doc(orderId);

  // Claim what is due inside a transaction so two calls never send twice.
  const claimed = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return null;
    const o = snap.data() as StoredOrder;
    const sent = o.waState?.sent ?? {};
    const recent = o.history.filter((h) => Date.now() - new Date(h.at).getTime() < RECENT_MS).map((h) => h.status);
    let due: OrderStatus[] = [...new Set(recent)];
    if (o.status === "cancelled") due = sent.new ? ["cancelled"] : []; // nothing to cancel if the buyer was never told
    due = due.filter((s) => !sent[s]);
    if (!due.length) return { order: o, due };
    const now = new Date().toISOString();
    tx.update(ref, Object.fromEntries(due.map((s) => [`waState.sent.${s}`, now])));
    return { order: o, due };
  });
  if (!claimed) return { sent: [], skipped: "order not found" };

  for (const status of claimed.due) await notify(db, claimed.order, status, settings);
  return { sent: claimed.due };
}

async function notify(db: Firestore, o: Order, status: OrderStatus, settings: Settings) {
  const lang: TemplateLang = o.locale === "ar" ? "ar" : "fr";
  const buyer = waId(o.customer.phone);
  const seller = settings.whatsapp.sellerAlerts ? waId(settings.sellerPhone) : null;
  const store = settings.storeName[lang];
  const total = formatDh(o.total, lang);
  const totalFr = formatDh(o.total, "fr");

  const template = async (party: Party, to: string, key: TemplateKey, l: TemplateLang, params: string[]) =>
    deliver(db, o.id, party, renderTemplate(key, l, params), () => sendTemplate(to, key, l, params, o.id));
  const text = async (party: Party, to: string, body: string) => deliver(db, o.id, party, body, () => sendText(to, body));

  if (status === "new") {
    const addr = await addressText(db, o, lang);
    if (buyer) await template("buyer", buyer, "order_received", lang, [o.customer.name.split(" ")[0] || o.customer.name, o.id, store, items(o, lang), total, addr]);
    if (seller) await template("seller", seller, "seller_new", "fr", [o.id, o.customer.name, o.customer.phone, await addressText(db, o, "fr"), items(o, "fr"), totalFr]);
    return;
  }

  if (status === "confirmed") {
    if (buyer) {
      if (await inWindow(db, buyer)) {
        const r = o.addressReply;
        const head = r?.via === "location" ? `${say.gotLocation[lang]}\n` : r?.via === "text" ? `${say.gotText[lang]}\n` : "";
        await text("buyer", buyer, head + say.confirmed(settings.deliveryWindow[lang])[lang]);
      } else await template("buyer", buyer, "order_confirmed", lang, [o.id, settings.deliveryWindow[lang], total]);
    }
    if (seller) {
      await template("seller", seller, "seller_confirmed", "fr", [o.id, await addressText(db, o, "fr"), totalFr]);
      const r = o.addressReply;
      if (r?.via === "location" && (await inWindow(db, seller)))
        await deliver(db, o.id, "seller", `📍 ${o.customer.name}`, () => sendLocation(seller, r.lat, r.lng, `${o.id} · ${o.customer.name}`), { lat: r.lat, lng: r.lng });
    }
    return;
  }

  if (status === "shipping") {
    if (buyer) await template("buyer", buyer, "order_shipping", lang, [o.id, settings.sellerPhone, total]);
    if (seller && (await inWindow(db, seller))) {
      const body = `🚚 ${o.id} en route vers ${o.customer.name} (${o.customer.phone}). Le client est prévenu.\nÀ encaisser : *${totalFr}*`;
      await deliver(db, o.id, "seller", body, () => sendButtons(seller, body, [{ id: `s_deliver:${o.id}`, title: "Marquer livrée" }]));
    }
    return;
  }

  if (status === "delivered") {
    if (buyer) await template("buyer", buyer, "order_delivered", lang, [o.id, store]);
    if (seller && (await inWindow(db, seller))) await text("seller", seller, `💰 ${o.id} livrée. Montant encaissé : *${totalFr}*.`);
    return;
  }

  if (status === "cancelled") {
    if (buyer) await template("buyer", buyer, "order_cancelled", lang, [o.id]);
    if (seller && (await inWindow(db, seller))) await text("seller", seller, `❌ ${o.id} annulée, le client est prévenu.`);
  }
}

// ---- Status changes made from WhatsApp ----

const allowed: Record<OrderStatus, OrderStatus[]> = {
  new: ["confirmed", "cancelled"],
  confirmed: ["shipping", "cancelled"],
  shipping: ["delivered"],
  delivered: [],
  cancelled: [],
};

async function moveOrder(db: Firestore, orderId: string, to: OrderStatus, reply?: AddressReply): Promise<{ ok: true } | { ok: false; status: OrderStatus } | null> {
  const ref = db.collection("orders").doc(orderId);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return null;
    const o = snap.data() as StoredOrder;
    if (!allowed[o.status].includes(to)) return { ok: false as const, status: o.status };
    tx.update(ref, {
      status: to,
      history: [...o.history, { status: to, at: new Date().toISOString() }],
      ...(reply ? { addressReply: reply } : {}),
      "waState.awaitingAddress": false,
    });
    return { ok: true as const };
  });
}

// ---- Incoming webhook ----

type InMessage = {
  id: string;
  from: string;
  timestamp?: string;
  type: string;
  text?: { body: string };
  button?: { payload?: string; text?: string };
  interactive?: { button_reply?: { id: string; title: string }; list_reply?: { id: string; title: string } };
  location?: { latitude: number; longitude: number; name?: string; address?: string };
};
type InStatus = { id: string; status: string; errors?: { code?: number; title?: string; message?: string; error_data?: { details?: string } }[] };
type WebhookBody = { entry?: { changes?: { value?: { messages?: InMessage[]; statuses?: InStatus[] } }[] }[] };

export async function handleWebhook(body: WebhookBody, siteUrl: string) {
  if (READ_ONLY || !whatsappReady()) return;
  const db = adminDb();
  const settings = await loadSettings(db);
  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const st of change.value?.statuses ?? []) await onStatus(db, st);
      for (const msg of change.value?.messages ?? []) {
        // Meta retries deliveries: handle each message id once.
        const fresh = await db
          .collection("wa_inbound")
          .doc(msg.id)
          .create({ at: new Date().toISOString(), from: msg.from })
          .then(() => true)
          .catch(() => false);
        if (!fresh) continue;
        await db.collection("wa_contacts").doc(msg.from).set({ lastInboundAt: new Date().toISOString() }, { merge: true });
        void markRead(msg.id);
        try {
          await onMessage(db, msg, settings, siteUrl);
        } catch (e) {
          console.warn("WhatsApp inbound handling failed:", e);
        }
      }
    }
  }
}

async function onStatus(db: Firestore, st: InStatus) {
  if (st.status !== "failed") return;
  const link = (await db.collection("wa_messages").doc(st.id).get()).data() as { orderId: string; party: Party } | undefined;
  if (!link) return;
  const err = st.errors?.[0];
  const reason = err?.error_data?.details || err?.message || err?.title || "échec";
  await log(db, link.orderId, { at: new Date().toISOString(), party: link.party, dir: "out", text: "⚠️ Message non délivré", error: `${reason}${err?.code ? ` (${err.code})` : ""}` });
}

function inboundText(msg: InMessage) {
  if (msg.type === "text") return msg.text?.body ?? "";
  if (msg.type === "button") return msg.button?.text ?? "";
  if (msg.type === "interactive") return msg.interactive?.button_reply?.title ?? msg.interactive?.list_reply?.title ?? "";
  if (msg.type === "location") return [msg.location?.name, msg.location?.address].filter(Boolean).join(" · ");
  return `[${msg.type}]`;
}

async function openOrderFor(db: Firestore, wa: string): Promise<StoredOrder | null> {
  const local = normalizePhone(wa);
  if (!local) return null;
  const snap = await db.collection("orders").where("customer.phone", "==", local).get();
  const orders = snap.docs.map((d) => d.data() as StoredOrder).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return orders.find((o) => o.status === "new") ?? null;
}

async function onMessage(db: Firestore, msg: InMessage, settings: Settings, siteUrl: string) {
  const from = msg.from;
  const payload = msg.type === "button" ? msg.button?.payload : msg.type === "interactive" ? (msg.interactive?.button_reply?.id ?? msg.interactive?.list_reply?.id) : undefined;
  const [action, orderId] = payload?.includes(":") ? [payload.slice(0, payload.indexOf(":")), payload.slice(payload.indexOf(":") + 1)] : [undefined, undefined];
  const isSeller = from === waId(settings.sellerPhone);
  const location = msg.type === "location" && msg.location ? { lat: msg.location.latitude, lng: msg.location.longitude } : undefined;
  const inLog = (id: string, party: Party) => log(db, id, { at: new Date().toISOString(), party, dir: "in", text: inboundText(msg), location });

  // Seller buttons.
  if (action?.startsWith("s_") && isSeller && orderId) {
    const to = ({ s_confirm: "confirmed", s_cancel: "cancelled", s_ship: "shipping", s_deliver: "delivered" } as Record<string, OrderStatus>)[action];
    if (!to) return;
    await inLog(orderId, "seller").catch(() => undefined);
    const r = await moveOrder(db, orderId, to);
    if (!r) return void (await sendText(from, `Commande ${orderId} introuvable.`).catch(() => undefined));
    if (!r.ok) return void (await deliver(db, orderId, "seller", say.already(orderId, r.status).fr, () => sendText(from, say.already(orderId, r.status).fr)));
    await syncOrderToWhatsApp(orderId);
    return;
  }

  // Buyer: the order named by the button, or the buyer's latest order awaiting an address.
  let order: StoredOrder | null = null;
  if (orderId && (action === "confirm" || action === "change")) {
    const snap = await db.collection("orders").doc(orderId).get();
    const o = snap.data() as StoredOrder | undefined;
    if (o && waId(o.customer.phone) === from) order = o;
  }
  order ??= await openOrderFor(db, from);

  if (!order) {
    if (isSeller) {
      const open = await db.collection("orders").where("status", "in", ["new", "confirmed", "shipping"]).get();
      await sendText(from, `👋 Les nouvelles commandes arrivent ici avec leurs boutons.\nCommandes en cours : ${open.size}.`).catch(() => undefined);
      return;
    }
    // A message about an older order, or a general question: thank them and pass it to the seller.
    // Reply in the language they write in (Arabic script), otherwise in their last order's language.
    const writesArabic = /[\u0600-\u06FF]/.test(inboundText(msg));
    const seller = settings.whatsapp.sellerAlerts ? waId(settings.sellerPhone) : null;
    const known = await db.collection("orders").where("customer.phone", "==", normalizePhone(from) ?? "-").get();
    const last = known.docs.map((d) => d.data() as Order).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    const l: TemplateLang = writesArabic || last?.locale === "ar" ? "ar" : "fr";
    if (last) {
      await inLog(last.id, "buyer");
      await deliver(db, last.id, "buyer", say.thanks[l], () => sendText(from, say.thanks[l]));
      if (seller && (await inWindow(db, seller))) {
        const body = `💬 Message de ${last.customer.name} (${last.customer.phone}) à propos de ${last.id} :\n${inboundText(msg)}`;
        await deliver(db, last.id, "seller", body, () => sendText(seller, body));
      }
    } else {
      await sendText(from, say.noOrder(settings.storeName[l], siteUrl)[l]).catch(() => undefined);
    }
    return;
  }

  const lang: TemplateLang = order.locale === "ar" ? "ar" : "fr";
  const reply = (body: string) => deliver(db, order.id, "buyer", body, () => sendText(from, body));
  await inLog(order.id, "buyer");

  if (order.status !== "new") {
    if (action === "confirm" || action === "change") await reply(say.already(order.id, order.status)[lang]);
    return;
  }

  const hasAddress = Boolean(order.customer.address.trim());
  const askLocation = async () => {
    await db.collection("orders").doc(order.id).update({ "waState.awaitingAddress": true });
    await deliver(db, order.id, "buyer", say.askLocation[lang], () => sendLocationRequest(from, say.askLocation[lang]));
  };

  let confirmWith: AddressReply | null = null;
  if (action === "confirm") {
    if (hasAddress) confirmWith = { via: "button" };
    else return void (await askLocation());
  } else if (action === "change") {
    return void (await askLocation());
  } else if (location) {
    confirmWith = { via: "location", lat: location.lat, lng: location.lng };
  } else if (msg.type === "text" && msg.text?.body.trim()) {
    if (order.waState?.awaitingAddress || !hasAddress) confirmWith = { via: "text", text: msg.text.body.trim().slice(0, 500) };
    else {
      // Not clearly an address: show the address on file again with the two choices.
      const body = say.pending(order.id, await addressText(db, order, lang))[lang];
      await deliver(db, order.id, "buyer", body, () =>
        sendButtons(from, body, [
          { id: `confirm:${order.id}`, title: say.btnConfirm[lang] },
          { id: `change:${order.id}`, title: say.btnChange[lang] },
        ]),
      );
      return;
    }
  } else return;

  const moved = await moveOrder(db, order.id, "confirmed", confirmWith);
  if (moved?.ok) await syncOrderToWhatsApp(order.id);
}
