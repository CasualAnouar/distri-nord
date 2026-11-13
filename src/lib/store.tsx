"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import type { Category, Product } from "@/data/products";
import type { City, Config, Settings } from "./config";
import { cartTotals, type AddressReply, type CartLine, type Customer, type Mode, type Order, type OrderStatus } from "./shop";
import * as actions from "./actions";
import type { PlaceOrderResult } from "./actions";

// The store's data comes from the server: layouts read Firestore and hand the result to this
// provider, so the first paint already shows the real catalogue. The browser only keeps the cart
// (localStorage). Every change goes through a server action, then the page data is refreshed.

const CART_KEY = "dn2_cart";

type Store = {
  /** True once the cart has been read from this browser. */
  ready: boolean;
  config: Config;
  settings: Settings;
  cities: City[]; // active zones only, for checkout
  categories: Category[];
  catalog: Product[]; // visible products only, for the shop
  getProduct: (id: string) => Product | undefined;
  cart: CartLine[];
  addToCart: (productId: string, mode: Mode, qty?: number) => void;
  setQty: (productId: string, mode: Mode, qty: number) => void;
  clearCart: () => void;
  /** Dashboard only: every order, refreshed every few seconds. */
  orders: Order[];
  placeOrder: (customer: Customer, locale: "fr" | "ar") => Promise<PlaceOrderResult>;
  setStatus: (orderId: string, status: OrderStatus, linkSent?: boolean) => Promise<{ order: Order; changed: boolean } | null>;
  markLinkSent: (orderId: string, status: OrderStatus) => Promise<Order | null>;
  confirmAddress: (orderId: string, reply: AddressReply) => Promise<Order | null>;
  totals: (cityId?: string) => ReturnType<typeof cartTotals>;
  saveSettings: (patch: Partial<Settings>) => void;
  saveCity: (city: City) => void;
  removeCity: (id: string) => void;
  saveCategory: (cat: Category) => void;
  removeCategory: (id: string) => void;
  saveProduct: (p: Product) => void;
  updateProduct: (id: string, patch: Partial<Product>) => void;
  removeProduct: (id: string) => void;
};

const Ctx = createContext<Store | null>(null);

// Cart in localStorage, read through useSyncExternalStore so the server render and the first
// browser render agree (empty cart) and other tabs stay in sync.
const cartListeners = new Set<() => void>();
let cartRaw: string | null = null;
let cartParsed: CartLine[] = [];
const EMPTY: CartLine[] = [];

function readCart(): CartLine[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(CART_KEY);
  } catch {
    raw = null;
  }
  if (raw !== cartRaw) {
    cartRaw = raw;
    try {
      const v = raw ? JSON.parse(raw) : [];
      cartParsed = Array.isArray(v) ? v : [];
    } catch {
      cartParsed = [];
    }
  }
  return cartParsed;
}

function writeCart(next: CartLine[]) {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(next));
  } catch {
    // Private mode: keep the cart for this page view only.
    cartRaw = JSON.stringify(next);
    cartParsed = next;
  }
  cartListeners.forEach((l) => l());
}

