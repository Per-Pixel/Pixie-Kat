# Last Session Summary

## Local API server restarted for Aluu Pay (2026-10-23)

Started `main/server` with `npm run dev` (node --watch) — listening on
http://localhost:3001. Verified `/api/health` ok and
`/api/aluu/check-payment` live (401 without auth, as expected).
`ALUU_USER_TOKEN` / `ALUU_WEBHOOK_SECRET` are present in `main/server/.env`,
so the Aluu UPI endpoints are functional locally.

## Carried over (still pending)

- `videos/pixiekat-portal-hop/` 9:16 render not built.
- MCGG/BGMI card art low-res.
- Open media slots: `contact_left_bottom`, `contact_right_back`,
  `contact_right_front`, products slider images.
- Seed scripts still do raw product deletes — will fail on games with
  orders if re-run (left as-is).
- Someday: `VALIDATE` the two NOT VALID constraints from 052; arm the
  010 protect_*_on_update triggers intentionally.
- Going live: `rzp_live` keys + webhook secret +
  `ONLINE_PAYMENTS_ENABLED` flip + apply 055 + confirm SUPER_ADMIN_*
  env on EB. Crypto top-up client (aluu.js) still not wired into
  index.js endpoints.
