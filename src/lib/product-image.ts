"use client";

import { useEffect, useState } from "react";
import type { Product } from "@/data/products";

// A product shows its own photo (URL or upload) if it has one; otherwise, with a barcode, the
// front photo from Open Food Facts (open data, CC BY-SA), looked up once and cached per browser.
const CACHE_KEY = "dn_off_images";
const pending = new Map<string, Promise<string>>();

function readCache(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
  } catch {
    return {};
  }
}

function lookup(barcode: string): Promise<string> {
  const cached = readCache()[barcode];
  if (cached !== undefined) return Promise.resolve(cached);
  if (!pending.has(barcode)) {
    pending.set(
      barcode,
      fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=image_front_url`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => (d?.product?.image_front_url as string | undefined) ?? "")
        .catch(() => "")
        .then((url) => {
          try {
            localStorage.setItem(CACHE_KEY, JSON.stringify({ ...readCache(), [barcode]: url }));
          } catch {}
          return url;
        }),
    );
  }
  return pending.get(barcode)!;
}

export function useProductImage(p: Pick<Product, "image" | "barcode">) {
  const [found, setFound] = useState<{ barcode: string; url: string } | null>(null);
  const barcode = !p.image && p.barcode && /^\d{8,14}$/.test(p.barcode) ? p.barcode : "";

  useEffect(() => {
    if (!barcode) return;
    let live = true;
    lookup(barcode).then((url) => live && setFound({ barcode, url }));
    return () => {
      live = false;
    };
  }, [barcode]);

  if (p.image) return p.image;
  return found && found.barcode === barcode ? found.url : "";
}

// Shrinks an uploaded photo so it fits comfortably in browser storage.
export function fileToDataUrl(file: File, max = 600): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const src = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(src);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => {
      URL.revokeObjectURL(src);
      reject(new Error("image"));
    };
    img.src = src;
  });
}
