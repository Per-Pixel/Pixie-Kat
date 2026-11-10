# Last summary — Pixie-Kat

## 2026-11-10 — Merge `admin` → `main` (Kagura + admin fixes)

### Shipped to `main` (Amplify storefront + shared tree)
- `/event/kagura-legend` draw planner and homepage Exclusive Offers card → Kagura plan (`9ed93db` lineage).
- Admin dashboard profit/cost rollups, UPI label for `aluu`, period analytics, and related fixes from `admin`.
- `chore`: Yokcash vars in `main/server/.env.example.aws`; AWS budget JSON templates under `scripts/`.

### Deploy
- **Storefront**: auto-build on push to `origin/main` (Amplify app `d2qve07e257e1q`, branch `main`).
- **Admin**: `origin/admin` already had Kagura + fixes; Amplify branch `admin`.
- **API** (if server changes in merge): `eb deploy` from `main/server` when needed.

### Prior on `main`
- `expireStalePendingOrders`: pending gateway checkouts >24h → `failed` (Aluu last-chance paid check).
