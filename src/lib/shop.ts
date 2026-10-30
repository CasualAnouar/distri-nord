import type { Product } from "@/data/products";

export const MIN_CART = 100;

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
};

// How the buyer answered the address question on WhatsApp.
export type AddressReply = { via: "button" } | { via: "text"; text: string } | { via: "location"; lat: number; lng: number };

export const mapsUrl = (lat: number, lng: number) => `https://maps.google.com/?q=${lat},${lng}`;

// Delivery zones around the Rabat store. Fees are placeholders.
export const cities: { id: string; fr: string; ar: string; fee: number; freeFrom: number; lat: number; lng: number }[] = [
  { id: "rabat", fr: "Rabat", ar: "الرباط", fee: 0, freeFrom: 0, lat: 34.0209, lng: -6.8416 },
  { id: "sale", fr: "Salé", ar: "سلا", fee: 10, freeFrom: 200, lat: 34.0331, lng: -6.7985 },
  { id: "temara", fr: "Témara", ar: "تمارة", fee: 10, freeFrom: 200, lat: 33.9287, lng: -6.9063 },
  { id: "harhoura", fr: "Harhoura", ar: "الهرهورة", fee: 15, freeFrom: 300, lat: 33.9502, lng: -6.9455 },
  { id: "skhirat", fr: "Skhirat", ar: "الصخيرات", fee: 20, freeFrom: 400, lat: 33.8527, lng: -7.0317 },
  { id: "bouknadel", fr: "Bouknadel", ar: "بوقنادل", fee: 20, freeFrom: 400, lat: 34.1236, lng: -6.7448 },
  { id: "kenitra", fr: "Kénitra", ar: "القنيطرة", fee: 30, freeFrom: 500, lat: 34.261, lng: -6.5802 },
];

// The one seller: Distri Nord takes every order and delivers it. Set the real number on Vercel.
export const SELLER_PHONE = process.env.NEXT_PUBLIC_SELLER_PHONE || "06 00 00 00 00";

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

export function cartTotals(lines: CartLine[], lookup: (id: string) => Product | undefined, cityId?: string) {
  let subtotal = 0;
  let count = 0;
  for (const l of lines) {
    const p = lookup(l.productId);
    if (!p) continue;
    subtotal += linePrice(p, l.mode, l.qty);
    count += l.qty;
  }
  const city = cities.find((c) => c.id === cityId);
  const delivery = !city || subtotal >= city.freeFrom ? 0 : city.fee;
  return { subtotal, count, delivery, total: subtotal + delivery, missing: Math.max(0, MIN_CART - subtotal) };
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
