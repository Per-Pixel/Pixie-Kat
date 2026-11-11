# Last summary — Pixie-Kat

## 2026-11-11 — Website visitors, devices, places

- The dashboard card is now “Website visitors”: distinct people, device (iPhone, Android, Windows, Mac, and so on), and region. The Meta campaign breakdown is gone.
- A browser keeps a random id in localStorage so a return visit counts as the same person. The API reads the device from the User-Agent and the region from the IP. The IP itself is not stored.
- Apply `061_visit_people_device_place.sql` on PixieKat, deploy the API (`eb deploy` from `main/server`), and ship storefront `main` plus admin. Counts start when that is live. Older visits have no device or place.
