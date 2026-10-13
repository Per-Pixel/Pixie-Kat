---
format: 1920x1080
duration: 15s
message: "Every game you love, topped up in seconds — PixieKat"
arc: Hook (the portal) → four worlds in one unbroken flight → pull-back reveal → CTA
audience: mobile/PC gamers in South & Southeast Asia shopping for in-game currency
mode: collaborative
variants: 1080x1920 vertical cut (vertical.html, re-laid-out from the same frames, not cropped)
---

# Portal Hop — v1

## Decisions

- **Message:** Every game you love, topped up in seconds — PixieKat.
- **Format:** 1920x1080 master (`index.html`) + 1080x1920 cut (`vertical.html`, rendered
  with `-c vertical.html`), 15.0s, 30fps. No voiceover, no captions, music yes.
- **Track:** "Night Terrors" (Arulo, Mixkit Free License), source window 57.605s → 72.605s.
  129.7 BPM: beat 0.4626s, bar 1.85s. Bar downbeats in video time: 0, 1.85, 3.70, 5.55,
  7.40, 9.25, 11.10, 12.95, 14.80. Silent hole at 0.5s, riser 1.5–1.85s, **DROP 1.85s**,
  sustained ~-8 dB, **dropout 8.75–9.25s**, **re-hit 9.25s**. Fade out 14.3→15.0s.
  Every frame boundary below is a bar line.
- **Spine:** the PORTAL. The camera never cuts. Every hop is a doorway shaped like the thing
  you are buying: the alternate-glyph "O" in the site's own line, then each world's currency
  silhouette (Diamond → Genesis Crystal → Token → UC) as a vector mask with the NEXT world
  already playing inside it. Frame 6 answers Frame 1: the camera snaps back out and every
  world turns out to be playing inside the letters of PIXIEKAT.
- **Leg verbs (never the same twice):** straight dive (1→2) · rolling dive (2→3) · lateral
  whip, shader (3→4) · coin-flip reveal + chromatic smash (4→5) · collapse-to-point then
  pull-back (5→6) · in-place settle (6→7).
