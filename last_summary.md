# Last session summary

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
- Working on `admin` from the Kagura Legend planner commit; redesign and animation pass prepared for storefront release.
- Replaced the horizontal day rail with a connected five-row lantern journey, milestone shortcuts, dates, and clear selected/completed/today states.
- Desktop map and checklist sit side by side; mobile uses natural page flow instead of a 240vh scroll gate. Section hierarchy, cost summary, route comparison and trap layout were redesigned.
- Added coordinated entrance, lantern, progress, checklist, FAQ and section motion with reduced-motion support. Day changes preserve the mounted checklist controls.
- Production build and seven planner tests passed. Edge desktop and 390px mobile screenshots reviewed; mobile document width matched viewport. Preview-only intro bypass was restored after QA.

- Added desktop sticky cost narrative (full price / savings / planned spend), compact mobile flow, GSAP heading and route path reveals, crest meter, correct glow and wrong-answer shake. Calculated values remain static and accurate; all timelines clean up and respect reduced motion. Build and seven planner tests pass.

