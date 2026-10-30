# Distri Nord

Demo storefront and seller dashboard for Distri Nord, a food and drinks wholesaler based in Rabat.

- Products sold **by the lot** (wholesale price) or **by the piece**.
- **Minimum order** per cart (100 DH by default, editable). Checkout stays locked until it is reached.
- **Cash on delivery** only. Delivery zones and fees: Rabat (free), Salé, Témara, Harhoura, Skhirat, Bouknadel, Kénitra.
- **WhatsApp flow**: the buyer confirms the address, shares a location pin, or types the address in a message (the checkout address is optional), then gets tracking updates. The seller gets new-order alerts and moves the order forward.
- **One seller**: Distri Nord takes every order and delivers it. Its WhatsApp number is set in `/admin/parametres` (`NEXT_PUBLIC_SELLER_PHONE` only sets the starting value).
- French and Arabic (RTL): `/fr`, `/ar`. Seller dashboard: `/admin`.
- **Everything is configurable from the admin**: `/admin/parametres` (store name, slogan and home texts in fr/ar, minimum order, seller WhatsApp number, low-stock alert, delivery window, delivery zones with fees, categories) and `/admin/produits` (add, edit, hide or delete products; prices, lot size, stock, badge, colour).

## Stack
Next.js 16 (App Router) · Tailwind CSS 4 · Vercel. Same stack as Talismans Morocco, so Supabase can be added the same way.

## Demo mode
There is no backend yet. Cart, orders and the whole configuration live in the browser's `localStorage` (`src/lib/store.tsx`) and sync between tabs. Open the shop and `/admin` side by side on the same device to show the full loop. "Réinitialiser" in the admin restores the sample orders.

The WhatsApp conversations (`src/lib/whatsapp.ts`) are scripted from the order status. The buttons inside the chat change the status, just like quick replies will.

## Going live (after the pitch)
1. **Supabase**: tables `products`, `orders`, `order_lines`, `order_events`, with RLS for staff, plus Auth for `/admin`. This replaces `store.tsx`.
2. **WhatsApp Business Cloud API** (Meta): a verified business number and approved message templates (order received, confirm address, out for delivery, delivered). Address confirmation uses quick-reply buttons and a webhook (`/api/whatsapp`) that updates the order.
3. **Product photos** in place of the coloured tiles (`src/components/ProductTile.tsx`).

## Develop
```bash
npm install
npm run dev
```

## Checks
```bash
npm run lint && npm run typecheck && npm run build
```
