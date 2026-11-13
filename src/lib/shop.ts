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

export type Order = {
  id: string;
  createdAt: string;
  locale: "fr" | "ar";
  lines: (CartLine & { name: string; size: string; unitsPerLine: number; price: number })[];
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
};

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
