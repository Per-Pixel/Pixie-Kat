# Last Session Summary

## PixieKat promo motion graphic + site integration (2026-10-09)

- Built `videos/pixiekat-promo/` — a HyperFrames project rendering a 15s,
  1920x1080 @30fps promo: `renders/pixiekat-promo.mp4` (h264+AAC, ~19.3 MB).
  Five beat-synced scenes (187.5 BPM, `beats/assets/loop.mp3.json`): video-in-
  text "GAME ON" hook → League (splash strobes + real Riot ability clips in a
  3D card + RP marquee) → Mobile Legends (slat reveal, 6 cut splashes, diamond
  bag + 0→9,288 count-up) → 3-step how-it-works with mock checkout card →
  lavender end card with logo + TOP UP NOW CTA.
- Assets: LoL splashes/clips from Riot public CDN (ddragon + d28xe8vt774jo5),
  7 MLBB 4K wallpapers from static.zerochan.net, brand fonts/logo from the
  repo, `loop.mp3` soundtrack with `data-automation` volume fade.
- Tooling: installed FFmpeg (winget Gyan.FFmpeg) + Chrome Headless Shell
  (`hyperframes browser ensure`). ffmpeg on PATH only in new shells.
- **Media serving gotcha**: storefront `publicMediaUrl()` maps every
  `/img|videos|audio/...` path to the Supabase `public-media` bucket — repo
  `public/` files are NOT served when `VITE_SUPABASE_URL` is set. New media
  must be uploaded to the bucket (anon key denied by RLS; used
  `SUPABASE_SERVICE_ROLE_KEY` from `main/server/.env`). Uploaded:
  `videos/pixiekat-promo.mp4`, `img/hero/promo-poster.jpg`.
- Site wiring: `Features.jsx` main bento video → promo + new `ctaText`/
  `ctaLink` overlay button (TOP UP NOW → /games). `Hero.jsx` got a
  `show_images` flag gating the character parallax (CMS-controlled);
  `hero_settings.background_video` briefly pointed at promo then reverted to
  hero-1.mp4 per user. admin `mediaService.ts` feature_main_video fallback
  updated to match.
- Note: game art is copyrighted — user-approved, but flag before public/ads
  use (Riot fan-content = non-commercial; Moonton stricter).
- Verified: `hyperframes check` clean, `npm test` 53/53, eslint 0 errors.
- Untracked leftover: `supabase/.temp/` (pre-existing, unrelated).