- **Brand (from `main/tailwind.config.js`, `main/index.css`, `Hero.jsx`, `Story.jsx`):**
  - Paper `#dfdff0` (blue-50) · ink `#0E041D` (nav dark) · cream-on-dark `#F0F2FA`
    (blue-100) · violet `#5724ff` (violet-300, THE accent) · cyan `#4FB7DD` (blue-300, rare
    secondary) · acid `#edff66` (yellow-300, CTA only).
  - Display: Zentry 900 uppercase; `<b>` letters use `font-feature-settings: "ss01"` (the
    site's `.special-font` alternates). Labels: General Sans uppercase, tracked +0.12em,
    ≥20px. Subline: Robert Medium.
  - CTA: rounded-full pill, yellow fill, ink label (site `Button.jsx`).
- **Copy (all of it already lives on the site):** "THE ST<b>O</b>RE FOR EVERY GAMER"
  (Story.jsx) · "PIXIEKAT — INSTANT GAMING CREDITS" · "Fast, Secure, Affordable"
  (Hero.jsx) · currency names from the live `games` table · "TOP UP NOW".
- **World plate (shared by Frames 2–5):** dark world, full-bleed key art BG with slow
  push, the official clip on a tilted 3D card with a 3px cream border and a violet bloom
  behind, the title in Zentry cream at one edge, a General Sans currency chip (real icon +
  name), a 4-pip world counter bottom-right, and grain over everything. Title edge
  alternates L/R/L/R so the eye travels.
- **Grade:** each world keeps its own colour; a shared violet-tinted shadow lift + grain ties
  them together. Clips cover-cropped to 16:9 (MLBB and Genshin are 2560x1080); crop out the
  BGMI top-left logo and the HoK "pre-beta" corner caption.
- **Bans:** no slideshow (no card-by-card cuts); no screensaver (every move lands on a beat
  or a reveal); no gradient text; no fake store UI; no League of Legends art; no pngaaa UC
  icon; no raster icon scaled past its native size; no static end card.
- **Held frame:** 13.9–15.0s. Only the grain and the glow breathe.
- **No WebGL shaders.** `@hyperframes/shader-transitions` captures scenes as painted
  backgrounds/text only (no `<video>`, no images, no 3D transforms), which would break the
  one-camera spine. The whip (3→4) is camera-native: velocity-matched `x` on the world +
  `motion-blur-streak` (SVG directional blur). The chromatic split (4→5) is
  `chromatic-glitch` applied as an SVG channel-offset filter on the world wrapper.
- **Truthfulness:** game names and currencies are the store's live catalog. Game art and
  clips are official publisher material; b-roll is Pexels-licensed.
- **Optional (offered, not planned):** 4 whoosh/impact SFX from Mixkit's free SFX library on
  the hops and the CTA press.

## Locked

- Plan v1 approved 2026-10-11; sketch sheet `storyboard.html` v1 approved 2026-10-11.
  Every frame has a confirmed sketch at `storyboard.html#frame-NN` (vertical:
  `#vframe-NN`). The build dresses those layouts and never redraws them.
- Track, SFX and the camera-native seams are locked (see Decisions).
- Build (2026-10-12): single-file `index.html`, not 7 sub-compositions. The seams share
  camera constants across scenes, so one timeline keeps them exact. Scene roots are
  untimed `#s1`…`#s6` layers (frame 7 lives in `#s6`); only media carry `data-start`.
- End revision (2026-10-12, user: "too similar to the previous promo"; composition kept):
  the letters keep playing footage to the end (no ink ripple). At 10.64 the paper floods
  to ink in a circle from behind the wordmark, a cream outline lands on the letters, and
  the CTA gets an arrow plus three violet portal rings that ripple out on the 12.95 press.

## Build mechanics (locked)

**Portal = mask-zoom.** The incoming scene mounts early, on a higher layer, with its whole
world inside a doorway wrapper. The wrapper has a fixed `clip-path` shape in its own local
coordinates and is scaled with `transform` from doorway size to well past full frame. The
inner world is counter-scaled (`1/s × parallax`) so it arrives at ~1.3 and lands at 1.0.
The outgoing scene's camera push uses the same origin, times and ease, so the two read as
one move.

| comp | data-start | ends | overlap phase |
|---|---|---|---|
| 01-store | 0.00 | 1.85 | — |
| 02-mlbb | 0.00 | 3.70 | 0.00–1.85 inside the O glyph (it supplies the O's fill from frame 0) |
| 03-genshin | 2.78 | 5.55 | 2.78–3.70 inside the Diamond (with roll) |
| 04-hok | 5.32 | 7.40 | 5.32–5.80 whip strip |
| 05-bgmi | 7.10 | 8.80 | 7.10–7.40 as the Token's back face |
| 06-every-world | 8.75 | 11.10 | 8.75 takes over from the full-frame BGMI clip |
| 07-cta | 11.10 | 15.00 | starts pixel-identical to 06's last frame |

- **Whip (3→4):** both worlds ride one strip: `x3 = −W·e`, `x4 = W − W·e`, with
  `e = power3.inOut` over 5.32–5.80. Directional blur is proportional to velocity and peaks
  at 5.56.
- **Coin flip (4→5):** the Token window rotates Y 0→90° over 6.94–7.10 (`power2.in`). 05's
  world is inside a circle at the same position and rotates Y −90→0 over 7.10–7.25 while
  the circle scales past the frame corners by 7.40. The chromatic split peaks at 7.40 and
  decays by 7.70.
- **Drain into the A (5→6):** at 8.30–8.75 the BGMI clip expands from the right panel to
  full frame, and the title and chip exit (8.55–8.75). At 8.75, 06 takes over with the
  camera zoomed so far into the A that the A-shaped BGMI fill covers the frame. It uses the
  same clip at the same media time, so the handoff is invisible. From 8.75 to 9.25 the
  camera eases out slowly (`power2.in`): the A's edges and lavender paper creep in as the
  music drops out. On the 9.25 re-hit it snaps out to 1.0 (`power4.out`, ~0.95s).
- **PIXIEKAT fill:** one SVG/CSS text clip of the whole word over a 4-panel mosaic aligned
  to the letter pairs (P I = MLBB, X I = Genshin, E K = HoK, A T = BGMI clips). The ink
  ripple is a per-letter ink layer on top.
- **Persistent overlays in `index.html`:** the world-counter pips (0–11.10, light at 1.85 /
  3.70 / 5.55 / 7.40, all pulse at 8.10, fade at 10.64) and grain (0–15). Neither is
  affected by any scene camera.
- **MLBB landing (1→2):** the O doorway contains 02's world with 02's inner camera
  zoomed so far into the clip card that the clip fills the frame. On the 2.31 title slam the
  inner camera pulls back and tilts (`power4.out`, ~0.6s), and the full-frame footage becomes
  the tilted 3D card in the MLBB world. One continuous move, so no cut on the drop.
- **Portal passage texture:** `assets/broll/neon_tunnel_mono.mp4`, tinted violet, flashes as a
  screen-blend (peak 0.35) for ~0.3s centred on the 1.85 and 3.70 crossings.
- **Clip in-points (source seconds):**
  - MLBB (O fill → card, one continuous element): start where the eyes close-up is
    readable by about t=0.9 and runs into action after 2.31. Pick it from 4.0–9.0s.
  - Genshin card: 2.2 (dragon boss + green ring).
  - HoK: 0.0 onward, scaled ≥1.12 so the "PRE-BETA FOOTAGE" bottom-left caption and
    the HUD corners crop out.
  - BGMI: crop the top-left "BGMI KRAFTON" logo by framing/scale; three stutter segments.

## Frame 1 — The Store (0.00–1.85)

- scene: The site's own line on lavender paper; the alternate "O" in STORE is a window into Mobile Legends; the camera dives through it on the drop
- duration: 1.85s
- poster: 1.2s
- transition_in: cut
- status: built
- src: index.html (#s1)
- role: hook
- motion: waterfall-entry (words) · coordinate-target-zoom (dive onto the O counter) · motion-blur-streak (camera-travel carve-out)
- audio: words land in the silent hole; the riser 1.5–1.85s drives the push; DROP = full-frame at 1.85

On screen: lavender paper with grain and a violet hairline grid drifting slowly. Two-line
Zentry headline in ink, left-anchored at x=140, ~78% of the frame width: "THE ST<b>O</b>RE
FOR" / "EVERY GAMER". The ss01 "O" counter is a mask with the MLBB clip already playing
inside it, ringed by a 6px violet stroke. Top-left label: "PIXIEKAT — INSTANT GAMING
CREDITS". Bottom-right: four hollow violet pips.

Motion: the words whip in from below (waterfall, 0.10–0.55s). At 0.95s the camera starts
an accelerating push onto the O counter (scale 1→~28, `power3.in`), with the letters smearing
past under the motion-blur envelope. The violet ring flares as it crosses the lens at 1.85.

Why: hooks with the store's own promise and plants the portal device.

## Frame 2 — Mobile Legends (1.85–3.70)

- scene: Inside MLBB — splash in depth, the official clip on a tilted 3D card, the title slams left; the Diamond silhouette opens with Genshin inside and the camera rolls through it
- duration: 1.85s
- poster: 0.9s
- transition_in: zoom-through (continuation of the dive)
- status: built
- src: index.html (#s2)
- role: feature_showcase
- motion: 3d-camera-flight (landing + micro drift) · depth-of-field-blur · kinetic-beat-slam (title on beat 2) · coordinate-target-zoom + motion-blur-streak (rolling dive)
- audio: drop sustains; the title slam lands on 2.31; the roll-dive crosses on the 3.70 downbeat

On screen: BG Lancelot splash, DoF-soft, pushing 1.08→1.0. MG: the MLBB clip on a 3D card
(rotateY −14°, rotateX 4°) right of centre. Left edge, Zentry cream ~150px: "MOBILE" /
"LEGENDS". Chip: single diamond (cropped from `mlbb_diamonds.png`) + "DIAMONDS". Pip 1
lights violet.

Motion: the camera lands from the dive (scale 1.3→1, `power4.out`, blur clear by 2.2). The
title slams (scale 1.4→1, 0.18s) on 2.31. At 2.78 the chip's diamond hands off to a crisp
vector Diamond silhouette (violet stroke, Genshin clip inside) that springs to centre. From
3.24 the camera dives into it while rolling 0→90° (`power3.in`) and crosses at 3.70.

Why: first proof that the store covers your game, and it rides the drop.

## Frame 3 — Genshin Impact (3.70–5.55)

- scene: Rolls out level in Teyvat; the camera flies right-to-left past standing cards in depth (Raiden cut-out in front); the title sits right; the Crystal whips off left
- duration: 1.85s
- poster: 1.0s
- transition_in: rolling dive (continuation)
- status: built
- src: index.html (#s3)
- role: feature_showcase
- motion: 3d-camera-flight (flight past standing cards, decelerate-into-focus) · depth-of-field-blur · spring-pop-entrance (chip)
- audio: lands on 3.70; chip on 4.63; the whip leaves on 5.32 and crosses at 5.55

On screen: BG v2.6 wallpaper (crop out its logo), bright sky. MG: three cards standing in
Z (the Genshin clip, the Hu Tao wish, the Raiden wish), with the near one blurred. FG: the
Raiden cut-out moving fastest on parallax. Right edge, Zentry cream: "GENSHIN" /
"IMPACT". Chip: Genesis Crystal + "GENESIS CRYSTALS". Pip 2 lights.

Motion: the roll resolves to level (90→0°, `power4.out`) while the flight decelerates into
focus on the clip card. The chip pops at 4.63 (`back.out(2)`). At 5.32 the Crystal and the
whole world accelerate left into the whip.

Why: breadth. A completely different visual world, same store.

## Frame 4 — Honor of Kings (5.55–7.40)

- scene: Whip lands in a gold-lit world; the camera cranes down onto a round Token window playing the HoK clip; the title sits left; the Token coin-flips and its back face is BGMI
- duration: 1.85s
- poster: 1.0s
- transition_in: whip-pan (camera-native, 0.35s, right→left, directional blur peaks at 5.55)
- status: built
- src: index.html (#s4)
- role: feature_showcase
- motion: multi-phase-camera (crane + drift) · spring-pop-entrance (Token window) · 3D coin flip (rotateY 0→180, back face = next world) · coordinate-target-zoom
- audio: whip on 5.55; the window opens on 6.01; the flip starts on 6.94 and the back face fills the frame on 7.40

On screen: BG Cai Yan splash with a warm gold grade. MG: the Token silhouette expands into
a circular window with the HoK clip inside (the portal motif, round this time). Left edge,
Zentry cream: "HONOR OF" / "KINGS". Chip: Token icon (128px, shown ≤110px) + "TOKENS".
Pip 3 lights.

Motion: the world rises into frame as the camera cranes down (`power2.inOut` → `power4.out`
landing). The Token window springs open (scale 0→1, `back.out(1.6)`). At 6.94 it flips on Y
toward the lens. Its reverse face is the BGMI world, and it scales to fill the frame by
7.40.

Why: keeps the rhythm and keeps the portal readable on its third repetition.

## Frame 5 — BGMI (7.40–9.25)

- scene: Chromatic smash into the battleground; the clip stutter-cuts on eighths; BGMI glitch-slams; going into the dropout the clip takes the full frame and the world starts draining into the shape of an A
- duration: 1.85s
- poster: 0.8s
- transition_in: chromatic split (SVG channel offset on the world, 0.3s, peaks at 7.40)
- status: built
- src: index.html (#s5)
- role: feature_showcase
- motion: chromatic-glitch (title emphasis burst) · kinetic-beat-slam · hard cuts on 1/8 notes inside the clip card · scale-to-point collapse (`power3.in`)
- audio: smash on 7.40; stutters at 7.63/7.86/8.10; the collapse rides the 8.75–9.25 dropout

On screen: BG store BGMI card + the Kiaraa still, desaturated with a warm highlight. MG: the
BGMI clip full-height on the right (top-left logo cropped out), with three stutter hard-cuts.
Zentry cream "BGMI", huge (~40% width). Chip: typographic UC glyph + "UC". Pip 4 lights,
then all four pips pulse together.

Motion: the title slams with a 0.2s RGB-split burst that snaps clean. From 8.30 the clip
expands to full frame and the title and chip exit. At 8.75, as the music drops out, the
frame turns out to be the inside of an A (see Build mechanics) and starts to pull away.

Why: the energy peak, then the breath before the reveal.

## Frame 6 — Every World (9.25–11.10)

- scene: The BGMI world drains into an A in the dropout; on the re-hit the camera snaps back out to giant PIXIEKAT with a different game playing inside each letter; the letters ripple to ink
- duration: 1.85s
- poster: 1.0s
- transition_in: pull-back (continuous, starts at max velocity on the re-hit)
- status: built
- src: index.html (#s6)
- role: benefit_highlight
- motion: zoom-out-workspace-reveal (adapted: ONE decelerating pull-back, `power4.out`) · coordinate-target-zoom (zoom-out variant) · theme-crossfade-morph (footage → ink ripple)
- audio: the re-hit at 9.25 launches the pull-back; the ink ripple starts on 10.64 and completes by the 11.10 downbeat

On screen: lavender paper returns. Giant Zentry "PIXIEKAT" (ss01 on the I's and A) spans
~86% of the width. Each letter is a window: P/I = MLBB, X/I = Genshin, E/K = HoK,
A/T = BGMI. Bottom-left label: "ONE STORE. EVERY WORLD." All four pips are filled.

Motion: the pull-back launches at full speed on 9.25 and decelerates to rest by ~10.2. The
letters hold full of footage for one beat. From 10.64 they crossfade to solid ink in a
left→right ripple (≤0.4s).

Why: the payoff and callback to Frame 1. "Every game" is shown rather than claimed.

## Frame 7 — Top Up Now (11.10–15.00)

- scene: The ink wordmark rises into a lockup with the logo, the site tagline, and a yellow TOP UP NOW pill that presses on the 12.95 bar; held frame to the end
- duration: 3.9s
- poster: 3.0s
- transition_in: in-place (continuation)
- status: built
- src: index.html (#s7)
- role: cta
- motion: logo-assemble-lockup (adapted: wordmark already formed; logo blooms beside it) · spring-pop-entrance · press-release-spring (CTA) · ambient-glow-bloom (held frame)
- audio: lockup builds on 11.10–12.0; CTA press on the 12.95 bar; fade 14.3→15.0 under the held frame

On screen: the ink "PIXIEKAT" settles at 0.42 scale, upper centre. `pk_logo.png` sits to
its left. Robert Medium subline, ink at 80%: "Instant Gaming Credits — Fast, Secure,
Affordable". A yellow pill with the ink General Sans label "TOP UP NOW". A soft violet glow
breathes behind the lockup.

Motion: the wordmark scales 1→0.42 and rises (`power3.inOut`, 11.10–11.65). The logo pops
at 11.30 (`back.out(2)`), the subline waterfalls in at 11.50, and the pill springs in at
11.75. On 12.95 the pill presses (0.92 → 1, spring) with a violet ring pulse. 13.9–15.0
holds.

Why: tells the viewer where to go and what to do.
