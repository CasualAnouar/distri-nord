"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { products, type Product } from "@/data/products";
import { cartTotals, cities, type AddressReply, type CartLine, type Customer, type Mode, type Order, type OrderStatus } from "./shop";
import { sampleOrders } from "./sample-orders";

// Demo persistence: everything lives in this browser's localStorage and syncs across tabs,
// so the shop and /admin open side by side behave like one system. Supabase replaces this later.
const KEYS = { cart: "dn_cart", orders: "dn_orders", overrides: "dn_products" } as const;

type Overrides = Record<string, Partial<Pick<Product, "unitPrice" | "stock">> & { lotPrice?: number }>;

type Store = {
  ready: boolean;
  catalog: Product[];
  getProduct: (id: string) => Product | undefined;
  cart: CartLine[];
  addToCart: (productId: string, mode: Mode, qty?: number) => void;
  setQty: (productId: string, mode: Mode, qty: number) => void;
  clearCart: () => void;
  orders: Order[];
  placeOrder: (customer: Customer, locale: "fr" | "ar") => Order;
  setStatus: (orderId: string, status: OrderStatus) => void;
  confirmAddress: (orderId: string, reply: AddressReply) => void;
  updateProduct: (id: string, patch: Overrides[string]) => void;
  resetDemo: () => void;
};

const Ctx = createContext<Store | null>(null);

function read<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
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
  const [overrides, setOverrides] = useState<Overrides>({});

  useEffect(() => {
    const load = () => {
      setCart(read(KEYS.cart, []));
      setOrders(read(KEYS.orders, sampleOrders()));
      setOverrides(read(KEYS.overrides, {}));
    };
    // Read storage after hydration so server and client render the same first frame.
    const first = requestAnimationFrame(() => {
      load();
      setReady(true);
    });
    const onStorage = (e: StorageEvent) => {
      if (!e.key || Object.values(KEYS).includes(e.key as never)) load();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      cancelAnimationFrame(first);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const catalog = useMemo(
    () =>
      products.map((p) => {
        const o = overrides[p.id];
        if (!o) return p;
        return {
          ...p,
          unitPrice: o.unitPrice ?? p.unitPrice,
          stock: o.stock ?? p.stock,
          lot: { ...p.lot, price: o.lotPrice ?? p.lot.price },
        };
      }),
    [overrides],
  );
  const byId = useMemo(() => new Map(catalog.map((p) => [p.id, p])), [catalog]);
  const getProduct = useCallback((id: string) => byId.get(id), [byId]);

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
    const t = cartTotals(cart, getProduct, customer.city);
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
    // Reserve stock at order time.
    const nextOverrides = { ...overrides };
    for (const l of order.lines) {
      const p = getProduct(l.productId);
      if (p) nextOverrides[l.productId] = { ...nextOverrides[l.productId], stock: Math.max(0, p.stock - l.unitsPerLine * l.qty) };
    }
    setOverrides(nextOverrides);
    write(KEYS.overrides, nextOverrides);
    saveOrders([order, ...orders]);
    saveCart([]);
    return order;
  };

  const setStatus = (orderId: string, status: OrderStatus) => {
    saveOrders(
      orders.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status,
              history: [...o.history, { status, at: new Date().toISOString() }],
            }
          : o,
      ),
    );
  };

  const confirmAddress = (orderId: string, reply: AddressReply) => {
    saveOrders(
      orders.map((o) =>
        o.id === orderId && o.status === "new"
          ? { ...o, addressReply: reply, status: "confirmed", history: [...o.history, { status: "confirmed", at: new Date().toISOString() }] }
          : o,
      ),
    );
  };

  const updateProduct = (id: string, patch: Overrides[string]) => {
    const next = { ...overrides, [id]: { ...overrides[id], ...patch } };
    setOverrides(next);
    write(KEYS.overrides, next);
  };

  const resetDemo = () => {
    saveCart([]);
    saveOrders(sampleOrders());
    setOverrides({});
    write(KEYS.overrides, {});
  };

  const value: Store = {
    ready,
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
    updateProduct,
    resetDemo,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore outside StoreProvider");
  return v;
}

export { cities };
