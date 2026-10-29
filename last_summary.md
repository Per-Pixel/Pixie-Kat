# Last session summary

Re-enabled **Aluu Pay (UPI)** on the storefront after it was hidden behind the October online-payments kill switch (originally disabled because Razorpay test keys allowed fake fulfillment).

- **Server** (`main/server/index.js`): Split kill switch into `ALUU_CHECKOUT_ENABLED = true` and `RAZORPAY_CHECKOUT_ENABLED = false` with `onlineCheckoutBlocked()` used on place-order, cart-checkout, wallet top-up, and membership purchase.
- **Storefront**: Restored UPI option on game checkout, cart, and Add Coins (`GamePage.jsx`, `cart/index.jsx`, `AddMoneyPage.jsx`); Razorpay UI stays off until production keys are configured.
- **Dev**: Started `npm run dev:all` — storefront `http://localhost:5173/`, API `:3001`, admin `:5174/`. Local `ALUU_USER_TOKEN` is set.
- **Production**: Changes are local only until `main` is pushed (Amplify storefront) and API is `eb deploy` from `main/server`.
