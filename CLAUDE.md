# Working on this repo

- Storefront URLs are `/{locale}` with `fr` (default) and `ar` (RTL). Strings live in `src/i18n/dict.ts`; add both languages for every string.
- Use logical CSS (start/end, `ms-`/`pe-`), never left/right.
- Everything the seller can change (store texts, minimum order, WhatsApp number, delivery window, zones, categories, products) lives in the config (`src/lib/config.ts` defaults, edited from the dashboard's `parametres` and `produits` pages). Never hard-code those values in components; read them from `useStore()`.
- Never let checkout through below `settings.minCart`.
- Payment is cash on delivery only.
- Demo data (cart, orders, config) lives in `localStorage` via `src/lib/store.tsx` until Supabase is wired.
- Run `npm run lint && npm run typecheck && npm run build` before pushing.
- The dashboard's internal route is `src/app/zq` (meaningless on purpose). Never link to it from the shop or name it "admin" anywhere public; it is reached only through `ADMIN_PATH` via `src/proxy.ts`. Dashboard links are built from the current URL prefix, never from an env var.
