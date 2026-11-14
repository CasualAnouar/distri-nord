import type { Product } from "@/data/products";
import type { City } from "./config";

export type Mode = "unit" | "lot";

export type CartLine = { productId: string; mode: Mode; qty: number };

export type OrderStatus = "new" | "confirmed" | "shipping" | "delivered" | "cancelled";

export const statusFlow: OrderStatus[] = ["new", "confirmed", "shipping", "delivered"];

export type Customer = {
  name: string;
  phone: string;
  city: string;
  district: string;
  address: string;
  landmark: string;
  note: string;
};

export type OrderLine = CartLine & { name: string; size: string; unitsPerLine: number; price: number };

/** One line of an order edit: how many lots or pieces of a product before and after. */
export type OrderEditChange = { productId: string; name: string; mode: Mode; unitsPerLine: number; from: number; to: number };

/** A change the seller made to an order after it was placed (e.g. the customer changed it at the door). */
export type OrderEdit = {
  at: string;
  status: OrderStatus; // order status when it was edited
  note: string;
  changes: OrderEditChange[];
  delivery?: { from: number; to: number };
  total: { from: number; to: number };
};

export type Order = {
  id: string;
  createdAt: string;
  locale: "fr" | "ar";
  // Lines and amounts are always the final ones, after any edit: this is what sales figures count.
  // `total` is the cash to collect (or collected); after an edit it may differ from subtotal + delivery.
  lines: OrderLine[];
  subtotal: number;
  delivery: number;
  total: number;
  customer: Customer;
  status: OrderStatus;
  history: { status: OrderStatus; at: string }[];
  addressReply?: AddressReply;
  // Statuses whose WhatsApp message the shop opened from the dashboard (link mode).
  linkSent?: OrderStatus[];
  // Real WhatsApp messages for this order (written by the server only).
  waLog?: WaLogEntry[];
  // History only: the order as the customer placed it (saved at the first edit) and each edit.
  original?: { lines: OrderLine[]; subtotal: number; delivery: number; total: number };
  edits?: OrderEdit[];
};

/** Statuses at which the seller can still edit an order (a cancelled order is closed). */
export const editable = (o: Order) => o.status !== "cancelled";

/** What the seller sends to edit an order: the final lines, delivery fee and amount to collect. */
export type OrderEditInput = {
  lines: { productId: string; mode: Mode; qty: number }[];
  delivery: number;
  total: number;
  note: string;
  /** Number of edits the seller saw, so two phones editing at once cannot overwrite each other. */
  seen: number;
};

export type EditOrderResult = { ok: true; order: Order; changed: boolean } | { ok: false; error: "notFound" | "closed" | "stale" | "empty"; order?: Order };

/** Price of one lot or one piece on an order line, as it was sold. */
export const lineUnitPrice = (l: OrderLine) => (l.qty > 0 ? l.price / l.qty : 0);

