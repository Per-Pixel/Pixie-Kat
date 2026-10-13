# Last Session Summary

## Games grid: removed card subtitle line (2026-10-13)

- `main/src/pages/games/components/GameGrid.jsx`: dropped the small subtitle
  `<p>` under each game name on `/games` (was rendering the DB `games.subtitle`,
  e.g. "Malaysia server" under "Mobile Legends: Bang Bang"). Cards now show only
  the game name. `useActiveGames` still selects/maps `subtitle` — data layer
  untouched, easy to bring back.
- Uncommitted, on top of the previous session's uncommitted media work.

### Carried forward / pending
- Browser check of Features tile / menu cards not done.
- Free Fire Play icon is currently a Naruto collab — may rotate.
- `videos/pixiekat-portal-hop/` 9:16 render still not built.
- Game art remains publisher IP — flag before paid-ad distribution.
