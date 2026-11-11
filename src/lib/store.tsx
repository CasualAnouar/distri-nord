"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Category, Product } from "@/data/products";
import { defaultConfig, withDefaults, type City, type Config, type Settings } from "./config";
import { cartTotals, type AddressReply, type CartLine, type Customer, type Mode, type Order, type OrderStatus } from "./shop";
import { sampleOrders } from "./sample-orders";
import {
  fetchFullConfig,
  subscribeToOrders,
  placeOrderInFirestore,
  setOrderStatusInFirestore,
  confirmOrderAddressInFirestore,
  saveSettingsDoc,
  saveCityDoc,
  removeCityDoc,
  saveCategoryDoc,
  removeCategoryDoc,
  saveProductDoc,
  updateProductDoc,
  removeProductDoc,
  resetDemoInFirestore,
} from "./firestore-service";

const KEYS = { cart: "dn2_cart", orders: "dn2_orders", config: "dn4_config" } as const;

type Store = {
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
  orders: Order[];
  placeOrder: (customer: Customer, locale: "fr" | "ar") => Order;
  setStatus: (orderId: string, status: OrderStatus) => void;
  confirmAddress: (orderId: string, reply: AddressReply) => void;
  totals: (cityId?: string) => ReturnType<typeof cartTotals>;
  saveSettings: (patch: Partial<Settings>) => void;
  saveCity: (city: City) => void;
  removeCity: (id: string) => void;
  saveCategory: (cat: Category) => void;
  removeCategory: (id: string) => void;
  saveProduct: (p: Product) => void;
  updateProduct: (id: string, patch: Partial<Product>) => void;
  removeProduct: (id: string) => void;
  resetDemo: () => void;
};

const Ctx = createContext<Store | null>(null);

function read<T>(key: string, fallback: T): T {
  try {
    if (typeof window === "undefined" || !window.localStorage) return fallback;
    const v = localStorage.getItem(key);
    if (!v || !v.trim()) return fallback;
    return JSON.parse(v) as T;
  } catch {
    return fallback;
  }
}

