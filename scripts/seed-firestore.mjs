import { readFileSync } from "fs";
import { resolve } from "path";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  writeBatch,
} from "firebase/firestore";

// Read .env.local
const envPath = resolve(process.cwd(), ".env.local");
try {
  const content = readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx !== -1) {
      const k = trimmed.slice(0, eqIdx).trim();
      const v = trimmed.slice(eqIdx + 1).trim();
      process.env[k] = v;
    }
  }
} catch (e) {
  console.warn("Could not load .env.local:", e.message);
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

console.log("Connecting to Firebase Project:", firebaseConfig.projectId);
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Data defaults
const defaultSettings = {
  storeName: { fr: "Distri Nord", ar: "ديستري نور" },
  tagline: { fr: "Grossiste & distributeur à Rabat", ar: "بائع بالجملة وموزع في الرباط" },
  heroTitle: { fr: "Votre stock livré chez vous, en lot ou à la pièce", ar: "سلعتك توصل لعندك، بالجملة أو بالتقسيط" },
  heroText: {
    fr: "Boissons, snacks, épicerie et hygiène aux prix de gros. Paiement à la livraison, suivi sur WhatsApp.",
    ar: "مشروبات، وجبات خفيفة، بقالة ومواد التنظيف بأثمنة الجملة. الدفع عند الاستلام، والتتبع عبر واتساب.",
  },
  sellerPhone: process.env.NEXT_PUBLIC_SELLER_PHONE || "06 08 25 23 28",
  minCart: 100,
  lowStockAt: 120,
  deliveryWindow: { fr: "aujourd'hui entre 14h et 18h", ar: "اليوم بين 14:00 و 18:00" },
};

const defaultCities = [
  { id: "rabat", fr: "Rabat", ar: "الرباط", fee: 0, freeFrom: 0, lat: 34.0209, lng: -6.8416, active: true },
  { id: "sale", fr: "Salé", ar: "سلا", fee: 10, freeFrom: 200, lat: 34.0331, lng: -6.7985, active: true },
  { id: "temara", fr: "Témara", ar: "تمارة", fee: 10, freeFrom: 200, lat: 33.9287, lng: -6.9063, active: true },
  { id: "harhoura", fr: "Harhoura", ar: "الهرهورة", fee: 15, freeFrom: 300, lat: 33.9502, lng: -6.9455, active: true },
  { id: "skhirat", fr: "Skhirat", ar: "الصخيرات", fee: 20, freeFrom: 400, lat: 33.8527, lng: -7.0317, active: true },
  { id: "bouknadel", fr: "Bouknadel", ar: "بوقنادل", fee: 20, freeFrom: 400, lat: 34.1236, lng: -6.7448, active: true },
  { id: "kenitra", fr: "Kénitra", ar: "القنيطرة", fee: 30, freeFrom: 500, lat: 34.261, lng: -6.5802, active: true },
];

const defaultCategories = [
  { id: "energy", icon: "⚡", fr: "Énergisants", ar: "مشروبات الطاقة" },
  { id: "sodas", icon: "🥤", fr: "Sodas", ar: "مشروبات غازية" },
  { id: "water", icon: "💧", fr: "Eaux", ar: "مياه" },
  { id: "juice", icon: "🧃", fr: "Jus", ar: "عصائر" },
  { id: "snacks", icon: "🍪", fr: "Snacks & biscuits", ar: "وجبات خفيفة وبسكويت" },
  { id: "grocery", icon: "🛒", fr: "Épicerie", ar: "بقالة" },
  { id: "tea", icon: "🍵", fr: "Thé & café", ar: "شاي وقهوة" },
  { id: "hygiene", icon: "🧴", fr: "Hygiène & entretien", ar: "نظافة وتنظيف" },
];

const defaultProducts = [
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

async function seed() {
  console.log("Seeding Firestore database...");
  const batch = writeBatch(db);

  // Settings
  console.log("- Writing settings...");
  batch.set(doc(db, "settings", "global"), defaultSettings);

  // Cities
  console.log("- Writing cities...");
  for (const c of defaultCities) {
    batch.set(doc(db, "cities", c.id), c);
  }

  // Categories
  console.log("- Writing categories...");
  for (const cat of defaultCategories) {
    batch.set(doc(db, "categories", cat.id), cat);
  }

  // Products
  console.log(`- Writing ${defaultProducts.length} products...`);
  for (const p of defaultProducts) {
    batch.set(doc(db, "products", p.id), p);
  }

  await batch.commit();
  console.log("Batch commit successful!");

  // Verify
  console.log("Verifying seeded documents...");
  const prods = await getDocs(collection(db, "products"));
  console.log(`Verified ${prods.size} products in Firestore.`);
  const cities = await getDocs(collection(db, "cities"));
  console.log(`Verified ${cities.size} cities in Firestore.`);
  const cats = await getDocs(collection(db, "categories"));
  console.log(`Verified ${cats.size} categories in Firestore.`);
  const settingsSnap = await getDoc(doc(db, "settings", "global"));
  console.log("Verified settings:", settingsSnap.exists() ? settingsSnap.data().storeName : "MISSING");
}

seed()
  .then(() => {
    console.log("Firestore seeding completed successfully!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Firestore seeding failed:", err);
    process.exit(1);
  });