/** Units taken out of stock by a set of lines, per product. */
export function unitsByProduct(lines: { productId: string; unitsPerLine: number; qty: number }[]) {
  const m = new Map<string, number>();
  for (const l of lines) m.set(l.productId, (m.get(l.productId) ?? 0) + l.unitsPerLine * l.qty);
  return m;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Builds the edited order lines and the list of changes. Lines already on the order keep the price
 * they were sold at; new lines take the current catalogue price. Lines with quantity 0 are dropped.
 */
export function applyLineEdits(
  current: OrderLine[],
  wanted: { productId: string; mode: Mode; qty: number }[],
  product: (id: string) => Product | undefined,
): { lines: OrderLine[]; changes: OrderEditChange[] } {
  const key = (l: { productId: string; mode: Mode }) => `${l.productId}|${l.mode}`;
  const want = new Map<string, number>();
  for (const w of wanted) want.set(key(w), (want.get(key(w)) ?? 0) + w.qty);
  const lines: OrderLine[] = [];
  const changes: OrderEditChange[] = [];
  const seen = new Set<string>();
  for (const l of current) {
    const k = key(l);
    if (seen.has(k)) continue;
    seen.add(k);
    const qty = want.get(k) ?? 0;
    if (qty !== l.qty) changes.push({ productId: l.productId, name: l.name, mode: l.mode, unitsPerLine: l.unitsPerLine, from: l.qty, to: qty });
    if (qty > 0) lines.push({ ...l, qty, price: round2(lineUnitPrice(l) * qty) });
  }
  for (const [k, qty] of want) {
    if (seen.has(k) || qty <= 0) continue;
    const [productId, mode] = k.split("|") as [string, Mode];
    const p = product(productId);
    if (!p) throw new Error(`Unknown product ${productId}`);
    const unitsPerLine = mode === "lot" ? p.lot.qty : 1;
    lines.push({ productId, mode, qty, name: p.name, size: p.size, unitsPerLine, price: round2(linePrice(p, mode, qty)) });
    changes.push({ productId, name: p.name, mode, unitsPerLine, from: 0, to: qty });
  }
  return { lines, changes };
}

export const linesSubtotal = (lines: OrderLine[]) => round2(lines.reduce((a, l) => a + l.price, 0));

// One WhatsApp message sent or received about an order. "out" = sent by the shop's number.
// Order lines sorted by product name, A to Z (dashboard and WhatsApp messages).
export const sortedLines = (o: Order) => [...o.lines].sort((a, b) => a.name.localeCompare(b.name, "fr", { sensitivity: "base" }));

// Allowed status changes: each step in order, cancel until delivered.
export const NEXT_STATUS: Record<OrderStatus, OrderStatus[]> = {
  new: ["confirmed", "cancelled"],
  confirmed: ["shipping", "cancelled"],
  shipping: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

export type WaLogEntry = {
  at: string;
  party: "buyer" | "seller";
  dir: "out" | "in";
  text: string;
  location?: { lat: number; lng: number };
  wamid?: string;
  error?: string;
};

// How the buyer answered the address question on WhatsApp.
export type AddressReply = { via: "button" } | { via: "text"; text: string } | { via: "location"; lat: number; lng: number };

export const mapsUrl = (lat: number, lng: number) => `https://maps.google.com/?q=${lat},${lng}`;

export function linePrice(p: Product, mode: Mode, qty: number) {
  return (mode === "lot" ? p.lot.price : p.unitPrice) * qty;
}

export function unitsFor(p: Product, mode: Mode, qty: number) {
  return (mode === "lot" ? p.lot.qty : 1) * qty;
}

export function lotSaving(p: Product) {
  const full = p.unitPrice * p.lot.qty;
  if (p.lotOnly || full <= 0) return 0;
  return Math.round(((full - p.lot.price) / full) * 100);
}

export function cartTotals(lines: CartLine[], lookup: (id: string) => Product | undefined, opts: { cities: City[]; minCart: number; cityId?: string }) {
  let subtotal = 0;
  let count = 0;
  for (const l of lines) {
    const p = lookup(l.productId);
    if (!p) continue;
    subtotal += linePrice(p, l.mode, l.qty);
    count += l.qty;
  }
  const city = opts.cities.find((c) => c.id === opts.cityId);
  const delivery = !city || subtotal >= city.freeFrom ? 0 : city.fee;
  return { subtotal, count, delivery, total: subtotal + delivery, missing: Math.max(0, opts.minCart - subtotal) };
}

export function formatDh(n: number, locale: "fr" | "ar" = "fr") {
  const v = new Intl.NumberFormat(locale === "ar" ? "ar-MA" : "fr-MA", { maximumFractionDigits: 2 }).format(n);
  return locale === "ar" ? `${v} درهم` : `${v} DH`;
}

// WhatsApp id (international digits, no +) for a Moroccan number: 0608252328 -> 212608252328.
export function waId(raw: string) {
  const local = normalizePhone(raw);
  return local ? `212${local.slice(1)}` : null;
}

// Accepts 06/07 numbers with or without +212 / 00212.
export function normalizePhone(raw: string) {
  const d = raw.replace(/\D/g, "").replace(/^00/, "");
  const local = d.startsWith("212") ? `0${d.slice(3)}` : d;
  return /^0[67]\d{8}$/.test(local) ? local : null;
}

/** An amount the dashboard can store (price, stock, lot size): a real number from 0 up to 10 million. */
export const validAmount = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n) && n >= 0 && n < 10_000_000;

/** The amounts of a product (or a change to one) that are not storable, by field name. */
export function badAmounts(p: Partial<Product>): string[] {
  const bad: string[] = [];
  if (p.unitPrice !== undefined && !validAmount(p.unitPrice)) bad.push("unitPrice");
  if (p.stock !== undefined && !validAmount(p.stock)) bad.push("stock");
  if (p.lot !== undefined && !(validAmount(p.lot?.price) && validAmount(p.lot?.qty))) bad.push("lot");
  if (p.position !== undefined && !validAmount(p.position)) bad.push("position");
  return bad;
}
