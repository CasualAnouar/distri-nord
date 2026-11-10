import type { Localized } from "@/lib/config";

// Ready-made bundles of catalogue products sold at one price. Editable from the dashboard ("Box").

export type BoxItem = { productId: string; qty: number };

export type Box = {
  id: string;
  icon: string;
  name: Localized;
  description: Localized;
  items: BoxItem[];
  price: number;
  tag?: "promo" | "new" | "best";
  hidden?: boolean;
};

export const defaultBoxes: Box[] = [
  {
    id: "box-energie",
    icon: "⚡",
    name: { fr: "Box Énergie", ar: "بوكس الطاقة" },
    description: { fr: "6 Monster, 2 Red Bull et 2 chips pour tenir la semaine.", ar: "6 مونستر، 2 ريد بول و2 شيبس للأسبوع كامل." },
    items: [
      { productId: "monster-green", qty: 3 },
      { productId: "monster-mango", qty: 2 },
      { productId: "monster-ultra", qty: 1 },
      { productId: "redbull", qty: 2 },
      { productId: "chips", qty: 2 },
    ],
    price: 139,
    tag: "best",
  },
  {
    id: "box-match",
    icon: "⚽",
    name: { fr: "Box Match", ar: "بوكس الماتش" },
    description: { fr: "Sodas, canettes, chips et biscuits pour regarder le match entre amis.", ar: "مشروبات غازية، كانيط، شيبس وبسكويت لمشاهدة الماتش مع الأصدقاء." },
    items: [
      { productId: "coca-1l", qty: 2 },
      { productId: "fanta", qty: 1 },
      { productId: "coca-can", qty: 6 },
      { productId: "chips", qty: 6 },
      { productId: "tonik", qty: 2 },
    ],
    price: 94,
    tag: "new",
  },
  {
    id: "box-ftour",
    icon: "☕",
    name: { fr: "Box Petit-déjeuner", ar: "بوكس الفطور" },
    description: { fr: "Thé, sucre, café, jus et Merendina pour les matins de toute la famille.", ar: "أتاي، سكر، قهوة، عصير وميرندينا لصباح العائلة كلها." },
    items: [
      { productId: "the-vert", qty: 1 },
      { productId: "sucre", qty: 2 },
      { productId: "nescafe", qty: 1 },
      { productId: "merendina", qty: 6 },
      { productId: "jus-orange", qty: 1 },
    ],
    price: 94,
  },
  {
    id: "box-epicerie",
    icon: "🛒",
    name: { fr: "Box Épicerie du mois", ar: "بوكس البقالة ديال الشهر" },
    description: { fr: "L'essentiel du mois : huile, sucre, couscous, thé, lessive et eau.", ar: "الأساسيات ديال الشهر: زيت، سكر، كسكس، أتاي، تيد وماء." },
    items: [
      { productId: "huile", qty: 2 },
      { productId: "sucre", qty: 4 },
      { productId: "couscous", qty: 2 },
      { productId: "the-vert", qty: 1 },
      { productId: "lessive", qty: 1 },
      { productId: "sidi-ali-15", qty: 6 },
    ],
    price: 144,
  },
];
