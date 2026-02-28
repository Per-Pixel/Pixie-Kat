# PixieKat.com (Main Frontend)

PixieKat.com is a React + Vite web frontend for instant gaming credit top-ups with a motion-heavy, responsive UI.

## Quick Navigation

- [At a Glance](#at-a-glance)
- [Tech Stack](#tech-stack)
- [Local Development](#local-development)
- [Scripts](#scripts)
- [Architecture Overview](#architecture-overview)
- [Route Map](#route-map)
- [Folder Structure](#folder-structure)
- [Design System](#design-system)
- [Animation System](#animation-system)
- [Key UI Flows](#key-ui-flows)
- [Component Ownership Map](#component-ownership-map)
- [Assets and Media Conventions](#assets-and-media-conventions)
- [Known Gaps and Risks](#known-gaps-and-risks)
- [Contribution Guidelines](#contribution-guidelines)
- [License and Credits](#license-and-credits)

## At a Glance

- Single-page React Router app mounted from `src/main.jsx` to `src/App.jsx`.
- Global app shell wraps all routes with `AuthProvider`, `Navbar`, `Footer`, and `BottomNav`.
- Home page is section-based (`Hero`, `TrendingGames`, `About`, `Features`, `Story`, `Contact`).
- Secondary pages (`games`, `pricing`, `faq`, `support`, `how-it-works`, `auth`) are route folders under `src/pages`.
- Motion is a first-class part of UX (GSAP + ScrollTrigger + Framer Motion + CSS keyframes).
- A custom full-screen loading sequence runs before app reveal.
- Desktop and mobile behaviors are intentionally differentiated in several page modules.

## Tech Stack

| Category | Libraries |
| --- | --- |
| Core | React 18, React DOM, React Router DOM 6, Vite 5 |
| Styling | Tailwind CSS, PostCSS, global `index.css` |
| Motion | GSAP, `@gsap/react`, Framer Motion |
| Data / Utilities | Axios, `react-use`, `clsx`, `jwt-decode` |
| UI / Icons | `react-icons`, `lucide-react` |
| Quality Tooling | ESLint, Prettier, TypeScript types |

## Local Development

### Prerequisites

- Node.js (LTS recommended)
- npm

### Setup and Run

```bash
npm install
npm run dev
```

App default URL: `http://localhost:5173`

### Build and Preview

```bash
npm run build
npm run preview
```

### Lint

```bash
npm run lint
```

Entrypoint flow: `src/main.jsx` -> `src/App.jsx`.

## Scripts

| Script | Command | Purpose |
| --- | --- | --- |
| `dev` | `vite` | Start local dev server |
| `build` | `vite build` | Create production build |
| `preview` | `vite preview` | Preview production build locally |
| `lint` | `eslint .` | Run lint checks |

## Architecture Overview

`src/App.jsx` composes the app shell and route system:

- Providers: `AuthProvider` (`src/contexts/AuthContext.jsx`)
- Router: `BrowserRouter` + `Routes`
- Layout: `Navbar` + route view + `Footer` + `BottomNav`
- Global loading gate: `components/common/Loading.tsx`

Pattern notes:

- Route pages live under `src/pages/<route>/index.jsx`.
- Shared cross-route UI is under `src/components/common` and `src/components/layout`.
- Some route pages wrap content in `PageWrapper` for consistent animated page entry and base surface styles.
- Legacy code is isolated under `src/legacy/next-app`.

## Route Map

Routes are defined in `src/App.jsx`.

| Route | Component |
| --- | --- |
| `/` | `src/pages/home/index.jsx` |
| `/games` | `src/pages/games/index.jsx` |
| `/pricing` | `src/pages/pricing/index.jsx` |
| `/faq` | `src/pages/faq/index.jsx` |
| `/support` | `src/pages/support/index.jsx` |
| `/how-it-works` | `src/pages/how-it-works/index.jsx` |
| `/auth` | `src/pages/auth/index.jsx` |
| `/login` | `src/pages/auth/index.jsx` |
| `/register` | `src/pages/auth/index.jsx` |

## Folder Structure

Current structure for `src/`:

```text
src/
  App.jsx
  main.jsx
  assets/
    react.svg
  animations/
    README.md
    components/
      SlideTextButton.jsx
    hooks/
      useParallaxScroll.js
    styles/
      animations.css
  contexts/
    AuthContext.jsx
  components/
    common/
      AnimatedTitle.jsx
      Button.jsx
      DropdownMenu.jsx
      FlipCard.jsx
      Loading.tsx
      MobileSquareButton.jsx
      PageWrapper.jsx
    layout/
      BottomNav.jsx
      Footer.jsx
      Navbar.jsx
  pages/
    auth/
      index.jsx
    faq/
      index.jsx
    games/
      index.jsx
      components/
        ContactSection.jsx
        FloatingParticles.jsx
        GameDetailsModal.jsx
        GameGrid.jsx
        GameHero.jsx
        MobileActionButtons.jsx
        MobileHelpSection.jsx
    home/
      index.jsx
      sections/
        About.jsx
        Contact.jsx
        Features.jsx
        Hero.jsx
        Story.jsx
        TrendingGames.jsx
    how-it-works/
      index.jsx
    pricing/
      index.jsx
    support/
      index.jsx
  legacy/
    README.md
    next-app/
      products/
        [productId]/
          page.tsx
```

## Design System

### Palette Tokens (`tailwind.config.js`)

| Token | Value |
| --- | --- |
| `blue.50` | `#DFDFF0` |
| `blue.75` | `#dfdff2` |
| `blue.100` | `#F0F2FA` |
| `blue.200` | `#010101` |
| `blue.300` | `#4FB7DD` |
| `violet.300` | `#5724ff` |
| `yellow.100` | `#8e983f` |
| `yellow.300` | `#edff66` |

### Surface and Theme Usage

| Pattern | Where It Appears |
| --- | --- |
| Light brand surfaces (`blue-*`, `yellow-*`) | Home hero, shared buttons, nav accents |
| Dark surface + neon gradient styling (`dark-*`, `neon-*`) | Pricing, FAQ, Support, How-it-works, parts of Auth |
| High-contrast white-on-dark cards | Support/FAQ/Pricing callouts and forms |

### Typography

Font sources in `index.css`:

- Imported: `General Sans` (CDN)
- Local `@font-face`: `circular-web`, `general`, `robert-medium`, `robert-regular`, `zentry`

Tailwind font families in `tailwind.config.js` map to those local font names.

### Color Usage by Page

| Area | Dominant Color Behavior |
| --- | --- |
| Home (`src/pages/home`) | `blue` + `yellow` brand tones, violet accent, media-heavy hero |
| Games (`src/pages/games`) | Mixed bright gradients and white card surfaces |
| Pricing / FAQ / Support / How-it-works | Dark backgrounds with neon gradient highlights (`neon-purple`, `neon-blue`, etc.) |
| Auth (`src/pages/auth`) | Dark gradient background with violet/blue accents |

## Animation System

### GSAP + ScrollTrigger

Primary usage:

- `src/pages/home/sections/Hero.jsx` (clip-path reveal, floating image loops, parallax hook)
- `src/pages/home/sections/About.jsx` (scroll-driven mask/clip behavior)
- `src/components/common/AnimatedTitle.jsx` (scroll-triggered word reveal)
- `src/components/common/Loading.tsx` (timeline-driven startup sequence)
- `src/components/layout/Navbar.jsx` and `src/components/common/DropdownMenu.jsx` (UI state transitions)

### Framer Motion

Primary usage:

- Route/page transitions via `src/components/common/PageWrapper.jsx`
- Rich section and card transitions on `games`, `pricing`, `faq`, `support`, `how-it-works`, `auth`
- Modal and interaction transitions (`GameDetailsModal`, mobile help/action components)

### CSS Animation Utilities and Keyframes

Defined mainly in `index.css` and `src/animations/styles/animations.css`:

- Loading/counter behavior (`indicator-line`, loader gallery transitions)
- Text shimmer / gradient shift helpers
- 3D/flip/perspective utility classes
- Hover and micro-interaction helpers

### Major Motion Patterns

- Full-screen loading gallery: grayscale-to-color reveal, scaling center frame, timed handoff to app shell.
- Scroll-linked reveal sequences: clip-path and mask-based storytelling sections.
- Interaction motion: hover tilt, flip cards, gradient button transitions, menu transitions.
- Ambient motion: floating particles and subtle bobbing loops.

### Accessibility Note

Reduced motion gating exists in `Hero.jsx` (`prefers-reduced-motion`) for parallax behavior. Most other motion remains active by default.

## Key UI Flows

- Home (`/`): loader -> hero video + layered assets -> section progression (`TrendingGames` -> `About` -> `Features` -> `Story` -> `Contact`).
- Games (`/games`): hero slider -> mobile quick actions -> game grid + modal -> help/contact blocks.
- Auth (`/auth`, `/login`, `/register`): animated auth form with login/register mode handling.
- Informational pages (`/pricing`, `/faq`, `/support`, `/how-it-works`): dark neon-themed content sections with staggered animated blocks and CTA zones.

## Component Ownership Map

| Area | Responsibility |
| --- | --- |
| `src/components/common` | Reusable primitives and cross-page building blocks (`Button`, `Loading`, `PageWrapper`, etc.) |
| `src/components/layout` | Global layout shell (`Navbar`, `Footer`, `BottomNav`) |
| `src/pages/*/components` | Route-local UI modules that should stay page-scoped |
| `src/animations/*` | Shared animation-focused helpers, hooks, and style layer |
| `src/contexts` | Global providers and state context (current: auth) |

## Assets and Media Conventions

Public assets are served from `main/public`:

- Images: `/img/...`
- Videos: `/videos/...`
- Audio: `/audio/...`
- Fonts: `/fonts/...`

Current loading hints used in components:

- `loading="lazy"`
- `decoding="async"`
- `fetchpriority="low"`

Use these conventions for new media to keep loading behavior consistent.

## Known Gaps and Risks

These are documented implementation observations, not code fixes:

- Token visibility mismatch: utility classes like `dark-*` and `neon-*` are used across pages, but those scales are not clearly defined in `tailwind.config.js` color extension.
- Config anomaly: `tailwind.config.js` currently includes a `safelist` array nested inside `theme.extend.colors`, which is likely misplaced.
- Style overlap risk: motion/utility classes are split across `index.css` and `src/animations/styles/animations.css` with some conceptual overlap.
- Legacy residue: `src/legacy/next-app` remains in repo and can cause confusion if contributors do not follow the route-folder convention in `src/pages`.

## Contribution Guidelines

- Add or modify routes in `src/pages/<route>/index.jsx` and wire them in `src/App.jsx`.
- Keep reusable UI in `src/components/common` and shell-only UI in `src/components/layout`.
- Keep page-specific components inside the owning route folder.
- Put shared motion helpers in `src/animations/*`; keep one-off animation logic near its page/component.
- Keep design token usage centralized in Tailwind config and document any new token groups in this README.
- Avoid introducing new global CSS utilities unless they are shared by multiple route families.

## License and Credits

- Project: PixieKat frontend (this `main/` app).
- Animation/style inspiration patterns are adapted from general modern React/GSAP UI practices.
- Existing third-party references in code comments are retained (for example, Uiverse loader snippet attribution in `index.css`).
- Historical template wording from prior README versions has been removed in favor of repository-accurate documentation.
