"use server";

import { headers } from "next/headers";
import { after } from "next/server";
import { updateTag } from "next/cache";
import { adminAuthorized } from "@/lib/admin-auth";
import type { City, Config, Settings } from "@/lib/config";
import type { Category, Product } from "@/data/products";
import type { Box } from "@/data/boxes";
import { badAmounts, cartTotals, validAmount, normalizePhone, type AddressReply, type CartLine, type Customer, type Order, type OrderStatus } from "@/lib/shop";
import {
  STORE_TAG,
  READ_ONLY,
  createOrder,
  deleteBox,
  deleteCategory,
  deleteCity,
  deleteProduct,
  getFreshConfig,
  getOrder,
  listOrders,
  patchProduct,
  saveAddressReply,
  updateOrderStatus,
  markLinkSent,
  resetOrderToStart,
  writeBox,
  writeCategory,
  writeCity,
  writeProduct,
  writeProductOrder,
  writeSettings,
} from "@/lib/server/data";
import { syncOrderToWhatsApp } from "@/lib/wa/flows";

// Every change to the store goes through these server actions. Shop actions re-check everything
// the browser sent; dashboard actions also check the seller's login, since a server action can be
// called from any page.

export type PlaceOrderResult =
  | { ok: true; orderId: string }
  | { ok: false; error: "minCart" | "stock" | "unavailable" | "lotOnly" | "city" | "customer" | "preview" | "server"; productName?: string };

class Refused extends Error {
  constructor(
    readonly code: Exclude<PlaceOrderResult, { ok: true }>["error"],
    readonly productName?: string,
  ) {
    super(code);
  }
}

const str = (v: unknown, max = 300) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/**
 * Sends the WhatsApp messages the order's new state calls for (nothing while WhatsApp is off).
 * Runs after the response so the buyer and the seller never wait on Meta; it sends each message
 * once and never throws on WhatsApp errors.
 */
async function afterOrderChange(order: Order) {
  after(() =>
    syncOrderToWhatsApp(order.id).catch((err) => {
      console.error("WhatsApp sync failed:", err);
    }),
  );
}

export async function placeOrder(lines: CartLine[], rawCustomer: Customer, locale: "fr" | "ar"): Promise<PlaceOrderResult> {
  // Preview deployments read the live shop but never write to it.
  if (READ_ONLY) return { ok: false, error: "preview" };
  try {
    const config = await getFreshConfig();
    const phone = normalizePhone(str(rawCustomer?.phone, 30));
    const customer: Customer = {
      name: str(rawCustomer?.name, 120),
      phone: phone ?? "",
      city: str(rawCustomer?.city, 60),
      district: str(rawCustomer?.district, 120),
      address: str(rawCustomer?.address),
      landmark: str(rawCustomer?.landmark),
      note: str(rawCustomer?.note, 500),
    };
    if (!customer.name || !phone) return { ok: false, error: "customer" };
    const city = config.cities.find((c) => c.id === customer.city && c.active);
    if (customer.city && !city) return { ok: false, error: "city" };

    const clean = (Array.isArray(lines) ? lines : [])
      .filter((l) => l && typeof l.productId === "string" && (l.mode === "lot" || l.mode === "unit" || l.mode === "box") && Number.isInteger(l.qty) && l.qty > 0 && l.qty <= 10000)
      .map((l) => ({ productId: l.productId, mode: l.mode, qty: l.qty }));
    if (!clean.length) return { ok: false, error: "unavailable" };

    const boxes = new Map(config.boxes.map((b) => [b.id, b]));
    // A box takes its products out of stock, so the transaction reads them too.
    const productIds = clean.flatMap((l) => (l.mode === "box" ? (boxes.get(l.productId)?.items ?? []).map((it) => it.productId) : [l.productId]));

    const order = await createOrder(
      productIds,
      (products) => {
        const units = new Map<string, number>();
        const take = (p: Product, n: number) => {
          units.set(p.id, (units.get(p.id) ?? 0) + n);
          if ((units.get(p.id) ?? 0) > p.stock) throw new Refused("stock", p.name);
        };
        const orderLines = clean.map((l) => {
          if (l.mode === "box") {
            const b = boxes.get(l.productId);
            if (!b || b.hidden || !b.items.length) throw new Refused("unavailable", b?.name.fr);
            for (const it of b.items) {
              const p = products.get(it.productId);
              if (!p || p.hidden) throw new Refused("unavailable", b.name.fr);
              take(p, it.qty * l.qty);
            }
            return { ...l, name: b.name.fr, size: "Box", unitsPerLine: 0, price: b.price * l.qty, items: b.items };
          }
          const p = products.get(l.productId);
          if (!p || p.hidden) throw new Refused("unavailable", p?.name);
          if (l.mode === "unit" && p.lotOnly) throw new Refused("lotOnly", p.name);
          const unitsPerLine = l.mode === "lot" ? p.lot.qty : 1;
          take(p, unitsPerLine * l.qty);
          return { ...l, name: p.name, size: p.size, unitsPerLine, price: (l.mode === "lot" ? p.lot.price : p.unitPrice) * l.qty };
        });
        const t = cartTotals(
          clean,
          { product: (id) => products.get(id), box: (id) => boxes.get(id) },
          { cities: config.cities, minCart: config.settings.minCart, wholesaleMinCart: config.settings.wholesaleMinCart, cityId: customer.city },
        );
        if (t.missing > 0) throw new Refused("minCart");
        const now = new Date().toISOString();
        return {
          createdAt: now,
          locale: locale === "ar" ? "ar" : "fr",
          lines: orderLines,
          subtotal: t.subtotal,
          delivery: t.delivery,
          total: t.total,
          customer,
          status: "new",
          history: [{ status: "new", at: now }],
        };
      },
    );
    updateTag(STORE_TAG); // stock changed
    await afterOrderChange(order);
    return { ok: true, orderId: order.id };
  } catch (err) {
    if (err instanceof Refused) return { ok: false, error: err.code, productName: err.productName };
    console.error("placeOrder failed:", err);
    return { ok: false, error: "server" };
  }
}

