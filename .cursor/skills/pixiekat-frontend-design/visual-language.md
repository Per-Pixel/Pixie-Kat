# Pixie-Kat Visual Language (reference)

Extracted from `main/` storefront. Read when implementing UI beyond the SKILL.md quick rules.

## Stack

- React 18 + Vite + React Router
- Tailwind 3 (`main/tailwind.config.js`) + global `main/index.css`
- Motion: GSAP / `@gsap/react` / ScrollTrigger, Framer Motion
- Icons: `react-icons`, `lucide-react`
- Content: Supabase-backed CMS settings (hero, appearance, event pages)

## Brand

- **Name:** PixieKat (CMS may override `header_brand_text`)
- **Job:** Instant gaming credit top-ups — fast, secure, affordable
- **Tone:** High-energy gaming / esports marketing, not corporate SaaS
- **Signature:** Full-bleed video hero with layered character art, oversized Zentry wordmarks, clip-path scroll chapters, acid-yellow CTAs on lavender fields

## Color tokens (`main/tailwind.config.js`)

| Token | Hex | Typical use |
| --- | --- | --- |
| `blue.50` | `#DFDFF0` | Body / page wash |
| `blue.75` | `#dfdff2` | Hero frame, soft panels |
| `blue.100` | `#F0F2FA` | Light text on dark / soft fill |
| `blue.200` | `#010101` | Near-black (named under blue scale) |
| `blue.300` | `#4FB7DD` | Cyan accent, gradients |
| `violet.300` | `#5724ff` | Brand violet, gradients |
| `yellow.100` | `#8e983f` | Olive accent (rare) |
| `yellow.300` | `#edff66` | Primary CTA punch |

### Recurrent non-token hex

| Hex | Where |
| --- | --- |
| `#0E041D` | Nav dark text / hover fill |
| `#6c49ff` → `#8b6dff` | Account / settings primary buttons |
| `#7a5bff` → `#b097ff` | Avatar rings |
| `#6542ff` → `#9a73ff` | Wallet CTAs |

### Event scope example (JJK cheaper)

Scoped on `.jjk-page` in `jjk-cheaper.css` — keep event-local:

- Void `#07060f` / panel stone `#eceaf6` / dim `#d6d2e8`
- Ink `#0c0a14` / muted `#5c5872`
- Red `#ff2f48`, cyan `#2ee0f7`, violet `#8a55ff`, acid CTA `#edff66`
- Display: Exo 2; body: Sora
- Signature: dark domain wash + light dossier panels; preserve sticky/scroll-timeline class structure

## Typography

| Role | Family | Tailwind / class |
| --- | --- | --- |
| Default body | General Sans (CDN) | `body` in `index.css` |
| Display | zentry (`/fonts/zentry-regular.woff2`) | `font-zentry`, `.special-font b` |
| General UI | general | `font-general` |
| Circular | circular-web | `font-circular-web` |
| Robert | robert-medium / robert-regular | `font-robert-medium`, `font-robert-regular` |

### Display patterns

- `.hero-heading` — uppercase, black weight, scales to `lg:text-[12rem]`
- `.animated-title` / `.animated-word` — 3D scroll reveal via GSAP
- `.bento-title` — uppercase Zentry section titles
- Button labels — `font-general text-xs uppercase` with skew-slide hover

## Layout & components

- App shell: `Navbar` + routes + `Footer` + `BottomNav` (`main/src/App.jsx`)
- Home sections: Hero → TrendingGames → About → Features → Story → Contact
- Info pages: wrap in `PageWrapper` (Framer fade/slide, `min-h-screen bg-dark-900 pt-24`)
- Buttons: `Button`, `SlideTextButton`, `MobileSquareButton`
- Borders: `.border-hsla` = `border-white/20`
- Cards: used on games/support/account; home marketing prefers open layout, bento tiles, clip-path frames — not generic card grids in the hero
- Clip-path utilities: `.mask-clip-path`, `.sword-man-clip-path`, `.contact-clip-path-*`, story mask polygons
- Nav: floating pill on scroll (`.floating-nav`), audio indicator bars, route-aware light/dark text

## Motion conventions

| Pattern | Tool | Examples |
| --- | --- | --- |
| Scroll storytelling / pins / clip expands | GSAP ScrollTrigger | Hero video frame, About mask, AnimatedTitle, Footer |
| Page enter / exit | Framer Motion | `PageWrapper` |
| Micro UI | CSS + Framer | FAQ accordion, game modals, mobile help |
| Ambient | GSAP loops / CSS | Floating hero characters, particles |
| Boot | GSAP timeline | Full-screen loader gallery |

Reuse `main/src/animations/` (`ClipPathExpand`, `VideoFrame`, `HoverEffect3D`, parallax hooks) before writing one-off timelines.

Reduced motion: partially respected in Hero parallax; extend `prefers-reduced-motion` when adding heavy motion.

## CMS integration

- Hero copy/media: `store_settings.hero_settings`
- Appearance (logo, brand text, music): `AppearanceContext`
- Event pages: dedicated settings tables (e.g. `event_jjk_cheaper_settings`)

Rules:

1. Keep template DOM/CSS/GSAP structure intact.
2. Map CMS strings/URLs into existing nodes only.
3. Sanitize numeric layout fallbacks (`minHeight`, scales) so empty CMS never collapses a pin/scroll section.
4. After late-loading fonts/images, refresh ScrollTrigger where existing code already does (see About).

## Known gaps (don't paper over blindly)

- `neon-*` and `dark-*` utilities used in pricing/FAQ/nav but missing from `tailwind.config.js`
- `safelist` array incorrectly nested under `theme.extend.colors`
- Motion utilities split across `index.css` and `src/animations/styles/animations.css`

When fixing tokens, centralize in Tailwind theme rather than scattering more arbitrary hex.

## Admin (out of scope)

`admin/` — Inter, gray/blue Tailwind scales, `.btn` / `.card` utility classes. Use for CMS chrome only; never as the storefront design source.
