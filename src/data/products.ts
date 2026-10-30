// Sample catalogue for the demo. Prices are placeholders in dirhams, to be replaced by the retailer's list.

export type CategoryId = "energy" | "sodas" | "water" | "juice" | "snacks" | "grocery" | "tea" | "hygiene";

export type Product = {
  id: string;
  name: string;
  brand: string;
  size: string;
  category: CategoryId;
  unitPrice: number;
  lot: { qty: number; price: number };
  stock: number; // in units
  color: string; // tile background
  tag?: "promo" | "new" | "best";
};

export const categories: { id: CategoryId; icon: string; fr: string; ar: string }[] = [
  { id: "energy", icon: "⚡", fr: "Énergisants", ar: "مشروبات الطاقة" },
  { id: "sodas", icon: "🥤", fr: "Sodas", ar: "مشروبات غازية" },
  { id: "water", icon: "💧", fr: "Eaux", ar: "مياه" },
  { id: "juice", icon: "🧃", fr: "Jus", ar: "عصائر" },
  { id: "snacks", icon: "🍪", fr: "Snacks & biscuits", ar: "وجبات خفيفة وبسكويت" },
  { id: "grocery", icon: "🛒", fr: "Épicerie", ar: "بقالة" },
  { id: "tea", icon: "🍵", fr: "Thé & café", ar: "شاي وقهوة" },
  { id: "hygiene", icon: "🧴", fr: "Hygiène & entretien", ar: "نظافة وتنظيف" },
];

export const products: Product[] = [
  { id: "monster-green", name: "Monster Energy Original", brand: "Monster", size: "50 cl", category: "energy", unitPrice: 15, lot: { qty: 24, price: 324 }, stock: 480, color: "#1f2a1f", tag: "best" },
  { id: "monster-ultra", name: "Monster Ultra White", brand: "Monster", size: "50 cl", category: "energy", unitPrice: 15, lot: { qty: 24, price: 324 }, stock: 240, color: "#d9dde3" },
  { id: "monster-mango", name: "Monster Mango Loco", brand: "Monster", size: "50 cl", category: "energy", unitPrice: 15, lot: { qty: 24, price: 324 }, stock: 96, color: "#2bb3c0", tag: "new" },
  { id: "redbull", name: "Red Bull Energy Drink", brand: "Red Bull", size: "25 cl", category: "energy", unitPrice: 14, lot: { qty: 24, price: 300 }, stock: 360, color: "#1c3f94" },
  { id: "power-horse", name: "Power Horse", brand: "Power Horse", size: "25 cl", category: "energy", unitPrice: 9, lot: { qty: 24, price: 192 }, stock: 0, color: "#c8102e" },
  { id: "coca-1l", name: "Coca-Cola", brand: "Coca-Cola", size: "1 L", category: "sodas", unitPrice: 9, lot: { qty: 6, price: 50 }, stock: 300, color: "#e41e2b", tag: "best" },
  { id: "coca-can", name: "Coca-Cola canette", brand: "Coca-Cola", size: "33 cl", category: "sodas", unitPrice: 6, lot: { qty: 24, price: 132 }, stock: 480, color: "#b5121b" },
  { id: "fanta", name: "Fanta Orange", brand: "Fanta", size: "1 L", category: "sodas", unitPrice: 8, lot: { qty: 6, price: 45 }, stock: 180, color: "#f68b1f" },
  { id: "poms", name: "Poms Pomme", brand: "Poms", size: "1 L", category: "sodas", unitPrice: 7, lot: { qty: 6, price: 39 }, stock: 150, color: "#6cb33f" },
  { id: "sidi-ali-15", name: "Sidi Ali", brand: "Sidi Ali", size: "1,5 L", category: "water", unitPrice: 6, lot: { qty: 6, price: 33 }, stock: 600, color: "#4aa3df", tag: "best" },
  { id: "ain-saiss-05", name: "Aïn Saïss", brand: "Aïn Saïss", size: "50 cl", category: "water", unitPrice: 3.5, lot: { qty: 12, price: 38 }, stock: 720, color: "#7cc6e8" },
  { id: "oulmes", name: "Oulmès gazeuse", brand: "Oulmès", size: "1 L", category: "water", unitPrice: 8, lot: { qty: 6, price: 45 }, stock: 120, color: "#0b6e4f" },
  { id: "jus-orange", name: "Jus d'orange 100%", brand: "Marrakech", size: "1 L", category: "juice", unitPrice: 16, lot: { qty: 6, price: 90 }, stock: 90, color: "#ffa21f", tag: "promo" },
  { id: "jus-cocktail", name: "Nectar cocktail", brand: "Marrakech", size: "1 L", category: "juice", unitPrice: 12, lot: { qty: 6, price: 66 }, stock: 60, color: "#e8564a" },
  { id: "merendina", name: "Merendina", brand: "Bimo", size: "40 g", category: "snacks", unitPrice: 2, lot: { qty: 30, price: 54 }, stock: 900, color: "#6b3a1e" },
  { id: "tonik", name: "Tonik", brand: "Bimo", size: "47 g", category: "snacks", unitPrice: 2, lot: { qty: 24, price: 43 }, stock: 720, color: "#f2c230" },
  { id: "chips", name: "Chips sel", brand: "Lay's", size: "45 g", category: "snacks", unitPrice: 5, lot: { qty: 20, price: 90 }, stock: 400, color: "#ffd100", tag: "new" },
  { id: "huile", name: "Huile de table", brand: "Lesieur", size: "5 L", category: "grocery", unitPrice: 95, lot: { qty: 4, price: 368 }, stock: 80, color: "#f6c343" },
  { id: "sucre", name: "Sucre en pain", brand: "Cosumar", size: "2 kg", category: "grocery", unitPrice: 18, lot: { qty: 6, price: 102 }, stock: 140, color: "#e9edf2" },
  { id: "couscous", name: "Couscous moyen", brand: "Dari", size: "1 kg", category: "grocery", unitPrice: 14, lot: { qty: 10, price: 130 }, stock: 200, color: "#d9a441" },
  { id: "the-vert", name: "Thé vert", brand: "Sultan", size: "200 g", category: "tea", unitPrice: 22, lot: { qty: 12, price: 252 }, stock: 150, color: "#2f7d32", tag: "best" },
  { id: "nescafe", name: "Nescafé Classic", brand: "Nescafé", size: "100 g", category: "tea", unitPrice: 39, lot: { qty: 6, price: 222 }, stock: 70, color: "#5a2d17" },
  { id: "tide", name: "Lessive poudre", brand: "Tide", size: "1 kg", category: "hygiene", unitPrice: 28, lot: { qty: 8, price: 208 }, stock: 110, color: "#f47b20" },
  { id: "colgate", name: "Dentifrice", brand: "Colgate", size: "75 ml", category: "hygiene", unitPrice: 14, lot: { qty: 12, price: 156 }, stock: 160, color: "#d71920", tag: "promo" },
];

export const productById = new Map(products.map((p) => [p.id, p]));
