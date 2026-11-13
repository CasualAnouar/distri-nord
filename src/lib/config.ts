import { defaultCategories, defaultProducts, type Category, type Product } from "@/data/products";
import { defaultBoxes, type Box } from "@/data/boxes";

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
  // Secondary shop for big purchases, by lot, at /{locale}/gros.
  wholesaleEnabled: boolean;
  wholesaleMinCart: number;
  wholesaleTitle: Localized;
  wholesaleText: Localized;
  whatsapp: WhatsAppSettings;
};

// Real WhatsApp (Cloud API). Credentials stay in server env vars; only these switches live here.
export type WhatsAppSettings = {
  enabled: boolean; // off = the shop shows the scripted demo conversation
  businessPhone: string; // number customers receive messages from (shown on the order page)
  sellerAlerts: boolean; // send new-order alerts and order buttons to sellerPhone
  linkPhone: string; // link mode: the phone that sends the messages from the dashboard, shown to customers ("" = no number shown)
};

export type Config = { settings: Settings; cities: City[]; categories: Category[]; products: Product[]; boxes: Box[] };

export const defaultSettings: Settings = {
  storeName: { fr: "Distri Nord", ar: "ديستري نور" },
  tagline: { fr: "Vos courses livrées à Rabat", ar: "مشترياتك توصل لعندك في الرباط" },
  heroTitle: { fr: "Vos boissons et courses livrées chez vous", ar: "مشروباتك ومشترياتك توصل حتى لباب الدار" },
  heroText: {
    fr: "Achetez à la pièce ou choisissez une box prête à petit prix. Paiement à la livraison, suivi sur WhatsApp.",
    ar: "اشترِ بالحبة أو اختر بوكس واجد بثمن مناسب. الدفع عند الاستلام، والتتبع عبر واتساب.",
  },
  sellerPhone: process.env.NEXT_PUBLIC_SELLER_PHONE || "06 61 67 07 61",
  minCart: 100,
  lowStockAt: 120,
  deliveryWindow: { fr: "aujourd'hui entre 14h et 18h", ar: "اليوم بين 14:00 و 18:00" },
  wholesaleEnabled: true,
  wholesaleMinCart: 500,
  wholesaleTitle: { fr: "Achat en gros : lots et cartons au prix de gros", ar: "الشراء بالجملة: علب وكراطن بثمن الجملة" },
  wholesaleText: {
    fr: "Pour les épiceries, cafés, snacks et grosses commandes. Prix par lot, livraison à Rabat et environs, paiement à la livraison.",
    ar: "للحوانت، المقاهي، السناك والطلبات الكبيرة. الثمن بالعلبة، التوصيل في الرباط ونواحيها، والدفع عند الاستلام.",
  },
  whatsapp: { enabled: false, businessPhone: "", sellerAlerts: true, linkPhone: "" },
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

export const defaultConfig: Config = { settings: defaultSettings, cities: defaultCities, categories: defaultCategories, products: defaultProducts, boxes: defaultBoxes };

export function slugify(s: string) {
  const base = s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${base || "item"}-${Math.random().toString(36).slice(2, 6)}`;
}
