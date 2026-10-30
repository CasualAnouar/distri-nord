import { productById } from "@/data/products";
import type { Customer, Mode, Order, OrderStatus } from "./shop";

// A few orders so the seller dashboard is not empty on first open. Times are relative to now.
const seeds: { id: string; minsAgo: number; status: OrderStatus; customer: Customer; lines: [string, Mode, number][] }[] = [
  {
    id: "DN-4821",
    minsAgo: 12,
    status: "new",
    customer: { name: "Hanae El Amrani", phone: "0661234567", city: "rabat", district: "Yacoub El Mansour", address: "Rue 12, n° 8", landmark: "En face de la pharmacie Al Amal", note: "" },
    lines: [["monster-green", "lot", 1], ["chips", "unit", 6]],
  },
  {
    id: "DN-4817",
    minsAgo: 48,
    status: "confirmed",
    customer: { name: "Épicerie Nour", phone: "0677889900", city: "sale", district: "Tabriquet", address: "Av. Moulay Ismail, n° 54", landmark: "À côté de la mosquée", note: "Livrer avant 17h" },
    lines: [["coca-can", "lot", 2], ["sidi-ali-15", "lot", 4], ["merendina", "lot", 1]],
  },
  {
    id: "DN-4809",
    minsAgo: 95,
    status: "shipping",
    customer: { name: "Mohamed Alaoui", phone: "0612345678", city: "rabat", district: "Hay Riad", address: "Résidence Bahr, imm. 3, apt 12", landmark: "", note: "" },
    lines: [["redbull", "unit", 12], ["the-vert", "unit", 2]],
  },
  {
    id: "DN-4795",
    minsAgo: 210,
    status: "delivered",
    customer: { name: "Café Al Bahia", phone: "0700112233", city: "temara", district: "Massira", address: "Bd Mohammed V, local 7", landmark: "Près du marché", note: "" },
    lines: [["oulmes", "lot", 3], ["jus-orange", "lot", 2], ["sucre", "unit", 4]],
  },
];

const fees: Record<string, number> = { rabat: 0, sale: 10, temara: 10 };

export function sampleOrders(): Order[] {
  const now = Date.now();
  return seeds.map((s) => {
    const createdAt = new Date(now - s.minsAgo * 60_000).toISOString();
    const lines = s.lines.map(([id, mode, qty]) => {
      const p = productById.get(id)!;
      return { productId: id, mode, qty, name: p.name, size: p.size, unitsPerLine: mode === "lot" ? p.lot.qty : 1, price: (mode === "lot" ? p.lot.price : p.unitPrice) * qty };
    });
    const subtotal = lines.reduce((a, l) => a + l.price, 0);
    const delivery = subtotal >= 200 ? 0 : (fees[s.customer.city] ?? 0);
    const steps = ["new", "confirmed", "shipping", "delivered"] as OrderStatus[];
    const history = steps.slice(0, steps.indexOf(s.status) + 1).map((status, i) => ({ status, at: new Date(now - (s.minsAgo - i * 8) * 60_000).toISOString() }));
    return { id: s.id, createdAt, locale: "fr", lines, subtotal, delivery, total: subtotal + delivery, customer: s.customer, status: s.status, history };
  });
}
