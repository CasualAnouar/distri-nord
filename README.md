# Distri Nord

Demo storefront and seller dashboard for Distri Nord, a food and drinks wholesaler based in Rabat.

- Products sold **by the lot** (wholesale price) or **by the piece**.
- **Minimum order** per cart (100 DH by default, editable). Checkout stays locked until it is reached.
- **Cash on delivery** only. Delivery zones and fees: Rabat (free), Salé, Témara, Harhoura, Skhirat, Bouknadel, Kénitra.
- **WhatsApp flow**: the buyer confirms the address, shares a location pin, or types the address in a message (the checkout address is optional), then gets tracking updates. The seller gets new-order alerts and moves the order forward.
- **One seller**: Distri Nord takes every order and delivers it. Its WhatsApp number is set in the dashboard settings (`NEXT_PUBLIC_SELLER_PHONE` only sets the starting value).
- French and Arabic (RTL): `/fr`, `/ar`.
- **Seller dashboard has no public address**: it is served only at `/<ADMIN_PATH>` (secret, server-side env) behind a login (`ADMIN_USER` / `ADMIN_PASSWORD`, HTTP Basic auth). Nothing in the shop links to it, `/admin` is a plain 404, and the secret never ships to the browser. See `src/proxy.ts` and `.env.example`. Without `ADMIN_PATH` the dashboard is unreachable.
- **Everything is configurable from the dashboard**: `/<ADMIN_PATH>/parametres` (store name, slogan and home texts in fr/ar, minimum order, seller WhatsApp number, low-stock alert, delivery window, delivery zones with fees, categories) and `/<ADMIN_PATH>/produits` (add, edit, hide or delete products; prices, lot size, stock, badge, colour).

## Stack
Next.js 16 (App Router) · Tailwind CSS 4 · Vercel. Same stack as Talismans Morocco, so Supabase can be added the same way.

## Demo mode
There is no backend yet. Cart, orders and the whole configuration live in the browser's `localStorage` (`src/lib/store.tsx`) and sync between tabs. Open the shop and the dashboard side by side on the same device to show the full loop. "Réinitialiser" in the admin restores the sample orders.

The WhatsApp conversations (`src/lib/whatsapp.ts`) are scripted from the order status. The buttons inside the chat change the status, just like quick replies will.

## Going live (after the pitch)
1. **Supabase**: tables `products`, `orders`, `order_lines`, `order_events`, with RLS for staff, plus Supabase Auth for the dashboard (replacing Basic auth). This replaces `store.tsx`.
2. **WhatsApp Business Cloud API** (Meta): a verified business number and approved message templates (order received, confirm address, out for delivery, delivered). Address confirmation uses quick-reply buttons and a webhook (`/api/whatsapp`) that updates the order.
3. **Product photos** in place of the coloured tiles (`src/components/ProductTile.tsx`).

## Develop
```bash
npm install
cp .env.example .env.local   # pick ADMIN_PATH and ADMIN_PASSWORD
npm run dev
```
On Vercel, set `ADMIN_PATH`, `ADMIN_PASSWORD` (and optionally `ADMIN_USER`) in Project Settings → Environment Variables.

## Checks
```bash
npm run lint && npm run typecheck && npm run build
```
