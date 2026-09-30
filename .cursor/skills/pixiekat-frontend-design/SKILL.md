---
name: pixiekat-frontend-design
description: >-
  Pixie-Kat storefront UI design: brand tokens, typography, motion, and surface
  conventions extracted from main/. Use when designing, redesigning, polishing,
  or building any UI, landing page, hero, marketing section, event page, or
  visual redesign in this repo. Thin wrapper over frontend-design and impeccable;
  prefer this skill's tokens over generic AI defaults.
---

# Pixie-Kat Frontend Design

Storefront design for **PixieKat** — instant gaming credits. Motion-heavy, esports/gaming energy: lavender paper surfaces, acid yellow CTAs, electric violet accents, oversized Zentry display type, clip-path storytelling.

Admin (`admin/`) is a separate Inter utility UI — do not mix its patterns into the storefront.

## Upstream skills (required)

Before inventing layout or aesthetic direction, read and follow:

1. **`frontend-design`** — distinctive direction, anti-template critique, signature element
2. **`impeccable`** — craft, contrast, type ceilings, motion quality, command flows when invoked

Then **constrain every choice to this repo's visual language** below (and [visual-language.md](visual-language.md)). Pixie-Kat identity wins over generic "beautiful landing page" defaults.

## Surface map (pick the right mode)

| Surface | Look | Primary files |
| --- | --- | --- |
| Home / brand marketing | Light lavender (`blue-50`/`75`), Zentry headlines, yellow CTA, video + character layers | `main/src/pages/home/`, `main/index.css` utilities |
| Info pages | Dark shell (`PageWrapper` → `bg-dark-900`), neon gradient accents | `pricing`, `faq`, `support`, `how-it-works` |
| Account / wallet | Soft glass cards, violet→lilac gradients (`#6c49ff` → `#8b6dff`) | `main/src/pages/account/`, `wallet/` |
| Event microsites | Scoped CSS tokens (e.g. JJK paper/ink) — do not leak into global theme | `main/src/pages/events/*/` |
| Admin CMS | Inter + gray/blue utility — out of scope for this skill | `admin/` |

## Hard rules for this codebase

1. **Reuse tokens, don't invent parallel palettes.** Prefer `blue.*`, `violet.300`, `yellow.300` from `main/tailwind.config.js` and existing hex gradients already in components.
2. **Typography roles stay fixed:**
   - Display / hero: `font-zentry` + `.special-font` / `.hero-heading`
   - UI labels / buttons: `font-general`, uppercase, small (`text-xs`)
   - Body / subcopy: `font-robert-regular` or `font-circular-web`
   - Default body stack: General Sans (CDN) on `body`
3. **Primary CTA pattern:** pill (`rounded-full`) via `components/common/Button.jsx` — skew-slide label on hover. Accent fill often `bg-yellow-300` or violet tint; don't replace with generic indigo buttons.
4. **Motion is first-class:** GSAP + ScrollTrigger for scroll storytelling; Framer Motion for route/page chrome (`PageWrapper`) and secondary pages. Prefer existing hooks/components under `main/src/animations/`.
5. **CMS / animation wiring:** Preserve proven DOM + CSS + GSAP structure. Inject text/data only. Sanitize DB defaults (`minHeight`, etc.) so containers cannot collapse. Never pile ad-hoc transforms on pinned/animated nodes.
6. **Scroll safety:** Prefer `overflow-x: clip` on `html`/`body` (not `hidden` + `100dvw`) so `position: sticky` keeps working. Event pages that need sticky must keep overflow visible on the pin ancestors.
7. **Hero budget (marketing):** Brand name is hero-level; one headline, one short line, one CTA group, one dominant visual plane. No card grids or stat strips in the first viewport unless the existing section already does that.
8. **Desktop vs mobile:** Several modules intentionally diverge (e.g. Hero character layers, mobile square buttons). Match that split; don't force one layout everywhere.

## Quick palette (storefront)

| Role | Token / value |
| --- | --- |
| Page wash | `#dfdff0` (`blue-50` / body bg) |
| Soft surface | `#dfdff2` (`blue-75`), `#F0F2FA` (`blue-100`) |
| Ink / near-black | `#010101` (`blue.200`), nav dark `#0E041D` |
| Cyan accent | `#4FB7DD` (`blue.300`) |
| Brand violet | `#5724ff` (`violet.300`) |
| Acid CTA | `#edff66` (`yellow.300`) |
| Account gradients | `#6c49ff` → `#8b6dff`, `#5724ff` → `#4FB7DD` |

`neon-*` / `dark-*` classes appear in info pages but are **not** defined in `tailwind.config.js` (known gap). When extending those pages, match neighboring class usage or add real tokens — don't invent a third neon system.

## Workflow

1. Identify surface mode from the map above.
2. Read upstream `frontend-design` (+ `impeccable` if polishing/auditing).
3. Skim [visual-language.md](visual-language.md) and the nearest existing section component.
4. Implement with existing primitives (`Button`, `SlideTextButton`, `AnimatedTitle`, `PageWrapper`, clip-path utilities).
5. Self-check: still looks like PixieKat (lavender/violet/yellow + Zentry), not cream-serif, purple-on-white SaaS, or generic dark dashboard.

## Key files to open first

- `main/tailwind.config.js` — brand color + font families
- `main/index.css` — fonts, `.hero-heading`, clip-paths, loaders
- `main/src/components/common/Button.jsx`
- `main/src/pages/home/sections/Hero.jsx`
- `main/README.md` → Design System / Animation System
- Event work: matching `*-cheaper.css` / event folder tokens
