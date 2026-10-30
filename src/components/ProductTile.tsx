"use client";

import { useState } from "react";
import type { Product } from "@/data/products";
import { useStore } from "@/lib/store";
import { useProductImage } from "@/lib/product-image";

function isLight(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 170;
}

// Product photo when there is one; otherwise a coloured tile with the brand.
export function ProductTile({ product, className = "", compact = false }: { product: Product; className?: string; compact?: boolean }) {
  const { categories } = useStore();
  const [failed, setFailed] = useState<string | null>(null);
  // If the stored photo link breaks, fall back to the barcode lookup, then to the tile.
  const src = useProductImage(failed && failed === product.image ? { barcode: product.barcode } : product);

  if (src && failed !== src) {
    return (
      <div className={`relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-white ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- remote and uploaded photos, sizes unknown */}
        <img src={src} alt={product.name} loading="lazy" onError={() => setFailed(src)} className={`size-full object-contain ${compact ? "p-0.5" : "p-3"}`} />
      </div>
    );
  }

  const light = isLight(product.color);
  const icon = categories.find((c) => c.id === product.category)?.icon;
  return (
    <div
      className={`relative flex aspect-[4/3] flex-col items-center justify-center overflow-hidden ${className}`}
      style={{ background: `linear-gradient(150deg, ${product.color}, color-mix(in srgb, ${product.color} 70%, black))` }}
      dir="ltr"
    >
      <span className={`absolute -end-4 -top-6 ${compact ? "text-5xl" : "text-[110px]"} leading-none opacity-15`} aria-hidden>{icon}</span>
      <span className={`${compact ? "px-1 text-center text-[11px]" : "text-xl"} font-extrabold tracking-tight ${light ? "text-navy-950" : "text-white"}`}>{product.brand}</span>
      {!compact && <span className={`mt-1 rounded-full px-2 py-0.5 text-xs font-semibold ${light ? "bg-navy-950/10 text-navy-950" : "bg-white/20 text-white"}`}>{product.size}</span>}
    </div>
  );
}
