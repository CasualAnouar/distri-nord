"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { Product } from "@/data/products";
import { useLocale } from "@/i18n/locale";
import { useStore } from "@/lib/store";
import { useProductImage } from "@/lib/product-image";

function isLight(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 170;
}

// Full-size photo over the page; closes on a click anywhere or Escape.
function PhotoPreview({ src, name, onClose }: { src: string; name: string; onClose: () => void }) {
  const { t } = useLocale();
  useEffect(() => {
    // No page scrolling behind the photo.
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);
  // Rendered at the end of <body> so no card or header can clip or cover it.
  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-ink/90 p-3" onClick={onClose} role="dialog" aria-modal="true" aria-label={name}>
      <button onClick={onClose} className="absolute end-4 top-4 rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-ink">✕ {t.close}</button>
      {/* eslint-disable-next-line @next/next/no-img-element -- remote and uploaded photos, sizes unknown */}
      <img src={src} alt={name} className="max-h-[calc(100dvh-5rem)] w-auto max-w-full rounded-2xl bg-white object-contain" onClick={(e) => e.stopPropagation()} />
      <p className="mt-3 text-center text-sm font-semibold text-white">{name}</p>
    </div>,
    document.body,
  );
}

// Product photo filling the tile when there is one; otherwise a white tile with the brand.
// zoomable adds an eye button that opens the photo in full size.
export function ProductTile({ product, className = "", compact = false, zoomable = false }: { product: Product; className?: string; compact?: boolean; zoomable?: boolean }) {
  const { categories } = useStore();
  const { t } = useLocale();
  const [failed, setFailed] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  // If the stored photo link breaks, fall back to the barcode lookup, then to the tile.
  const src = useProductImage(failed && failed === product.image ? { barcode: product.barcode } : product);

  if (src && failed !== src) {
    return (
      <div className={`relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-white ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- remote and uploaded photos, sizes unknown */}
        <img
          src={src}
          alt={product.name}
          loading="lazy"
          onError={() => setFailed(src)}
          onClick={zoomable ? () => setPreview(true) : undefined}
          className={`size-full object-cover ${zoomable ? "cursor-zoom-in" : ""}`}
        />
        {zoomable && (
          <button
            type="button"
            onClick={() => setPreview(true)}
            aria-label={t.viewPhoto}
            title={t.viewPhoto}
            className="absolute bottom-2 end-2 grid size-8 place-items-center rounded-full bg-white/90 text-navy-900 shadow hover:bg-white"
          >
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
        )}
        {preview && <PhotoPreview src={src} name={product.name} onClose={() => setPreview(false)} />}
      </div>
    );
  }
  const icon = categories.find((c) => c.id === product.category)?.icon;
  return (
    <div className={`relative flex aspect-[4/3] flex-col items-center justify-center overflow-hidden bg-white ${className}`} dir="ltr">
      <span className={`absolute -end-4 -top-6 ${compact ? "text-5xl" : "text-[110px]"} leading-none opacity-10`} aria-hidden>{icon}</span>
      <span className={`${compact ? "px-1 text-center text-[11px]" : "text-xl"} font-extrabold tracking-tight`} style={{ color: isLight(product.color) ? "#0b1f3a" : product.color }}>{product.brand}</span>
      {!compact && <span className="mt-1 rounded-full bg-navy-950/5 px-2 py-0.5 text-xs font-semibold text-navy-950">{product.size}</span>}
    </div>
  );
}
