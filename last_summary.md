# Last session summary

- **Aluu UPI invalid QR**: Game checkout stored WhatsApp under `metadata.contact.whatsapp`, but `place-order` only read `customer_mobile` / `contact_phone`, so Aluu always got `0000000000` and the hosted pay page showed a broken QR/image. Fixed by `normalizeIndianMobile()` in `main/server/aluu.js` and wiring all Aluu create-order paths (game, cart, wallet/membership) to use it with clear errors when the number is missing.
- **Deploy**: API change only — run `eb deploy` from `main/server` for production; Amplify storefront unchanged.
