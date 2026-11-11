import "server-only";

import { unstable_cache } from "next/cache";
import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  type DocumentData,
} from "firebase/firestore";
import { firebaseConfigured, getDb } from "@/lib/firebase";
import { defaultConfig, defaultSettings, type City, type Config, type Settings } from "@/lib/config";
import type { Category, Product } from "@/data/products";
import type { AddressReply, Order, OrderStatus } from "@/lib/shop";

// Every Firestore read and write of the store goes through this file, on the server only.

export const STORE_TAG = "store";

const C = { settings: "settings", cities: "cities", categories: "categories", products: "products", orders: "orders" } as const;

/** Address of a product photo uploaded from the dashboard (stored in Firestore as a data URL). */
const IMAGE_ROUTE = "/api/images/";

// Small, stable fingerprint of an uploaded photo, so its URL changes when the photo does and the
// image itself can be cached for a year.
function fingerprint(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 7) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return ((h >>> 0).toString(36) + s.length.toString(36)).slice(0, 12);
}

function withImageUrl(p: Product): Product {
  if (!p.image?.startsWith("data:")) return p;
  return { ...p, image: `${IMAGE_ROUTE}${encodeURIComponent(p.id)}?v=${fingerprint(p.image)}` };
}

/** True for an image value that points back at our own photo route (so it must not be saved). */
export function isServedImage(image: string | undefined) {
  return Boolean(image?.startsWith(IMAGE_ROUTE));
}

/** Reads the whole store setup from Firestore. Uploaded photos are swapped for their URL. */
async function readConfig(): Promise<Config> {
  if (!firebaseConfigured) return defaultConfig;
  const db = getDb();
  const [settingsSnap, citiesSnap, catsSnap, prodsSnap] = await Promise.all([
    getDoc(doc(db, C.settings, "global")),
    getDocs(collection(db, C.cities)),
    getDocs(collection(db, C.categories)),
    getDocs(collection(db, C.products)),
  ]);
  const stored = (settingsSnap.data() as Partial<Settings> | undefined) ?? {};
  return {
    settings: { ...defaultSettings, ...stored, whatsapp: { ...defaultSettings.whatsapp, ...stored.whatsapp } },
    cities: citiesSnap.docs.map((d) => d.data() as City),
    categories: catsSnap.docs.map((d) => d.data() as Category),
    products: prodsSnap.docs.map((d) => withImageUrl(d.data() as Product)),
  };
}

/**
 * The store setup for the shop, cached across visitors. The dashboard expires it on every change
 * (see src/lib/actions.ts); the five-minute limit only catches edits made outside the dashboard.
 * A failed read throws, so the last good copy keeps being served instead of an empty shop.
 */
export const getStoreConfig = unstable_cache(readConfig, ["store-config-v1"], { tags: [STORE_TAG], revalidate: 300 });

/** Fresh, uncached read for the dashboard and for checkout. */
export const getFreshConfig = readConfig;

/** What a shopper's browser receives: no hidden products, nothing else that is not for sale. */
export function publicConfig(config: Config): Config {
  return { ...config, products: config.products.filter((p) => !p.hidden) };
}

/** The uploaded photo of one product, as stored. */
export async function getProductImage(id: string): Promise<string | null> {
  if (!firebaseConfigured) return null;
  const snap = await getDoc(doc(getDb(), C.products, id));
  const image = (snap.data() as Product | undefined)?.image;
  return image?.startsWith("data:") ? image : null;
}

// Orders

export async function listOrders(): Promise<Order[]> {
  if (!firebaseConfigured) return [];
  const snap = await getDocs(query(collection(getDb(), C.orders), orderBy("createdAt", "desc")));
  return snap.docs.map((d) => d.data() as Order);
}

export async function getOrder(id: string): Promise<Order | null> {
  if (!firebaseConfigured || !/^[A-Za-z0-9-]{4,24}$/.test(id)) return null;
  const snap = await getDoc(doc(getDb(), C.orders, id));
  return snap.exists() ? (snap.data() as Order) : null;
}

const ID_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function newOrderId() {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return `DN-${Array.from(bytes, (b) => ID_ALPHABET[b % ID_ALPHABET.length]).join("")}`;
}

