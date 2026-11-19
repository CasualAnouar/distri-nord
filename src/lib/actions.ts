"use server";

import { headers } from "next/headers";
import { after } from "next/server";
import { updateTag } from "next/cache";
import { adminAuthorized } from "@/lib/admin-auth";
import type { City, Settings } from "@/lib/config";
import type { Category, Product } from "@/data/products";
import { badAmounts, cartTotals, normalizePhone, validAmount, type AddressReply, type EditOrderResult, type OrderEditInput, type CartLine, type Customer, type Order, type OrderStatus } from "@/lib/shop";
import {
  STORE_TAG,
  createOrder,
  editOrderLines,
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
  writeCategory,
  writeCity,
  writeProduct,
  writeProductOrder,
  writeSettings,
  countNewOrdersForPhone,
} from "@/lib/server/data";
import { syncOrderToWhatsApp } from "@/lib/wa/flows";

// Every change to the store goes through these server actions. Shop actions re-check everything
// the browser sent; dashboard actions also check the seller's login, since a server action can be
// called from any page.

/** Orders still waiting for confirmation that one phone number may have at once. */
const MAX_OPEN_ORDERS_PER_PHONE = 3;

export type PlaceOrderResult =
  | { ok: true; orderId: string }
  | { ok: false; error: "minCart" | "stock" | "unavailable" | "lotOnly" | "city" | "customer" | "tooMany" | "server"; productName?: string };

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

    if (!Array.isArray(lines) || lines.length > 100) return { ok: false, error: "unavailable" };
    // Stops a script from blocking the whole stock with fake orders under one number.
    if ((await countNewOrdersForPhone(phone)) >= MAX_OPEN_ORDERS_PER_PHONE) return { ok: false, error: "tooMany" };
    const clean = lines
      .filter((l) => l && typeof l.productId === "string" && /^[\w-]{1,100}$/.test(l.productId) && (l.mode === "lot" || l.mode === "unit") && Number.isInteger(l.qty) && l.qty > 0 && l.qty <= 10000)
      .map((l) => ({ productId: l.productId, mode: l.mode, qty: l.qty }));
    if (!clean.length) return { ok: false, error: "unavailable" };

    const order = await createOrder(
      clean.map((l) => l.productId),
      (products) => {
        const units = new Map<string, number>();
        const orderLines = clean.map((l) => {
          const p = products.get(l.productId);
          if (!p || p.hidden) throw new Refused("unavailable", p?.name);
          if (l.mode === "unit" && p.lotOnly) throw new Refused("lotOnly", p.name);
          const unitsPerLine = l.mode === "lot" ? p.lot.qty : 1;
          units.set(p.id, (units.get(p.id) ?? 0) + unitsPerLine * l.qty);
          if ((units.get(p.id) ?? 0) > p.stock) throw new Refused("stock", p.name);
          return { ...l, name: p.name, size: p.size, unitsPerLine, price: Math.round((l.mode === "lot" ? p.lot.price : p.unitPrice) * l.qty * 100) / 100 };
        });
        const t = cartTotals(clean, (id) => products.get(id), { cities: config.cities, minCart: config.settings.minCart, cityId: customer.city });
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

/** A product photo: a web link, our own photo route, or an uploaded JPEG/PNG/WebP under ~900 KB. Never SVG. */
function safeImage(image: unknown) {
  if (image === undefined || image === null || image === "") return true;
  if (typeof image !== "string") return false;
  if (image.startsWith("data:")) return /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(image) && image.length < 900_000;
  return /^(https?:\/\/|\/api\/images\/)/.test(image) && image.length < 2000;
}

async function requireAdmin() {
  if (!adminAuthorized((await headers()).get("authorization"))) throw new Error("Unauthorized");
}

const statuses: OrderStatus[] = ["new", "confirmed", "shipping", "delivered", "cancelled"];

/** Moves an order one step; `changed` is false when the step was refused (skipped or already done). */
export async function setOrderStatus(orderId: string, status: OrderStatus, linkSent = false): Promise<{ order: Order; changed: boolean } | null> {
  await requireAdmin();
  if (!statuses.includes(status)) return null;
  const r = await updateOrderStatus(str(orderId, 24), status, linkSent === true);
  if (r?.changed && status === "cancelled") updateTag(STORE_TAG); // stock given back
  if (r?.changed) await afterOrderChange(r.order);
  return r;
}

export async function resetOrder(orderId: string): Promise<Order | null> {
  await requireAdmin();
  return resetOrderToStart(str(orderId, 24));
}

/**
 * The seller changes an order after it was placed (the customer changed it at the door, for
 * example): quantities, products, delivery fee, amount collected, with a note. Stock follows the
 * difference. No WhatsApp message is sent.
 */
export async function editOrder(orderId: string, raw: OrderEditInput): Promise<EditOrderResult> {
  await requireAdmin();
  const lines = (Array.isArray(raw?.lines) ? raw.lines : [])
    .filter((l) => l && typeof l.productId === "string" && l.productId.length <= 200 && (l.mode === "lot" || l.mode === "unit") && Number.isInteger(l.qty) && l.qty >= 0 && l.qty <= 10000)
    .map((l) => ({ productId: l.productId, mode: l.mode, qty: l.qty }));
  if (!validAmount(raw?.delivery) || !validAmount(raw?.total) || !Number.isInteger(raw?.seen) || lines.length > 500) throw new Error("Bad edit");
  const r = await editOrderLines(str(orderId, 24), { lines, delivery: raw.delivery, total: raw.total, note: str(raw.note, 500), seen: raw.seen });
  if (r.ok && r.changed) updateTag(STORE_TAG); // stock changed
  return r;
}

export async function markOrderLinkSent(orderId: string, status: OrderStatus): Promise<Order | null> {
  await requireAdmin();
  if (!statuses.includes(status)) return null;
  return markLinkSent(str(orderId, 24), status);
}

/** The dashboard's 15-second refresh: orders only (the catalog with its photos is not re-read). */
export async function fetchDashboard(): Promise<{ orders: Order[] }> {
  await requireAdmin();
  return { orders: await listOrders() };
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

/** `baseStock` is the stock the form showed when it opened (see writeProduct). */
export async function saveProduct(p: Product, baseStock?: number) {
  await requireAdmin();
  if (!safeImage(p.image)) throw new Error("Invalid image");
  if (badAmounts(p).length) throw new Error(`Invalid amount: ${badAmounts(p).join(", ")}`);
  await writeProduct(p, Number.isFinite(baseStock) ? baseStock : undefined);
  updateTag(STORE_TAG);
}

export async function updateProduct(id: string, patch: Partial<Product>) {
  await requireAdmin();
  if ("image" in patch && !safeImage(patch.image)) throw new Error("Invalid image");
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
