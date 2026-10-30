// Starting catalogue for the demo. Everything here is editable from the dashboard; prices are placeholders.

export type Category = { id: string; icon: string; fr: string; ar: string };

export type Product = {
  id: string;
  name: string;
  brand: string;
  size: string;
  category: string;
  unitPrice: number;
  lot: { qty: number; price: number };
  stock: number; // in units
  color: string; // tile background
  tag?: "promo" | "new" | "best";
  hidden?: boolean;
  image?: string; // photo URL or uploaded data URL
  barcode?: string; // EAN: photo fetched from Open Food Facts when no image is set
};

export const defaultCategories: Category[] = [
  { id: "energy", icon: "⚡", fr: "Énergisants", ar: "مشروبات الطاقة" },
  { id: "sodas", icon: "🥤", fr: "Sodas", ar: "مشروبات غازية" },
  { id: "water", icon: "💧", fr: "Eaux", ar: "مياه" },
  { id: "juice", icon: "🧃", fr: "Jus", ar: "عصائر" },
  { id: "snacks", icon: "🍪", fr: "Snacks & biscuits", ar: "وجبات خفيفة وبسكويت" },
  { id: "grocery", icon: "🛒", fr: "Épicerie", ar: "بقالة" },
  { id: "tea", icon: "🍵", fr: "Thé & café", ar: "شاي وقهوة" },
  { id: "hygiene", icon: "🧴", fr: "Hygiène & entretien", ar: "نظافة وتنظيف" },
];

