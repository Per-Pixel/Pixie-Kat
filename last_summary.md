# Last summary — Pixie-Kat

## 2026-11-10 — Preview meta (index.html)

- Root cause: `main/index.html` still had old **PixieKat System** dummy-site `<title>` and `<meta name="description">`; crawlers and deployment previews use that static HTML, not the React storefront.
- Updated title/description and basic Open Graph tags to match storefront (Instant Gaming Credits).
