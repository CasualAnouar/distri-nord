import type { Category, Product } from "@/data/products";
import type { City } from "./config";
import type { Order, OrderStatus } from "./shop";

// Sales figures for the dashboard's "Statistiques" page. Pure functions over the order list.

/** Statuses that count as a sale: the address is confirmed. Cancelled and unconfirmed orders do not count. */
export const SOLD: OrderStatus[] = ["confirmed", "shipping", "delivered"];

// The shop is in Rabat: days start at midnight Morocco time, whatever the phone's clock says.
const TZ = "Africa/Casablanca";
const dayFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });

/** Calendar day of a moment in Morocco, as "2026-11-14". */
export const dayKey = (d: Date | string) => dayFmt.format(typeof d === "string" ? new Date(d) : d);

/** Adds days to a "YYYY-MM-DD" key (calendar arithmetic, no time zone involved). */
export function addDays(key: string, n: number) {
  const d = new Date(`${key}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000);

export type Range = { from: string; to: string }; // inclusive day keys

export type PeriodId = "today" | "yesterday" | "7d" | "30d" | "month" | "lastMonth" | "all" | "custom";

export function periodRange(id: Exclude<PeriodId, "custom">, orders: Order[], now = new Date()): Range {
  const today = dayKey(now);
  const month = today.slice(0, 8);
  switch (id) {
    case "today":
      return { from: today, to: today };
    case "yesterday":
      return { from: addDays(today, -1), to: addDays(today, -1) };
    case "7d":
      return { from: addDays(today, -6), to: today };
    case "30d":
      return { from: addDays(today, -29), to: today };
    case "month":
      return { from: `${month}01`, to: today };
    case "lastMonth": {
      const last = addDays(`${month}01`, -1);
      return { from: `${last.slice(0, 8)}01`, to: last };
    }
    case "all": {
      const first = orders.reduce((m, o) => (o.createdAt < m ? o.createdAt : m), now.toISOString());
      return { from: dayKey(first), to: today };
    }
  }
}

/** The same number of days just before the range, to compare with. */
export function previousRange(r: Range): Range {
  const len = daysBetween(r.from, r.to) + 1;
  return { from: addDays(r.from, -len), to: addDays(r.from, -1) };
}

export const inRange = (o: Order, r: Range) => {
  const k = dayKey(o.createdAt);
  return k >= r.from && k <= r.to;
};

export type Row = { key: string; label: string; icon?: string; revenue: number; orders: number; units: number; lots: number; pieces: number };

export type Stats = {
  sales: number; // what customers pay for sold orders, delivery included
  products: number; // the same without delivery fees
  delivery: number;
  collected: number; // delivered orders: cash already in hand
  pending: number; // confirmed or on the way: cash still to collect
  orders: number;
  units: number;
  basket: number; // average sale
  byStatus: Record<OrderStatus, { orders: number; amount: number }>;
  byProduct: Row[];
  byCategory: Row[];
  byZone: Row[];
  byDay: { key: string; revenue: number; orders: number }[];
};

type Lookups = { products: Product[]; categories: Category[]; cities: City[] };

function bump(map: Map<string, Row>, key: string, init: () => Omit<Row, "revenue" | "orders" | "units" | "lots" | "pieces">) {
  let row = map.get(key);
  if (!row) map.set(key, (row = { ...init(), revenue: 0, orders: 0, units: 0, lots: 0, pieces: 0 }));
  return row;
}

const byRevenue = (a: Row, b: Row) => b.revenue - a.revenue || b.units - a.units || a.label.localeCompare(b.label, "fr");

export function computeStats(all: Order[], range: Range, look: Lookups): Stats {
  const orders = all.filter((o) => inRange(o, range));
  const sold = orders.filter((o) => SOLD.includes(o.status));
  const product = new Map(look.products.map((p) => [p.id, p]));
  const category = new Map(look.categories.map((c) => [c.id, c]));
  const city = new Map(look.cities.map((c) => [c.id, c]));

  const byStatus = Object.fromEntries((["new", "confirmed", "shipping", "delivered", "cancelled"] as const).map((s) => [s, { orders: 0, amount: 0 }])) as Stats["byStatus"];
  for (const o of orders) {
    byStatus[o.status].orders++;
    byStatus[o.status].amount += o.total;
  }

  const prods = new Map<string, Row>();
  const cats = new Map<string, Row>();
  const zones = new Map<string, Row>();
  const days = new Map<string, { revenue: number; orders: number }>();
  let units = 0;

  for (const o of sold) {
    const zone = o.customer.city || "";
    const z = bump(zones, zone, () => ({ key: zone, label: zone ? (city.get(zone)?.fr ?? zone) : "Ville non indiquée" }));
    z.revenue += o.total;
    z.orders++;

    const d = dayKey(o.createdAt);
    const day = days.get(d) ?? { revenue: 0, orders: 0 };
    day.revenue += o.total;
    day.orders++;
    days.set(d, day);

    const catsInOrder = new Set<string>();
    for (const l of o.lines) {
      const p = product.get(l.productId);
      const n = l.unitsPerLine * l.qty;
      units += n;
      const row = bump(prods, l.productId, () => ({ key: l.productId, label: p?.name ?? l.name }));
      row.revenue += l.price;
      row.units += n;
      if (l.mode === "lot") row.lots += l.qty;
      else row.pieces += l.qty;

      // A product deleted since the sale keeps its sales, under "Autre".
      const cid = p?.category ?? "";
      const cat = category.get(cid);
      const c = bump(cats, cat ? cid : "", () => (cat ? { key: cid, label: cat.fr, icon: cat.icon } : { key: "", label: "Autre (produit supprimé)", icon: "❔" }));
      c.revenue += l.price;
      c.units += n;
      if (!catsInOrder.has(c.key)) {
        catsInOrder.add(c.key);
        c.orders++;
      }
    }
    for (const id of new Set(o.lines.map((l) => l.productId))) prods.get(id)!.orders++;
  }

  const byDay: Stats["byDay"] = [];
  for (let k = range.from, i = 0; k <= range.to && i < 3700; k = addDays(k, 1), i++) byDay.push({ key: k, ...(days.get(k) ?? { revenue: 0, orders: 0 }) });

  const sales = sold.reduce((a, o) => a + o.total, 0);
  const delivery = sold.reduce((a, o) => a + o.delivery, 0);
  return {
    sales,
    products: sales - delivery,
    delivery,
    collected: byStatus.delivered.amount,
    pending: byStatus.confirmed.amount + byStatus.shipping.amount,
    orders: sold.length,
    units,
    basket: sold.length ? sales / sold.length : 0,
    byStatus,
    byProduct: [...prods.values()].sort(byRevenue),
    byCategory: [...cats.values()].sort(byRevenue),
    byZone: [...zones.values()].sort(byRevenue),
    byDay,
  };
}

/** Groups daily figures by month when the range is long, so the chart stays readable on a phone. */
export function chartBuckets(byDay: Stats["byDay"]) {
  if (byDay.length <= 45) return byDay.map((d) => ({ ...d, label: d.key }));
  const months = new Map<string, { key: string; label: string; revenue: number; orders: number }>();
  for (const d of byDay) {
    const k = d.key.slice(0, 7);
    const m = months.get(k) ?? { key: k, label: k, revenue: 0, orders: 0 };
    m.revenue += d.revenue;
    m.orders += d.orders;
    months.set(k, m);
  }
  return [...months.values()];
}
