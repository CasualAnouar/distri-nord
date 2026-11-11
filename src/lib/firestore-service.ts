import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  query,
  orderBy,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";
import {
  defaultConfig,
  defaultSettings,
  defaultCities,
  type City,
  type Config,
  type Settings,
} from "./config";
import {
  defaultCategories,
  defaultProducts,
  type Category,
  type Product,
} from "@/data/products";
import { type AddressReply, type Customer, type Order, type OrderStatus } from "./shop";
import { sampleOrders } from "./sample-orders";

const COLLECTIONS = {
  settings: "settings",
  cities: "cities",
  categories: "categories",
  products: "products",
  orders: "orders",
} as const;

export async function seedInitialFirestoreData(): Promise<void> {
  const settingsRef = doc(db, COLLECTIONS.settings, "global");
  const settingsSnap = await getDoc(settingsRef);

  if (!settingsSnap.exists()) {
    const batch = writeBatch(db);

    // 1. Settings
    batch.set(settingsRef, defaultSettings);

    // 2. Cities
    for (const city of defaultCities) {
      batch.set(doc(db, COLLECTIONS.cities, city.id), city);
    }

    // 3. Categories
    for (const cat of defaultCategories) {
      batch.set(doc(db, COLLECTIONS.categories, cat.id), cat);
    }

    // 4. Products
    for (const prod of defaultProducts) {
      batch.set(doc(db, COLLECTIONS.products, prod.id), prod);
    }

    // 5. Sample orders
    const initialOrders = sampleOrders();
    for (const ord of initialOrders) {
      batch.set(doc(db, COLLECTIONS.orders, ord.id), ord);
    }

    await batch.commit();
  }
}

export async function fetchFullConfig(): Promise<Config> {
  try {
    const [settingsSnap, citiesSnap, catsSnap, prodsSnap] = await Promise.all([
      getDoc(doc(db, COLLECTIONS.settings, "global")),
      getDocs(collection(db, COLLECTIONS.cities)),
      getDocs(collection(db, COLLECTIONS.categories)),
      getDocs(collection(db, COLLECTIONS.products)),
    ]);

    if (!settingsSnap.exists() || prodsSnap.empty) {
      await seedInitialFirestoreData();
      return defaultConfig;
    }

    const settings = settingsSnap.data() as Settings;
    const cities: City[] = citiesSnap.docs.map((d) => d.data() as City);
    const categories: Category[] = catsSnap.docs.map((d) => d.data() as Category);
    const products: Product[] = prodsSnap.docs.map((d) => d.data() as Product);

    return {
      settings: { ...defaultSettings, ...settings, whatsapp: { ...defaultSettings.whatsapp, ...settings.whatsapp } },
      cities: cities.length > 0 ? cities : defaultCities,
      categories: categories.length > 0 ? categories : defaultCategories,
      products: products.length > 0 ? products : defaultProducts,
    };
  } catch (err) {
    console.warn("Firestore fetchFullConfig fallback to defaults:", err);
    return defaultConfig;
  }
}

export async function saveSettingsDoc(patch: Partial<Settings>): Promise<void> {
  const ref = doc(db, COLLECTIONS.settings, "global");
  await setDoc(ref, patch, { merge: true });
}

export async function saveCityDoc(city: City): Promise<void> {
  const ref = doc(db, COLLECTIONS.cities, city.id);
  await setDoc(ref, city, { merge: true });
}

export async function removeCityDoc(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTIONS.cities, id));
}

export async function saveCategoryDoc(cat: Category): Promise<void> {
  const ref = doc(db, COLLECTIONS.categories, cat.id);
  await setDoc(ref, cat, { merge: true });
}

export async function removeCategoryDoc(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTIONS.categories, id));
}

export async function saveProductDoc(product: Product): Promise<void> {
  const ref = doc(db, COLLECTIONS.products, product.id);
  await setDoc(ref, product, { merge: true });
}

export async function updateProductDoc(id: string, patch: Partial<Product>): Promise<void> {
  const ref = doc(db, COLLECTIONS.products, id);
  await setDoc(ref, patch, { merge: true });
}

export async function removeProductDoc(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTIONS.products, id));
}

export async function fetchAllOrders(): Promise<Order[]> {
  try {
    const q = query(collection(db, COLLECTIONS.orders), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    if (snap.empty) {
      return sampleOrders();
    }
    return snap.docs.map((d) => d.data() as Order);
  } catch (err) {
    console.warn("Firestore fetchAllOrders fallback to sample orders:", err);
    return sampleOrders();
  }
}

export function subscribeToOrders(onUpdate: (orders: Order[]) => void): Unsubscribe {
  const q = query(collection(db, COLLECTIONS.orders), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snap) => {
      const orders = snap.docs.map((d) => d.data() as Order);
      onUpdate(orders);
    },
    (err) => {
      console.warn("Orders subscription error:", err);
    }
  );
}

export async function placeOrderInFirestore(order: Order, products: Product[]): Promise<void> {
  const batch = writeBatch(db);

  // 1. Create order doc
  batch.set(doc(db, COLLECTIONS.orders, order.id), order);

  // 2. Decrement product stock
  const used = new Map<string, number>();
  for (const line of order.lines) {
    used.set(line.productId, (used.get(line.productId) ?? 0) + line.unitsPerLine * line.qty);
  }

  for (const [productId, qtyUsed] of used.entries()) {
    const prod = products.find((p) => p.id === productId);
    if (prod) {
      const newStock = Math.max(0, prod.stock - qtyUsed);
      batch.update(doc(db, COLLECTIONS.products, productId), { stock: newStock });
    }
  }

  await batch.commit();
}

export async function setOrderStatusInFirestore(orderId: string, status: OrderStatus, history: { status: OrderStatus; at: string }[]): Promise<void> {
  const ref = doc(db, COLLECTIONS.orders, orderId);
  await updateDoc(ref, {
    status,
    history,
  });
}

export async function confirmOrderAddressInFirestore(orderId: string, reply: AddressReply, history: { status: OrderStatus; at: string }[]): Promise<void> {
  const ref = doc(db, COLLECTIONS.orders, orderId);
  await updateDoc(ref, {
    addressReply: reply,
    status: "confirmed",
    history,
  });
}

export async function resetDemoInFirestore(): Promise<void> {
  const batch = writeBatch(db);

  // Reset settings
  batch.set(doc(db, COLLECTIONS.settings, "global"), defaultSettings);

  // Reset cities
  for (const city of defaultCities) {
    batch.set(doc(db, COLLECTIONS.cities, city.id), city);
  }

  // Reset categories
  for (const cat of defaultCategories) {
    batch.set(doc(db, COLLECTIONS.categories, cat.id), cat);
  }

  // Reset products
  for (const prod of defaultProducts) {
    batch.set(doc(db, COLLECTIONS.products, prod.id), prod);
  }

  // Reset orders with sample orders
  const initialOrders = sampleOrders();
  for (const ord of initialOrders) {
    batch.set(doc(db, COLLECTIONS.orders, ord.id), ord);
  }

  await batch.commit();
}