export const defaultProducts: Product[] = [
  { id: "monster-green", name: "Monster Energy Original", brand: "Monster", size: "50 cl", category: "energy", unitPrice: 15, lot: { qty: 24, price: 324 }, stock: 480, color: "#1f2a1f", tag: "best", barcode: "5060335635228", image: "https://images.openfoodfacts.org/images/products/506/033/563/5228/front_de.168.400.jpg" },
  { id: "monster-ultra", name: "Monster Ultra White", brand: "Monster", size: "50 cl", category: "energy", unitPrice: 15, lot: { qty: 24, price: 324 }, stock: 240, color: "#d9dde3", barcode: "5060335635716", image: "https://images.openfoodfacts.org/images/products/506/033/563/5716/front_sv.15.400.jpg" },
  { id: "monster-mango", name: "Monster Mango Loco", brand: "Monster", size: "50 cl", category: "energy", unitPrice: 15, lot: { qty: 24, price: 324 }, stock: 96, color: "#2bb3c0", tag: "new", barcode: "5060896623214", image: "https://images.openfoodfacts.org/images/products/506/089/662/3214/front_en.3.400.jpg" },
  { id: "redbull", name: "Red Bull Energy Drink", brand: "Red Bull", size: "25 cl", category: "energy", unitPrice: 14, lot: { qty: 24, price: 300 }, stock: 360, color: "#1c3f94", barcode: "9002490100070", image: "https://images.openfoodfacts.org/images/products/900/249/010/0070/front_en.245.400.jpg" },
  { id: "power-horse", name: "Power Horse", brand: "Power Horse", size: "25 cl", category: "energy", unitPrice: 9, lot: { qty: 24, price: 192 }, stock: 0, color: "#c8102e", barcode: "9008442002539", image: "https://images.openfoodfacts.org/images/products/900/844/200/2539/front_en.7.400.jpg" },
  { id: "coca-1l", name: "Coca-Cola", brand: "Coca-Cola", size: "1 L", category: "sodas", unitPrice: 9, lot: { qty: 6, price: 50 }, stock: 300, color: "#e41e2b", tag: "best", barcode: "6130003000029", image: "https://images.openfoodfacts.org/images/products/613/000/300/0029/front_fr.16.400.jpg" },
  { id: "coca-can", name: "Coca-Cola canette", brand: "Coca-Cola", size: "33 cl", category: "sodas", unitPrice: 6, lot: { qty: 24, price: 132 }, stock: 480, color: "#b5121b", barcode: "5449000000996", image: "https://images.openfoodfacts.org/images/products/544/900/000/0996/front_en.1129.400.jpg" },
  { id: "fanta", name: "Fanta Orange", brand: "Fanta", size: "1,75 L", category: "sodas", unitPrice: 12, lot: { qty: 6, price: 66 }, stock: 180, color: "#f68b1f", barcode: "5449000132499", image: "https://images.openfoodfacts.org/images/products/544/900/013/2499/front_en.71.400.jpg" },
  { id: "poms", name: "Poms Slim", brand: "Poms", size: "25 cl", category: "sodas", unitPrice: 4, lot: { qty: 24, price: 86 }, stock: 150, color: "#6cb33f", barcode: "5449000144874", image: "https://images.openfoodfacts.org/images/products/544/900/014/4874/front_fr.14.400.jpg" },
  { id: "sidi-ali-15", name: "Sidi Ali", brand: "Sidi Ali", size: "1,5 L", category: "water", unitPrice: 6, lot: { qty: 6, price: 33 }, stock: 600, color: "#4aa3df", tag: "best", barcode: "6111035000058", image: "https://images.openfoodfacts.org/images/products/611/103/500/0058/front_en.134.400.jpg" },
  { id: "ain-saiss-05", name: "Aïn Saïss", brand: "Aïn Saïss", size: "50 cl", category: "water", unitPrice: 3.5, lot: { qty: 12, price: 38 }, stock: 720, color: "#7cc6e8", barcode: "6111128000088", image: "https://images.openfoodfacts.org/images/products/611/112/800/0088/front_fr.34.400.jpg" },
  { id: "oulmes", name: "Oulmès gazeuse", brand: "Oulmès", size: "1 L", category: "water", unitPrice: 8, lot: { qty: 6, price: 45 }, stock: 120, color: "#0b6e4f", barcode: "6111035003035", image: "https://images.openfoodfacts.org/images/products/611/103/500/3035/front_en.61.400.jpg" },
  { id: "jus-orange", name: "Jus d'orange 100%", brand: "Marrakech", size: "1 L", category: "juice", unitPrice: 16, lot: { qty: 6, price: 90 }, stock: 90, color: "#ffa21f", tag: "promo", barcode: "6111242923577", image: "https://images.openfoodfacts.org/images/products/611/124/292/3577/front_fr.4.400.jpg" },
  { id: "jus-cocktail", name: "Cocktail tropical", brand: "Marrakech", size: "1 L", category: "juice", unitPrice: 12, lot: { qty: 6, price: 66 }, stock: 60, color: "#e8564a", barcode: "6111242923676", image: "https://images.openfoodfacts.org/images/products/611/124/292/3676/front_fr.37.400.jpg" },
  { id: "merendina", name: "Merendina", brand: "Bimo", size: "40 g", category: "snacks", unitPrice: 2, lot: { qty: 30, price: 54 }, stock: 900, color: "#6b3a1e", barcode: "6111031005309", image: "https://images.openfoodfacts.org/images/products/611/103/100/5309/front_fr.3.400.jpg" },
  { id: "tonik", name: "Tonik", brand: "Bimo", size: "121 g", category: "snacks", unitPrice: 6, lot: { qty: 12, price: 66 }, stock: 360, color: "#f2c230", barcode: "6111031003756", image: "https://images.openfoodfacts.org/images/products/611/103/100/3756/front_fr.32.400.jpg" },
  { id: "chips", name: "Chips salées", brand: "Lay's", size: "43 g", category: "snacks", unitPrice: 5, lot: { qty: 20, price: 90 }, stock: 400, color: "#ffd100", tag: "new", barcode: "6221031497872", image: "https://images.openfoodfacts.org/images/products/622/103/149/7872/front_fr.3.400.jpg" },
  { id: "huile", name: "Huile de table", brand: "Lesieur", size: "1 L", category: "grocery", unitPrice: 20, lot: { qty: 12, price: 228 }, stock: 80, color: "#f6c343", barcode: "6111024001516", image: "https://images.openfoodfacts.org/images/products/611/102/400/1516/front_fr.25.400.jpg" },
  { id: "sucre", name: "Sucre en lingot", brand: "Cosumar", size: "1 kg", category: "grocery", unitPrice: 11, lot: { qty: 10, price: 105 }, stock: 140, color: "#e9edf2", barcode: "6111029000118", image: "https://images.openfoodfacts.org/images/products/611/102/900/0118/front_fr.6.400.jpg" },
  { id: "couscous", name: "Couscous moyen", brand: "Dari", size: "1 kg", category: "grocery", unitPrice: 14, lot: { qty: 10, price: 130 }, stock: 200, color: "#d9a441", barcode: "6111094000013", image: "https://images.openfoodfacts.org/images/products/611/109/400/0013/front_fr.56.400.jpg" },
  { id: "the-vert", name: "Thé vert Al Ambar", brand: "Sultan", size: "200 g", category: "tea", unitPrice: 22, lot: { qty: 12, price: 252 }, stock: 150, color: "#2f7d32", tag: "best", barcode: "6111069004855", image: "https://images.openfoodfacts.org/images/products/611/106/900/4855/front_fr.23.400.jpg" },
  { id: "nescafe", name: "Nescafé Classic", brand: "Nescafé", size: "100 g", category: "tea", unitPrice: 39, lot: { qty: 6, price: 222 }, stock: 70, color: "#5a2d17", barcode: "80000822", image: "https://images.openfoodfacts.org/images/products/000/008/000/0822/front_it.23.400.jpg" },
  { id: "lessive", name: "Lessive poudre", brand: "Persil", size: "490 g", category: "hygiene", unitPrice: 25, lot: { qty: 10, price: 230 }, stock: 110, color: "#1e5aa8", barcode: "8712561335119", image: "https://images.openproductsfacts.org/images/products/871/256/133/5119/front_fr.22.400.jpg" },
  { id: "colgate", name: "Dentifrice Max White", brand: "Colgate", size: "75 ml", category: "hygiene", unitPrice: 14, lot: { qty: 12, price: 156 }, stock: 160, color: "#d71920", tag: "promo", barcode: "8714789928425", image: "https://images.openbeautyfacts.org/images/products/871/478/992/8425/front_fr.3.400.jpg" },
];

export const productById = new Map(defaultProducts.map((p) => [p.id, p]));
