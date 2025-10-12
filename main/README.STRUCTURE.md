# PixieKat Main App Structure

This document describes the detailed structure of the PixieKat main app, including all major folders, files, and the purpose of each section. It is organized for clarity and scalability, following best practices for modern React/Vite projects.

---

## Root Structure

```
main/
│
├── public/           # Static assets (served as root)
│   ├── audio/
│   ├── fonts/
│   ├── img/
│   │   ├── games/         # Game card images (cs2-card.svg, etc.)
│   │   ├── hero/          # Hero section images (Jinx.png, Faze.png, etc.)
│   │   ├── loading/       # Loading animation images
│   │   ├── partners/      # Partner logos
│   │   ├── Singleproduct/ # Single product images
│   │   └── team/          # Team member images
│   └── videos/            # Video assets
│
├── src/              # Main source code
│   ├── app/          # App directory (Next.js/React Router style)
│   │   ├── (auth)/           # Auth pages (login, sign-up, protected)
│   │   ├── (user)/           # User dashboard, orders, profile
│   │   ├── about-us/         # About page
│   │   ├── api/              # API route handlers (auth, login, signup, etc.)
│   │   ├── blogs/            # Blog page
│   │   ├── contact-us/       # Contact page
│   │   └── products/         # Product listing and details
│   ├── assets/       # App-specific static assets (e.g., react.svg)
│   ├── components/   # Reusable UI components
│   │   ├── Homepage/         # Homepage blocks (see below)
│   │   ├── Games/            # Game page blocks (see below)
│   │   └── ...               # Other shared components
│   ├── contexts/     # React context providers (e.g., AuthContext)
│   ├── Homepage/     # Standalone homepage components
│   ├── pages/        # Top-level pages (Games, FAQ, Pricing, etc.)
│   ├── animations/   # Animation utilities, hooks, and components
│   │   ├── components/       # Animation UI blocks (e.g., HoverCard, ParallaxSection)
│   │   ├── examples/         # Example usages
│   │   ├── hooks/            # Custom animation hooks
│   │   ├── sections/         # Animation section blocks
│   │   └── styles/           # Animation CSS
│   ├── public/       # (empty, for future use)
│   ├── shared/       # (empty, for future use)
│   ├── utils/        # (empty, for future use)
│   ├── App.jsx       # Main App component
│   ├── main.jsx      # Entry point
│   └── CompleteAnimationDemo.jsx
│
├── index.html        # Main HTML file
├── index.css         # Global styles (Tailwind, fonts, etc.)
├── package.json      # Project dependencies
├── vite.config.js    # Vite configuration
└── ...               # Other config files
```

---

## Homepage Section Blocks (`src/components/Homepage/`)
- **Hero.jsx**: Main hero section with animated video, parallax images (Jinx, Faze, Melissa), interactive cards (Contact Us, Popular Games), and mobile/desktop variants.
- **About.jsx**: About PixieKat block.
- **Features.jsx**: Feature highlights, includes `BentoTilt` and `BentoCard` components.
- **Story.jsx**: Brand or product story section.
- **Contact.jsx**: Contact form or info block.
- **Footer.jsx**: Site footer.
- **GameFeatures.jsx**: Game-specific features for homepage.
- **SingleProduct.jsx**: Featured product block.

## Game Page Blocks (`src/components/Games/`)
- **GameHero.jsx**: Hero section for the games page.
- **GameGrid.jsx**: Grid of available games.
- **GameDetailsModal.jsx**: Modal for game details.
- **ContactSection.jsx**: Contact/help section for games.
- **MobileActionButtons.jsx**: Mobile-specific action buttons.
- **MobileHelpSection.jsx**: Mobile help section.
- **FloatingParticles.jsx**: Animated background particles.

## Animations (`src/animations/`)
- **components/**: Animation UI blocks (e.g., HoverCard, ParallaxSection, SplitTextReveal, etc.)
- **hooks/**: Custom React hooks for animation logic (e.g., useParallaxScroll, use3DHoverEffect)
- **sections/**: Prebuilt animated sections (e.g., DiscoverSection, MetagameLayerSection)
- **examples/**: Example usages of animation components
- **styles/**: Animation-specific CSS

## Pages (`src/pages/`)
- **Games.jsx**: Main games page (uses GameHero, GameGrid, etc.)
- **FAQ.jsx**: Frequently asked questions
- **Pricing.jsx**: Pricing info
- **Support.jsx**: Support/help page
- **HowItWorks.jsx**: How PixieKat works
- **Auth.jsx**: Authentication page

## App Directory (`src/app/`)
- **(auth)/**: Auth flows (login, sign-up, protected)
- **(user)/**: User dashboard, orders, profile
- **about-us/**: About page
- **api/**: API route handlers (auth, login, signup, etc.)
- **blogs/**: Blog page
- **contact-us/**: Contact page
- **products/**: Product listing and details (with dynamic [productId] route)

## Contexts (`src/contexts/`)
- **AuthContext.jsx**: Authentication context provider

## Assets & Public
- **public/fonts/**: Custom fonts (woff2, ttf)
- **public/img/**: Images for games, hero, loading, partners, products, team
- **public/videos/**: Video assets for hero and features

---

## Example: Hero Section Block
- Animated video background
- Parallax character images (Jinx, Faze, Melissa)
- Interactive cards (Contact Us, Popular Games)
- Mobile/desktop variants
- Topup Now button
- Title and subtitle

## Example: Game Page
- GameHero: Animated hero for games
- GameGrid: List/grid of games
- GameDetailsModal: Modal for game info
- ContactSection: Help/contact for games
- MobileActionButtons: Mobile quick actions
- FloatingParticles: Animated background

---

This structure is designed for scalability, maintainability, and clear separation of concerns. Each section and page is modular, and assets are organized for easy access and updates.
