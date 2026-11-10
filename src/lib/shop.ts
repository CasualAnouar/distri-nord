import type { Product } from "@/data/products";
import type { Box } from "@/data/boxes";
import type { City } from "./config";

// "unit" and "box" are retail lines; "lot" lines come from the wholesale shop (/gros).
export type Mode = "unit" | "lot" | "box";
export type Channel = "detail" | "gros";

// For "box" lines, productId is the box id.
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

export type OrderLine = CartLine & { name: string; size: string; unitsPerLine: number; price: number; items?: Box["items"] };

export type Order = {
  id: string;
  createdAt: string;
  locale: "fr" | "ar";
  channel?: Channel;
  lines: OrderLine[];
  subtotal: number;
  delivery: number;
  total: number;
  customer: Customer;
  status: OrderStatus;
  history: { status: OrderStatus; at: string }[];
  addressReply?: AddressReply;
};

// How the buyer answered the address question on WhatsApp.
export type AddressReply = { via: "button" } | { via: "text"; text: string } | { via: "location"; lat: number; lng: number };

export const mapsUrl = (lat: number, lng: number) => `https://maps.google.com/?q=${lat},${lng}`;

export type Lookup = { product: (id: string) => Product | undefined; box: (id: string) => Box | undefined };

export function linePrice(p: Product, mode: Mode, qty: number) {
  return (mode === "lot" ? p.lot.price : p.unitPrice) * qty;
}

export function unitsFor(p: Product, mode: Mode, qty: number) {
  return (mode === "lot" ? p.lot.qty : 1) * qty;
}

export function lotSaving(p: Product) {
  const full = p.unitPrice * p.lot.qty;
  return Math.round(((full - p.lot.price) / full) * 100);
}

/** Price of one cart line, or null when its product or box no longer exists. */
export function priceOf(l: CartLine, lookup: Lookup): number | null {
  if (l.mode === "box") {
    const b = lookup.box(l.productId);
    return b ? b.price * l.qty : null;
  }
  const p = lookup.product(l.productId);
  return p ? linePrice(p, l.mode, l.qty) : null;
}

/** Pieces of each product a set of lines takes from stock (boxes are expanded). */
export function stockUsage(lines: CartLine[], lookup: Lookup) {
  const used = new Map<string, number>();
  const take = (id: string, n: number) => used.set(id, (used.get(id) ?? 0) + n);
  for (const l of lines) {
    if (l.mode === "box") {
      for (const it of lookup.box(l.productId)?.items ?? []) take(it.productId, it.qty * l.qty);
    } else {
      const p = lookup.product(l.productId);
      if (p) take(p.id, unitsFor(p, l.mode, l.qty));
    }
  }
  return used;
}

// --- Boxes -----------------------------------------------------------------------------------

/** What the box contents cost bought piece by piece, and at the wholesale (lot) price per piece. */
export function boxValue(box: Pick<Box, "items">, product: Lookup["product"]) {
  let retail = 0;
  let wholesale = 0;
  for (const it of box.items) {
    const p = product(it.productId);
    if (!p) continue;
    retail += p.unitPrice * it.qty;
    wholesale += (p.lot.qty > 0 ? p.lot.price / p.lot.qty : p.unitPrice) * it.qty;
  }
  return { retail: +retail.toFixed(2), wholesale: +wholesale.toFixed(2) };
}

/** How many of this box the current stock can fill. */
export function boxAvailable(box: Box, product: Lookup["product"]) {
  if (box.items.length === 0) return 0;
  return Math.min(...box.items.map((it) => Math.floor((product(it.productId)?.stock ?? 0) / Math.max(1, it.qty))));
}

// Prices end in 4 or 9 (89, 94, 139…), the usual shelf endings.
const down49 = (x: number) => Math.floor((x + 1) / 5) * 5 - 1;
const up49 = (x: number) => Math.ceil((x + 1) / 5) * 5 - 1;

/**
 * Suggested box prices. A box should feel cheaper than buying the pieces one by one, without
 * going under the wholesale price per piece (or the wholesale shop would become the worse deal).
 * discount is the share taken off the piece-by-piece value.
 */
export function suggestBoxPrices(value: { retail: number; wholesale: number }) {
  const at = (discount: number) => {
    if (value.retail <= 0) return 0;
    let p = down49(value.retail * (1 - discount));
    if (p < value.wholesale) p = up49(value.wholesale);
    return Math.min(p, Math.max(1, Math.floor(value.retail) - 1));
  };
  return { light: at(0.05), recommended: at(0.08), aggressive: at(0.15) };
}

// --- Cart --------------------------------------------------------------------------------------

/** A cart with any lot line is a wholesale order and uses the wholesale minimum. */
export function channelOf(lines: CartLine[]): Channel {
  return lines.some((l) => l.mode === "lot") ? "gros" : "detail";
}

export function cartTotals(
  lines: CartLine[],
  lookup: Lookup,
  opts: { cities: City[]; minCart: number; wholesaleMinCart: number; cityId?: string },
) {
  let subtotal = 0;
  let count = 0;
  for (const l of lines) {
    const price = priceOf(l, lookup);
    if (price === null) continue;
    subtotal += price;
    count += l.qty;
  }
  const channel = channelOf(lines);
  // The retail minimum always applies; the wholesale one can only raise it.
  const min = channel === "gros" ? Math.max(opts.minCart, opts.wholesaleMinCart) : opts.minCart;
  const city = opts.cities.find((c) => c.id === opts.cityId);
  const delivery = !city || subtotal >= city.freeFrom ? 0 : city.fee;
  return { subtotal, count, delivery, total: subtotal + delivery, channel, min, missing: Math.max(0, min - subtotal) };
}

export function formatDh(n: number, locale: "fr" | "ar" = "fr") {
  const v = new Intl.NumberFormat(locale === "ar" ? "ar-MA" : "fr-MA", { maximumFractionDigits: 2 }).format(n);
  return locale === "ar" ? `${v} درهم` : `${v} DH`;
}

// Accepts 06/07 numbers with or without +212 / 00212.
export function normalizePhone(raw: string) {
  const d = raw.replace(/\D/g, "").replace(/^00/, "");
  const local = d.startsWith("212") ? `0${d.slice(3)}` : d;
  return /^0[67]\d{8}$/.test(local) ? local : null;
}
