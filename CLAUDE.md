# Working on this repo

- Storefront URLs are `/{locale}` with `fr` (default) and `ar` (RTL). Strings live in `src/i18n/dict.ts`; add both languages for every string.
- Use logical CSS (start/end, `ms-`/`pe-`), never left/right.
- The 100 DH minimum is `MIN_CART` in `src/lib/shop.ts`. Never let checkout through below it.
- Payment is cash on delivery only.
- Demo data lives in `localStorage` via `src/lib/store.tsx` until Supabase is wired.
- Run `npm run lint && npm run typecheck && npm run build` before pushing.