function subscribeCart(listener: () => void) {
  cartListeners.add(listener);
  const onStorage = (e: StorageEvent) => e.key === CART_KEY && listener();
  window.addEventListener("storage", onStorage);
  return () => {
    cartListeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

const noopSubscribe = () => () => {};

export function StoreProvider({
  children,
  initialConfig,
  initialOrders,
}: {
  children: React.ReactNode;
  initialConfig: Config;
  /** Passed by the dashboard only. */
  initialOrders?: Order[];
}) {
  const router = useRouter();
  const admin = initialOrders !== undefined;
  const [config, setConfig] = useState<Config>(initialConfig);
  const [orders, setOrders] = useState<Order[]>(initialOrders ?? []);

  // New server data (after router.refresh or navigation) replaces the local copy.
  const [seenConfig, setSeenConfig] = useState(initialConfig);
  if (seenConfig !== initialConfig) {
    setSeenConfig(initialConfig);
    setConfig(initialConfig);
  }
  const [seenOrders, setSeenOrders] = useState(initialOrders);
  if (seenOrders !== initialOrders) {
    setSeenOrders(initialOrders);
    if (initialOrders) setOrders(initialOrders);
  }

  const ready = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const rawCart = useSyncExternalStore(subscribeCart, readCart, () => EMPTY);

  // The dashboard keeps its order list current without a reload.
  useEffect(() => {
    if (!admin) return;
    let live = true;
    const tick = () => {
      if (document.visibilityState !== "visible") return;
      actions
        .fetchDashboard()
        .then((d) => {
          if (!live) return;
          setOrders(d.orders);
        })
        .catch(() => {});
    };
    const id = window.setInterval(tick, 15000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      live = false;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [admin]);

  const catalog = useMemo(() => config.products.filter((p) => !p.hidden), [config.products]);
  const activeCities = useMemo(() => config.cities.filter((c) => c.active), [config.cities]);
  const byId = useMemo(() => new Map(config.products.map((p) => [p.id, p])), [config.products]);
  const getProduct = useCallback((id: string) => byId.get(id), [byId]);
  // Lines whose product is gone or hidden are not part of the cart any more, and a product switched
  // to "lot only" can no longer be bought by the piece, even if it already sits in a cart.
  const cart = useMemo(
    () =>
      rawCart.filter((l) => {
        const p = byId.get(l.productId);
        return p && !p.hidden && !(l.mode === "unit" && p.lotOnly);
      }),
    [rawCart, byId],
  );

  const totals = (cityId?: string) => cartTotals(cart, getProduct, { cities: config.cities, minCart: config.settings.minCart, cityId });

  const setQty = (productId: string, mode: Mode, qty: number) => {
    const rest = cart.filter((l) => !(l.productId === productId && l.mode === mode));
    writeCart(qty > 0 ? [...rest, { productId, mode, qty }] : rest);
  };

  const addToCart = (productId: string, mode: Mode, qty = 1) => {
    const cur = cart.find((l) => l.productId === productId && l.mode === mode)?.qty ?? 0;
    setQty(productId, mode, cur + qty);
  };

  const placeOrder = async (customer: Customer, locale: "fr" | "ar") => {
    const result = await actions.placeOrder(cart, customer, locale);
    if (result.ok) writeCart([]);
    else router.refresh(); // prices or stock may have changed
    return result;
  };

  const setStatus = async (orderId: string, status: OrderStatus, linkSent = false) => {
    const r = await actions.setOrderStatus(orderId, status, linkSent);
    if (r) setOrders((list) => list.map((o) => (o.id === r.order.id ? r.order : o)));
    return r;
  };

  const markLinkSent = async (orderId: string, status: OrderStatus) => {
    const order = await actions.markOrderLinkSent(orderId, status);
    if (order) setOrders((list) => list.map((o) => (o.id === order.id ? order : o)));
    return order;
  };

  const confirmAddress = async (orderId: string, reply: AddressReply) => {
    const order = await actions.confirmOrderAddress(orderId, reply);
    if (order) setOrders((list) => list.map((o) => (o.id === order.id ? order : o)));
    return order;
  };

  // Dashboard edits show at once, are saved on the server, then the page reloads its data from it.
  const save = (local: (c: Config) => Config, remote: () => Promise<void>) => {
    setConfig(local);
    remote()
      .catch((err) => {
        console.error(err);
        alert("La modification n'a pas pu être enregistrée. Vérifiez la connexion et réessayez.");
      })
      .finally(() => router.refresh());
  };

  const upsert = <T extends { id: string }>(list: T[], item: T) =>
    list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item];

  const value: Store = {
    ready,
    config,
    settings: config.settings,
    cities: activeCities,
    categories: config.categories,
    catalog,
    getProduct,
    cart,
    addToCart,
    setQty,
    clearCart: () => writeCart([]),
    orders,
    placeOrder,
    setStatus,
    markLinkSent,
    confirmAddress,
    totals,
    saveSettings: (patch) => save((c) => ({ ...c, settings: { ...c.settings, ...patch } }), () => actions.saveSettings(patch)),
    saveCity: (city) => save((c) => ({ ...c, cities: upsert(c.cities, city) }), () => actions.saveCity(city)),
    removeCity: (id) => save((c) => ({ ...c, cities: c.cities.filter((x) => x.id !== id) }), () => actions.removeCity(id)),
    saveCategory: (cat) => save((c) => ({ ...c, categories: upsert(c.categories, cat) }), () => actions.saveCategory(cat)),
    removeCategory: (id) => save((c) => ({ ...c, categories: c.categories.filter((x) => x.id !== id) }), () => actions.removeCategory(id)),
    saveProduct: (p) => save((c) => ({ ...c, products: upsert(c.products, p) }), () => actions.saveProduct(p)),
    updateProduct: (id, patch) =>
      save((c) => ({ ...c, products: c.products.map((p) => (p.id === id ? { ...p, ...patch } : p)) }), () => actions.updateProduct(id, patch)),
    removeProduct: (id) => save((c) => ({ ...c, products: c.products.filter((p) => p.id !== id) }), () => actions.removeProduct(id)),
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore outside StoreProvider");
  return v;
}

/** Name of a city by id, across all zones (orders may reference a zone later disabled). */
export function useCityName() {
  const { config } = useStore();
  return (id: string, locale: "fr" | "ar" = "fr") => config.cities.find((c) => c.id === id)?.[locale] ?? id;
}
