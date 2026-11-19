# Distri Nord

Storefront and seller dashboard for Distri Nord, a food and drinks wholesaler based in Rabat.

- Products sold **by the lot** (wholesale price) or **by the piece**.
- **Minimum order** per cart (100 DH by default, editable). Checkout stays locked until it is reached.
- **Cash on delivery** only. Delivery zones and fees: Rabat (free), Salé, Témara, Harhoura, Skhirat, Bouknadel, Kénitra.
- **WhatsApp flow**: the buyer confirms the address, shares a location pin, or types the address in a message (the checkout address is optional), then gets tracking updates. The seller gets new-order alerts and moves the order forward.
- **One seller**: Distri Nord takes every order and delivers it. Its WhatsApp number is set in the dashboard settings (`NEXT_PUBLIC_SELLER_PHONE` only sets the starting value).
- French and Arabic (RTL): `/fr`, `/ar`.
- **Seller dashboard has no public address**: it is served only at `/<ADMIN_PATH>` (secret, server-side env) behind a login (`ADMIN_USER` / `ADMIN_PASSWORD`, HTTP Basic auth). Nothing in the shop links to it, `/admin` is a plain 404, and the secret never ships to the browser. See `src/proxy.ts` and `.env.example`. Without `ADMIN_PATH` the dashboard is unreachable.
- **Everything is configurable from the dashboard**: `/<ADMIN_PATH>/parametres` (store name, slogan and home texts in fr/ar, minimum order, seller WhatsApp number, low-stock alert, delivery window, delivery zones with fees, categories) and `/<ADMIN_PATH>/produits` (add, edit, hide or delete products; prices, lot size, stock, badge, colour).

## WhatsApp (real messages)
The order conversations run on the **WhatsApp Cloud API** (Meta). Without it, or while it is switched off in **Paramètres › WhatsApp automatique**, the shop shows the scripted demo conversation.

How it works:
- When an order is placed or changes status (shop or dashboard), the server action that saved it (`src/lib/actions.ts`) calls `syncOrderToWhatsApp` right after responding (`POST /api/whatsapp/sync` does the same on demand). It reads the order and sends what its status calls for, once per status (`src/lib/wa/flows.ts`).
- Buyer: an approved template with the order, the total to pay in cash and the address, with **Confirmer l'adresse** / **Changer l'adresse** buttons. The buyer can also send a location pin or type the address; the order is then confirmed. Then "en route" and "livrée" messages.
- Seller (`sellerPhone`): new-order alert with **Confirmer** / **Annuler**, then **Lancer la livraison** and **Marquer livrée** buttons. Tapping them moves the order, and the buyer is told.
- Replies arrive at `POST /api/whatsapp/webhook` (signature checked with the app secret). Every message is logged on the order (`waLog`) and shown in the dashboard's conversation view and on the buyer's order page.
- Business-initiated messages use templates (`src/lib/wa/templates.ts`). The dashboard creates them on Meta with one button and shows their approval status.

Setup:
1. developers.facebook.com › Create app (Business) › add **WhatsApp**. The test number works for up to 5 registered recipient phones.
2. The sending number must be different from the seller's alert number (a number can't message itself).
3. In Vercel, set `WHATSAPP_TOKEN` (System user token with `whatsapp_business_messaging` and `whatsapp_business_management`), `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_WABA_ID`, `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN` (any random string), and the Firebase service account `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY`. Redeploy.
4. Meta app › WhatsApp › Configuration › Webhook: URL `https://<domain>/api/whatsapp/webhook`, verify token = `WHATSAPP_VERIFY_TOKEN`, subscribe to `messages`.
5. Dashboard › Paramètres › WhatsApp automatique: check the connection, **Créer les modèles manquants**, wait for approval, send a test, then switch it on.
6. After adding or changing any of these variables in Vercel, redeploy: Vercel only reads them at deploy time. If Meta says it can't validate the webhook, open `/api/whatsapp/webhook?hub.mode=subscribe&hub.challenge=ok&hub.verify_token=<token>`: it answers `ok`, or says whether the token is missing or different.
7. Deploy the Firestore rules (`firebase deploy --only firestore:rules`): the `wa_*` collections are server only.

## Stack
Next.js 16 (App Router) · Tailwind CSS 4 · Firestore (firebase-admin, server only) · Vercel.

## Data and security
Products, settings, zones and orders live in Firestore and are read and written only on the server, with the service account (`src/lib/firebase-admin.ts`, `src/lib/server/data.ts`, server actions in `src/lib/actions.ts`). `firestore.rules` refuses every other request, so customer orders cannot be read with the public project id. Shop pages are rendered with the real catalogue and cached; every dashboard change refreshes them. Only the cart is kept in the browser.

- Vercel needs `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY` in Production **and** Preview. Without the service account the shop fails loudly instead of showing demo data.
- Deploy `firestore.rules` from the Firebase console (Firestore › Rules) or with `firebase deploy --only firestore:rules`. Vercel does not deploy them.
- Turn on Firestore backups (Firestore › Disaster recovery) and point-in-time recovery.
- Test locally only against the Firestore emulator (`FIRESTORE_EMULATOR_HOST`); `scripts/seed-firestore.mjs` fills it and refuses to run without it.

## Product photos
Sample products use front photos from [Open Food Facts](https://world.openfoodfacts.org) (open data, CC BY-SA, credited in the footer), linked by URL. In the dashboard a product can get a photo by upload (JPEG, PNG or WebP), by link, or by its barcode. Products without a photo keep the coloured tile.

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