/**
 * Saves a new order and takes its units out of stock in one transaction, so two buyers cannot
 * both get the last lot. `build` receives the current products and returns the order to save
 * (without id), or throws to refuse it.
 */
export async function createOrder(productIds: string[], build: (products: Map<string, Product>) => Omit<Order, "id">): Promise<Order> {
  const db = getDb();
  return runTransaction(db, async (tx) => {
    const ids = [...new Set(productIds)];
    const snaps = await Promise.all(ids.map((id) => tx.get(doc(db, C.products, id))));
    const products = new Map(snaps.filter((s) => s.exists()).map((s) => [s.id, s.data() as Product]));
    const built = build(products);

    let id = newOrderId();
    for (let i = 0; i < 3 && (await tx.get(doc(db, C.orders, id))).exists(); i++) id = newOrderId();
    const order: Order = { id, ...built };

    const used = new Map<string, number>();
    for (const l of order.lines) used.set(l.productId, (used.get(l.productId) ?? 0) + l.unitsPerLine * l.qty);
    for (const [pid, units] of used) {
      const p = products.get(pid);
      if (p) tx.update(doc(db, C.products, pid), { stock: Math.max(0, p.stock - units) });
    }
    tx.set(doc(db, C.orders, id), stripUndefined(order));
    return order;
  });
}

export async function updateOrderStatus(id: string, status: OrderStatus): Promise<Order | null> {
  const db = getDb();
  return runTransaction(db, async (tx) => {
    const ref = doc(db, C.orders, id);
    const snap = await tx.get(ref);
    if (!snap.exists()) return null;
    const order = snap.data() as Order;
    const next: Order = { ...order, status, history: [...order.history, { status, at: new Date().toISOString() }] };
    tx.update(ref, { status: next.status, history: next.history });
    return next;
  });
}

/** The buyer's answer to the address question. Only a new order can still be confirmed. */
export async function saveAddressReply(id: string, reply: AddressReply): Promise<Order | null> {
  const db = getDb();
  return runTransaction(db, async (tx) => {
    const ref = doc(db, C.orders, id);
    const snap = await tx.get(ref);
    if (!snap.exists()) return null;
    const order = snap.data() as Order;
    if (order.status !== "new") return order;
    const next: Order = {
      ...order,
      addressReply: reply,
      status: "confirmed",
      history: [...order.history, { status: "confirmed", at: new Date().toISOString() }],
    };
    tx.update(ref, { addressReply: reply, status: next.status, history: next.history });
    return next;
  });
}

// Store setup (dashboard)

// Firestore refuses `undefined`; a field set to undefined means "remove it".
function stripUndefined<T extends object>(o: T): DocumentData {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));
}

export async function writeSettings(patch: Partial<Settings>) {
  await setDoc(doc(getDb(), C.settings, "global"), stripUndefined(patch), { merge: true });
}

export async function writeCity(city: City) {
  await setDoc(doc(getDb(), C.cities, city.id), stripUndefined(city));
}

export async function deleteCity(id: string) {
  await deleteDoc(doc(getDb(), C.cities, id));
}

export async function writeCategory(cat: Category) {
  await setDoc(doc(getDb(), C.categories, cat.id), stripUndefined(cat));
}

export async function deleteCategory(id: string) {
  await deleteDoc(doc(getDb(), C.categories, id));
}

/** Replaces a product. A photo that is still the served URL keeps the stored upload. */
export async function writeProduct(p: Product) {
  const ref = doc(getDb(), C.products, p.id);
  const image = isServedImage(p.image) ? ((await getDoc(ref)).data() as Product | undefined)?.image : p.image;
  await setDoc(ref, stripUndefined({ ...p, image }));
}

export async function patchProduct(id: string, patch: Partial<Product>) {
  const entries = Object.entries(patch).filter(([k, v]) => !(k === "image" && isServedImage(v as string | undefined)));
  if (!entries.length) return;
  await updateDoc(doc(getDb(), C.products, id), Object.fromEntries(entries.map(([k, v]) => [k, v === undefined ? deleteField() : v])));
}

export async function deleteProduct(id: string) {
  await deleteDoc(doc(getDb(), C.products, id));
}
