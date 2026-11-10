# Last summary — Pixie-Kat

## 2026-11-10 — Kagura Exclusive Offer → CMS

- Removed hardcoded `KAGURA_LEGEND_PROMO` from `ExclusiveOffers.jsx`; grid uses `promotional_items` (+ optional JJK homepage placement).
- Migration `059_kagura_exclusive_offer.sql` applied to prod: **Kagura Legend · draw plan** at `sort_order` 0.
- Admin: **Pages → Homepage → Exclusive Offers** — edit image, link, flag `EVENT`, active, schedule.
- Implemented the Kagura motion redesign on main: route-aware global intro handoff, artwork-ready themed lantern gate loader with Skip/Escape and bounded fallback, Lenis 1.3.27 wheel smoothing, native touch and anchor support.
- Bill story now uses three illustrated overlapping frames driven by GSAP ScrollTrigger on desktop (1.65 viewport scroll distance), with normal-flow mobile/short-screen fallback. Map artwork sways/glows inside stable buttons.
- OS and account reduced-motion disable loader, Lenis, pinning and ambient motion. Loader background stays inert through opening; animations, ticker, listeners and styles clean up on route exit.
- Browser QA: 1366x768 measured changing frame matrices across scroll; wheel moved316px at80ms then settled600px; lantern rotation changed0.54 to3.59 degrees. Loader Skip restored overflow, day selection/checklist worked. Mobile390px had scrollWidth390/no pins; app reduced mode had no loader/Lenis/pins/sway. Reviewed loader, overlapping frames and mobile screenshots.
- Production build and seven Kagura planner tests passed. Reviewed for release to main and admin; Amplify publishes the storefront from main.