/** The buyer's answer to the address question, from the order page. */
export async function confirmOrderAddress(orderId: string, reply: AddressReply): Promise<Order | null> {
  const clean: AddressReply | null =
    reply?.via === "button"
      ? { via: "button" }
      : reply?.via === "text" && str(reply.text)
        ? { via: "text", text: str(reply.text) }
        : reply?.via === "location" && Number.isFinite(reply.lat) && Number.isFinite(reply.lng)
          ? { via: "location", lat: Number(reply.lat), lng: Number(reply.lng) }
          : null;
  if (!clean) return null;
  const order = await saveAddressReply(str(orderId, 24), clean);
  if (order) await afterOrderChange(order);
  return order;
}

/** Latest state of one order, for the buyer's order page. */
export async function fetchOrder(orderId: string): Promise<Order | null> {
  return getOrder(str(orderId, 24));
}

// Dashboard

async function requireAdmin() {
  if (!adminAuthorized((await headers()).get("authorization"))) throw new Error("Unauthorized");
}

const statuses: OrderStatus[] = ["new", "confirmed", "shipping", "delivered", "cancelled"];

/** Moves an order one step; `changed` is false when the step was refused (skipped or already done). */
export async function setOrderStatus(orderId: string, status: OrderStatus, linkSent = false): Promise<{ order: Order; changed: boolean } | null> {
  await requireAdmin();
  if (!statuses.includes(status)) return null;
  const r = await updateOrderStatus(str(orderId, 24), status, linkSent === true);
  if (r?.changed) await afterOrderChange(r.order);
  return r;
}

export async function resetOrder(orderId: string): Promise<Order | null> {
  await requireAdmin();
  return resetOrderToStart(str(orderId, 24));
}

export async function markOrderLinkSent(orderId: string, status: OrderStatus): Promise<Order | null> {
  await requireAdmin();
  if (!statuses.includes(status)) return null;
  return markLinkSent(str(orderId, 24), status);
}

export async function fetchDashboard(): Promise<{ config: Config; orders: Order[] }> {
  await requireAdmin();
  const [config, orders] = await Promise.all([getFreshConfig(), listOrders()]);
  return { config, orders };
}

export async function saveSettings(patch: Partial<Settings>) {
  await requireAdmin();
  await writeSettings(patch);
  updateTag(STORE_TAG);
}

export async function saveCity(city: City) {
  await requireAdmin();
  await writeCity(city);
  updateTag(STORE_TAG);
}

export async function removeCity(id: string) {
  await requireAdmin();
  await deleteCity(id);
  updateTag(STORE_TAG);
}

export async function saveCategory(cat: Category) {
  await requireAdmin();
  await writeCategory(cat);
  updateTag(STORE_TAG);
}

export async function removeCategory(id: string) {
  await requireAdmin();
  await deleteCategory(id);
  updateTag(STORE_TAG);
}

export async function saveProduct(p: Product) {
  await requireAdmin();
  if (badAmounts(p).length) throw new Error(`Invalid amount: ${badAmounts(p).join(", ")}`);
  await writeProduct(p);
  updateTag(STORE_TAG);
}

export async function updateProduct(id: string, patch: Partial<Product>) {
  await requireAdmin();
  if (badAmounts(patch).length) throw new Error(`Invalid amount: ${badAmounts(patch).join(", ")}`);
  await patchProduct(id, patch);
  updateTag(STORE_TAG);
}

export async function removeProduct(id: string) {
  await requireAdmin();
  await deleteProduct(id);
  updateTag(STORE_TAG);
}

export async function reorderProducts(ids: string[]) {
  await requireAdmin();
  if (!Array.isArray(ids) || ids.length > 2000) throw new Error("Bad order");
  await writeProductOrder([...new Set(ids.filter((id): id is string => typeof id === "string"))]);
  updateTag(STORE_TAG);
}

export async function saveBox(box: Box) {
  await requireAdmin();
  if (!box || typeof box.id !== "string" || !box.id || !validAmount(box.price)) throw new Error("Invalid box");
  const items = (Array.isArray(box.items) ? box.items : []).filter((it) => typeof it?.productId === "string" && Number.isInteger(it.qty) && it.qty > 0);
  await writeBox({ ...box, items });
  updateTag(STORE_TAG);
}

export async function removeBox(id: string) {
  await requireAdmin();
  await deleteBox(str(id, 80));
  updateTag(STORE_TAG);
}
