# Last Session Summary

## Auth screen mobile chrome fix (2026-10-16)

- User report: on some phones the "Sign up" link on `/login` was hidden.
- Root cause: `AppShell` rendered the storefront's fixed chrome over the
  dedicated auth screen — `BottomNav` (`fixed bottom-0 z-[150]`, mobile-only)
  covered the form's bottom Sign up/Sign in link, `NavBar` (`fixed top-4
  z-[100]`) covered the banner's Back button, and `FloatingActions` FABs
  floated over the form. `Footer` was already excluded via `isAuthRoute`;
  the other three were missed.
- Fix (`main/src/App.jsx`): added `!isAuthRoute` to NavBar, BottomNav, and
  FloatingActions conditions — `/login`, `/register`, `/reset-password` are
  now chrome-free standalone screens.
- Fix (`main/src/pages/auth/index.jsx`): `min-h-screen` → `min-h-svh` so the
  layout minimum matches the actually-visible viewport on mobile (old
  `100vh` includes the area behind browser toolbars; `svh`/`dvh` units are
  already used elsewhere — `h-dvh` in Hero/About/Story).
- Changelog: one-liner under Unreleased → Fixes.
- Verified: `eslint` clean on both files; dev-server screenshots at 390x844
  (`/login`) and 360x640 (`/register`, scrolled to bottom) show the
  Sign up/Sign in link and Back button fully visible, no overlapping chrome.

## Carried forward / pending

- Uncommitted in tree: this auth fix (App.jsx, auth/index.jsx, CHANGELOG)
  plus prior uncommitted work — `main/server/aluu.js` crypto-order client
  + tests (see previous summary's "NOT wired yet" list for checkout
  decisions: `payment_method` name, INR→USD FX source, ONLINE_PAYMENTS_ENABLED
  gate).
- `videos/pixiekat-portal-hop/` 9:16 render still not built.
- JJK promo 9th Exclusive card → 4+4+1 grid; MCGG/BGMI art low-res.
- Game art remains publisher IP — flag before paid-ad distribution.
