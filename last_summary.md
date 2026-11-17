# Last summary — Pixie-Kat

## 2026-11-17 — Optional email verification (deployed)

- **Live**: New accounts can sign in as soon as they are created. Verification only locks the username.
- **Shipped**: `main` `509117c` (Amplify job 131 succeeded), `admin` `538c937` (Amplify job 69 succeeded), API `app-261117_131347521286` on `pixiekat-api-prod`. `POST /api/auth/register` on pixiekat.store returns 400 for an empty body.
- **Database**: `064_optional_email_verify.sql` was already applied. Trigger `lock_verified_username` is on production.
- **Customer path**: Account → Security emails a link (check spam) or they ask support / WhatsApp. Staff: user Security → Mark email verified.
