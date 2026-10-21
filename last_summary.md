# Last Session Summary

## FK-violation fix: order-referenced products (2026-10-21)

- Error: `update or delete on table "products" violates foreign key
  constraint "orders_product_id_fkey"`. Cause: `orders.product_id →
  products.id` is `ON DELETE RESTRICT` (migrations 010/052), while
  `catalogService.replaceProducts()` wipe-and-reinserted all of a game's
  products on every save — breaking Game Editor saves, provider resyncs
  (`syncProviderProducts`), `deleteProduct`, and `deleteGame` (cascade)
  once a game had orders.
- `replaceProducts` is now id-stable: upserts drafts preserving existing
  ids (new drafts get `crypto.randomUUID()`), hard-deletes removed rows,
  and on FK error retires removed rows to `status='inactive'` instead of
  failing. Returns `{ products, archived }` — `products` stays index-
  aligned with input drafts, so GameEditor's metadata remap still works.
- `deleteProduct`/`deleteGame` now return `'deleted' | 'archived'` and
  fall back to `status='inactive'` on 23503. ProductsList, GamesList and
  GameEditor show "has orders — kept as Inactive" toasts and update rows
  in place. Soft-deleted packages reappear in the editor as inactive —
  intended; they must exist as order FK targets.
- Verified: `npm run typecheck` clean, eslint clean on touched files.
- Seed scripts `seed-new-games.mjs` / `seed-kazutora-games.mjs` still do
  raw `delete().eq('game_id')` — will fail if re-run on games with
  orders; left as-is (one-shot emitters for already-applied migrations).

## Still pending (from prior sessions)

- Uncommitted tree work: auth-screen mobile chrome fix
  (`main/src/App.jsx`, `pages/auth/index.jsx`), `main/server/aluu.js`
  crypto-order client + tests, LazyVideo/index.html perf edits,
  `scripts/gif-frames.mjs`, `scripts/set-site-graphic.js`.
- `videos/pixiekat-portal-hop/` 9:16 render not built.
- JJK promo 9th Exclusive card → 4+4+1 grid; MCGG/BGMI art low-res.
- Open media slots: `contact_left_bottom`, `contact_right_back`,
  `contact_right_front`, products slider images.
