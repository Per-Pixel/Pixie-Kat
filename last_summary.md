# Last Session Summary

## This session: AWS cost audit + Yokcash provider research

### Yokcash API (docs.yokcash.com) — candidate provider alongside Smile/Smilecoin
- JSON POST to `https://api.yokcash.com/` — endpoints: `service` (catalog, IDR
  price tiers harga/gold/silver/pro), `order`, `status`, `saldo`.
- Auth = `api_key` in body + **server IP must be registered in their dashboard**
  (same whitelist constraint as SmileCode).
- `target` = `userId|zoneId` (pipe-separated, maps straight to MLBB
  user_id/zone_id). `idtrx` = our order id, deduped server-side.
- Callbacks arrive from THEIR IP `103.146.202.42` — validate `getClientIp(req)`
  on our callback route when implemented. Callback param marked "(SOON)".
- Prices are IDR → need FX handling vs INR storefront pricing.
- NOT implemented yet — no code written.
- Status: user got the API key from Yokcash admin via chat; admin said "otw"
  on whitelisting our IP. Key saved locally as `YOKCASH_API_KEY` in
  `main/server/.env` AND pushed to EB env `pixiekat-api-prod`
  (update-environment merge — all 28 prior vars intact, env back Ready/Green).
  Next: build `main/server/yokcash.js` + admin debug route (mirror the
  `/api/admin/sc-*` pattern), `eb deploy`, test /saldo + /service from prod.
- Oddity spotted in EB env vars (left as-is): `VITE_MAIN_SITE_UR` (truncated
  name, unused by server code) and a literal junk var named
  `ser is log in automatic fill the PORT`. Safe cleanup candidates.

### AWS bill investigation (account 147826551459, IAM user Admin_PixieKat)
Sept bill ~$31.50. Root causes found and **removed** (user-confirmed):
- `pixiekat-api-prod-v2` EB env in ap-southeast-1 (Singapore) — leftover July
  deployment: t3.micro + Classic LB across 2 AZs = 3 public IPs (~$10.69/mo IPs;
  would jump ~$26/mo more when EC2/ELB free tier lapses). **Terminated** —
  instance shutting down, CLB + IPs released with it.
- `pixiekat-main` Amplify app (d8mwmwzadn7qk, Singapore) — old duplicate of the
  Mumbai app. **Deleted.**
- Orphaned WAF WebACL `CreatedByAmplify-d36qca47rnuu5h...` (global/us-east-1,
  $8.90/mo) — the Amplify app it protected no longer exists in any region.
  **Deleted** (needed LockToken from get-web-acl).
- Kept: Mumbai prod EB `pixiekat-api-prod` (t3.micro + EIP **35.154.145.21**),
  Mumbai Amplify `Pixie-Kat` (d2qve07e257e1q). Expected Oct bill ≈ $12 + tax.

### IP-whitelist answer (SmileCode + Yokcash)
- EB single-instance env has EB-managed Elastic IP **35.154.145.21** — survives
  deploys/instance replacement; released only if the ENV is terminated/rebuilt.
- Whitelist that IP in smile.one portal (fixes SmileCode "IP-whitelist
  failures" worked around at index.js:1341) and in Yokcash dashboard.
- Permanent fix if ever needed: private subnets + NAT gateway + own EIP
  (~$32/mo) — also required for load-balanced envs.

### Environment notes
- AWS CLI on this machine: configured, ap-south-1 default, admin-level IAM user.
- Shell is PowerShell — no `&&`, no bash loops; write `--filter` JSON to file
  with `file://` for aws ce calls.
- Billing usage-type prefixes: APS1 = ap-southeast-1 (Singapore), APS3 =
  ap-south-1 (Mumbai).
- ap-south-2 is not opted-in on this account (APIs fail auth — normal).
- Public IPv4 ($0.005/hr ≈ $3.65/mo each) is NOT free-tier covered — was ~60%
  of the bill.

### Prior session state (still true)
- MLBB double-pack promo note on GamePage.jsx was committed last session per
  prior summary lineage; EB API deploy is manual (`eb deploy`); Amplify
  auto-builds on push to main.
- `main/.env.local` (gitignored) points dev at prod API for live catalog data.
