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
import { defaultBoxes, type Box } from "@/data/boxes";
import { type AddressReply, type Customer, type Order, type OrderStatus } from "./shop";
import { sampleOrders } from "./sample-orders";

const COLLECTIONS = {
  settings: "settings",
  cities: "cities",
  categories: "categories",
  products: "products",
  orders: "orders",
  boxes: "boxes",
} as const;

// Boxes are read on their own so that a database whose rules predate them (permission denied)
// still loads the rest of the shop.
async function fetchBoxes(): Promise<Box[]> {
  try {
    const snap = await getDocs(collection(db, COLLECTIONS.boxes));
    return snap.empty ? defaultBoxes : snap.docs.map((d) => d.data() as Box);
  } catch (err) {
    console.warn("Firestore boxes fallback to defaults:", err);
    return defaultBoxes;
  }
}

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

    // 5. Boxes
    for (const box of defaultBoxes) {
      batch.set(doc(db, COLLECTIONS.boxes, box.id), box);
    }

    // 6. Sample orders
    const initialOrders = sampleOrders();
    for (const ord of initialOrders) {
      batch.set(doc(db, COLLECTIONS.orders, ord.id), ord);
    }

    await batch.commit();
  }
}

export async function fetchFullConfig(): Promise<Config> {
  try {
    const [settingsSnap, citiesSnap, catsSnap, prodsSnap, boxes] = await Promise.all([
      getDoc(doc(db, COLLECTIONS.settings, "global")),
      getDocs(collection(db, COLLECTIONS.cities)),
      getDocs(collection(db, COLLECTIONS.categories)),
      getDocs(collection(db, COLLECTIONS.products)),
      fetchBoxes(),
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
      settings: { ...defaultSettings, ...settings },
      cities: cities.length > 0 ? cities : defaultCities,
      categories: categories.length > 0 ? categories : defaultCategories,
      products: products.length > 0 ? products : defaultProducts,
      boxes,
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

export async function saveBoxDoc(box: Box): Promise<void> {
  await setDoc(doc(db, COLLECTIONS.boxes, box.id), box);
}

export async function removeBoxDoc(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTIONS.boxes, id));
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

/** Writes the order and the new stock of each product it used, in one batch. */
export async function placeOrderInFirestore(order: Order, newStock: Map<string, number>): Promise<void> {
  const batch = writeBatch(db);
  batch.set(doc(db, COLLECTIONS.orders, order.id), order);
  for (const [productId, stock] of newStock) {
    batch.update(doc(db, COLLECTIONS.products, productId), { stock });
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

  // Reset boxes
  for (const box of defaultBoxes) {
    batch.set(doc(db, COLLECTIONS.boxes, box.id), box);
  }

  // Reset orders with sample orders
  const initialOrders = sampleOrders();
  for (const ord of initialOrders) {
    batch.set(doc(db, COLLECTIONS.orders, ord.id), ord);
  }

  await batch.commit();
}
