import { defaultCategories, defaultProducts, type Category, type Product } from "@/data/products";

// Everything the seller can change from the dashboard. Defaults seed a fresh demo.

export type Localized = { fr: string; ar: string };

export type City = { id: string; fr: string; ar: string; fee: number; freeFrom: number; lat: number; lng: number; active: boolean };

export type Settings = {
  storeName: Localized;
  tagline: Localized;
  heroTitle: Localized;
  heroText: Localized;
  sellerPhone: string;
  minCart: number;
  lowStockAt: number;
  deliveryWindow: Localized;
};

export type Config = { settings: Settings; cities: City[]; categories: Category[]; products: Product[] };

export const defaultSettings: Settings = {
  storeName: { fr: "Distri Nord", ar: "ديستري نور" },
  tagline: { fr: "Grossiste & distributeur à Rabat", ar: "بائع بالجملة وموزع في الرباط" },
  heroTitle: { fr: "Votre stock livré chez vous, en lot ou à la pièce", ar: "سلعتك توصل لعندك، بالجملة أو بالتقسيط" },
  heroText: {
    fr: "Boissons, snacks, épicerie et hygiène aux prix de gros. Paiement à la livraison, suivi sur WhatsApp.",
    ar: "مشروبات، وجبات خفيفة، بقالة ومواد التنظيف بأثمنة الجملة. الدفع عند الاستلام، والتتبع عبر واتساب.",
  },
  sellerPhone: process.env.NEXT_PUBLIC_SELLER_PHONE || "06 00 00 00 00",
  minCart: 100,
  lowStockAt: 120,
  deliveryWindow: { fr: "aujourd'hui entre 14h et 18h", ar: "اليوم بين 14:00 و 18:00" },
};

// Delivery zones around the Rabat store. Fees are placeholders.
export const defaultCities: City[] = [
  { id: "rabat", fr: "Rabat", ar: "الرباط", fee: 0, freeFrom: 0, lat: 34.0209, lng: -6.8416, active: true },
  { id: "sale", fr: "Salé", ar: "سلا", fee: 10, freeFrom: 200, lat: 34.0331, lng: -6.7985, active: true },
  { id: "temara", fr: "Témara", ar: "تمارة", fee: 10, freeFrom: 200, lat: 33.9287, lng: -6.9063, active: true },
  { id: "harhoura", fr: "Harhoura", ar: "الهرهورة", fee: 15, freeFrom: 300, lat: 33.9502, lng: -6.9455, active: true },
  { id: "skhirat", fr: "Skhirat", ar: "الصخيرات", fee: 20, freeFrom: 400, lat: 33.8527, lng: -7.0317, active: true },
  { id: "bouknadel", fr: "Bouknadel", ar: "بوقنادل", fee: 20, freeFrom: 400, lat: 34.1236, lng: -6.7448, active: true },
  { id: "kenitra", fr: "Kénitra", ar: "القنيطرة", fee: 30, freeFrom: 500, lat: 34.261, lng: -6.5802, active: true },
];

export const defaultConfig: Config = { settings: defaultSettings, cities: defaultCities, categories: defaultCategories, products: defaultProducts };

// Fills in anything a stored config from an older demo version lacks.
export function withDefaults(stored: Partial<Config> | null): Config {
  if (!stored) return defaultConfig;
  return {
    settings: { ...defaultSettings, ...stored.settings },
    cities: stored.cities ?? defaultCities,
    categories: stored.categories ?? defaultCategories,
    products: stored.products ?? defaultProducts,
  };
}

export function slugify(s: string) {
  const base = s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${base || "item"}-${Math.random().toString(36).slice(2, 6)}`;
}