// Asks the server to send the WhatsApp messages the order's new status calls for (no-op while
// WhatsApp is off). Fire and forget: the order itself is already saved.
function syncWhatsApp(orderId: string) {
  fetch("/api/whatsapp/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId }), keepalive: true }).catch(() => undefined);
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private mode: the demo still works for this page view.
  }
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [config, setConfig] = useState<Config>(defaultConfig);

  useEffect(() => {
    // 1. Immediate local cache hydration so first render is fast and consistent
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is only readable after mount
    setCart(read(KEYS.cart, []));
    setOrders(read(KEYS.orders, sampleOrders()));
    setConfig(withDefaults(read<Partial<Config> | null>(KEYS.config, null)));
    setReady(true);

    // 2. Fetch live config from Firestore
    fetchFullConfig()
      .then((cloudConfig) => {
        setConfig(cloudConfig);
        write(KEYS.config, cloudConfig);
      })
      .catch((err) => {
        console.warn("Error syncing cloud config:", err);
      });

    // 3. Real-time subscription to orders from Firestore
    const unsubOrders = subscribeToOrders((cloudOrders) => {
      setOrders(cloudOrders);
      write(KEYS.orders, cloudOrders);
    });

    const onStorage = (e: StorageEvent) => {
      if (e.key === KEYS.cart) {
        setCart(read(KEYS.cart, []));
      }
    };
    window.addEventListener("storage", onStorage);

    return () => {
      unsubOrders();
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const catalog = useMemo(() => config.products.filter((p) => !p.hidden), [config.products]);
  const activeCities = useMemo(() => config.cities.filter((c) => c.active), [config.cities]);
  const byId = useMemo(() => new Map(config.products.map((p) => [p.id, p])), [config.products]);
  const getProduct = useCallback((id: string) => byId.get(id), [byId]);

  const saveConfig = (next: Config) => {
    setConfig(next);
    write(KEYS.config, next);
  };
  const totals = (cityId?: string) => cartTotals(cart, getProduct, { cities: config.cities, minCart: config.settings.minCart, cityId });

  const saveCart = (next: CartLine[]) => {
    setCart(next);
    write(KEYS.cart, next);
  };
  const saveOrders = (next: Order[]) => {
    setOrders(next);
    write(KEYS.orders, next);
  };

  const setQty = (productId: string, mode: Mode, qty: number) => {
    const rest = cart.filter((l) => !(l.productId === productId && l.mode === mode));
    saveCart(qty > 0 ? [...rest, { productId, mode, qty }] : rest);
  };

  const addToCart = (productId: string, mode: Mode, qty = 1) => {
    const cur = cart.find((l) => l.productId === productId && l.mode === mode)?.qty ?? 0;
    const next = cart.some((l) => l.productId === productId && l.mode === mode)
      ? cart.map((l) => (l.productId === productId && l.mode === mode ? { ...l, qty: cur + qty } : l))
      : [...cart, { productId, mode, qty }];
    saveCart(next);
  };

  const placeOrder = (customer: Customer, locale: "fr" | "ar") => {
    const t = totals(customer.city);
    const now = new Date().toISOString();
    const order: Order = {
      id: `DN-${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: now,
      locale,
      lines: cart.flatMap((l) => {
        const p = getProduct(l.productId);
        if (!p) return [];
        const unitsPerLine = l.mode === "lot" ? p.lot.qty : 1;
        return [{ ...l, name: p.name, size: p.size, unitsPerLine, price: (l.mode === "lot" ? p.lot.price : p.unitPrice) * l.qty }];
      }),
      subtotal: t.subtotal,
      delivery: t.delivery,
      total: t.total,
      customer,
      status: "new",
      history: [{ status: "new", at: now }],
    };

    // Decrement stock locally & in cloud
    const used = new Map<string, number>();
    for (const l of order.lines) used.set(l.productId, (used.get(l.productId) ?? 0) + l.unitsPerLine * l.qty);
    const updatedProducts = config.products.map((p) =>
      used.has(p.id) ? { ...p, stock: Math.max(0, p.stock - used.get(p.id)!) } : p
    );
    saveConfig({ ...config, products: updatedProducts });
    saveOrders([order, ...orders]);
    saveCart([]);

    // Cloud firestore write
    placeOrderInFirestore(order, config.products).then(() => syncWhatsApp(order.id)).catch((err) => {
      console.warn("Firestore order placement error:", err);
    });

    return order;
  };

  const setStatus = (orderId: string, status: OrderStatus) => {
    const newHistory = [
      ...(orders.find((o) => o.id === orderId)?.history ?? []),
      { status, at: new Date().toISOString() },
    ];
    saveOrders(
      orders.map((o) => (o.id === orderId ? { ...o, status, history: newHistory } : o)),
    );
    setOrderStatusInFirestore(orderId, status, newHistory).then(() => syncWhatsApp(orderId)).catch((err) => {
      console.warn("Firestore setStatus error:", err);
    });
  };

  const confirmAddress = (orderId: string, reply: AddressReply) => {
    const newHistory = [
      ...(orders.find((o) => o.id === orderId)?.history ?? []),
      { status: "confirmed" as OrderStatus, at: new Date().toISOString() },
    ];
    saveOrders(
      orders.map((o) =>
        o.id === orderId && o.status === "new"
          ? { ...o, addressReply: reply, status: "confirmed", history: newHistory }
          : o,
      ),
    );
    confirmOrderAddressInFirestore(orderId, reply, newHistory).then(() => syncWhatsApp(orderId)).catch((err) => {
      console.warn("Firestore confirmAddress error:", err);
    });
  };

  const upsert = <T extends { id: string }>(list: T[], item: T) =>
    list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item];

  const saveSettings = (patch: Partial<Settings>) => {
    saveConfig({ ...config, settings: { ...config.settings, ...patch } });
    saveSettingsDoc(patch).catch((err) => console.warn("Firestore saveSettings error:", err));
  };

  const saveCity = (city: City) => {
    saveConfig({ ...config, cities: upsert(config.cities, city) });
    saveCityDoc(city).catch((err) => console.warn("Firestore saveCity error:", err));
  };

  const removeCity = (id: string) => {
    saveConfig({ ...config, cities: config.cities.filter((c) => c.id !== id) });
    removeCityDoc(id).catch((err) => console.warn("Firestore removeCity error:", err));
  };

  const saveCategory = (cat: Category) => {
    saveConfig({ ...config, categories: upsert(config.categories, cat) });
    saveCategoryDoc(cat).catch((err) => console.warn("Firestore saveCategory error:", err));
  };

  const removeCategory = (id: string) => {
    saveConfig({ ...config, categories: config.categories.filter((c) => c.id !== id) });
    removeCategoryDoc(id).catch((err) => console.warn("Firestore removeCategory error:", err));
  };

  const saveProduct = (p: Product) => {
    saveConfig({ ...config, products: upsert(config.products, p) });
    saveProductDoc(p).catch((err) => console.warn("Firestore saveProduct error:", err));
  };

  const updateProduct = (id: string, patch: Partial<Product>) => {
    saveConfig({ ...config, products: config.products.map((p) => (p.id === id ? { ...p, ...patch } : p)) });
    updateProductDoc(id, patch).catch((err) => console.warn("Firestore updateProduct error:", err));
  };

  const removeProduct = (id: string) => {
    saveConfig({ ...config, products: config.products.filter((p) => p.id !== id) });
    saveCart(cart.filter((l) => l.productId !== id));
    removeProductDoc(id).catch((err) => console.warn("Firestore removeProduct error:", err));
  };

  const resetDemo = () => {
    saveCart([]);
    saveOrders(sampleOrders());
    saveConfig(defaultConfig);
    resetDemoInFirestore().catch((err) => console.warn("Firestore resetDemo error:", err));
  };

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
    clearCart: () => saveCart([]),
    orders,
    placeOrder,
    setStatus,
    confirmAddress,
    totals,
    saveSettings,
    saveCity,
    removeCity,
    saveCategory,
    removeCategory,
    saveProduct,
    updateProduct,
    removeProduct,
    resetDemo,
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
