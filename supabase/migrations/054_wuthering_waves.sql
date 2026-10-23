-- 054: Seed Wuthering Waves game, fulfilled via Yokcash WUTWVS* services.
-- Product idea from tangyanstore.com (scraped 2026-10-23); supply + pricing
-- follow the house Yokcash convention: sell = harga IDR→INR @0.005385 × 1.15,
-- provider_product_id = Yokcash service code. Every sell price also clears
-- tangyan retail, so a manual Tangyan fallback stays profitable.
-- Applied to prod 2026-10-23 via main/server/scripts/seed-wuthering-waves.mjs
-- (service role; that script also uploads card/banner art to public-media).
-- This file captures the catalog rows for parity. Idempotent via ON CONFLICT.
-- region='global', no blocked_regions; the buyer's server choice lands on the
-- order via zone_id and is forwarded to Yokcash as target "uid|server".
insert into games (id, slug, name, subtitle, description, image_url, banner_url, category, currency_label, provider, status, sort_order, region, how_to_steps, instructions, metadata)
values
  ('e59486d1-bd68-42e6-8c7e-73ba6569f58a','wuthering-waves','Wuthering Waves','Wuthering Waves Lunites',
   'Top up Lunites for Wuthering Waves. Enter your UID, select your server, pick a Lunite pack or the Lunite Subscription, and the currency is credited to your account after payment.',
   'img/games/wuthering-waves.jpg','img/games/wuthering-waves-banner.jpg','RPG','Lunites','yokcash','active',3,'global',
   '[{"title":"Enter UID & Server","description":"Provide your Wuthering Waves UID and select your account server."},{"title":"Choose the Package","description":"Select the Lunite pack or Lunite Subscription you want."},{"title":"Make Payment","description":"Choose your preferred payment method."},{"title":"Confirmation","description":"Lunites are credited instantly after payment."}]'::jsonb,
   'Lunites are delivered to the UID + server you select — double-check both before paying.',
   '{"source":"tangyanstore:Wuthering Waves","source_url":"https://tangyanstore.com/product/Wuthering%20Waves","pricing_source":"yokcash"}'::jsonb)
on conflict (id) do nothing;

insert into game_fields (game_id, field_key, label, field_type, placeholder, help_text, is_required, options, sort_order) values
  ('e59486d1-bd68-42e6-8c7e-73ba6569f58a','user_id','UID','text','Enter your Wuthering Waves UID','The UID shown on your in-game profile.',true,'[]',1),
  ('e59486d1-bd68-42e6-8c7e-73ba6569f58a','zone_id','Server','select','Select server','Pick the server your account is registered on.',true,'[{"value":"SEA","label":"SEA"},{"value":"Asia","label":"Asia"},{"value":"America","label":"America"},{"value":"Europe","label":"Europe"},{"value":"TW_HK_MO","label":"TW_HK_MO"}]',2)
on conflict do nothing;

insert into products (id, game_id, name, amount, price, compare_price, currency, image_url, provider_product_id, cost_price, is_popular, status, sort_order, metadata) values
  ('c60a8c84-20a9-4b24-94c6-2bc83c3a027e','e59486d1-bd68-42e6-8c7e-73ba6569f58a','60 Lunites','Lunites=60',101,null,'INR','img/games/wuthering-waves.jpg','WUTWVS60YCGG',88.14,false,'active',1,'{"yokcash_service_id":"WUTWVS60YCGG","yokcash_cost_idr":16368}'),
  ('24f7da4b-600f-463c-80ae-923dd1e835c2','e59486d1-bd68-42e6-8c7e-73ba6569f58a','Lunite Subscription','Lunite Subscription',482,null,'INR','img/games/wuthering-waves.jpg','WUTWVSLS1YCGG',418.89,true,'active',2,'{"yokcash_service_id":"WUTWVSLS1YCGG","yokcash_cost_idr":77789}'),
  ('154848a3-1cba-4e30-9bf3-0389b0ec6f95','e59486d1-bd68-42e6-8c7e-73ba6569f58a','300 + 30 Lunites','Lunites=330',480,null,'INR','img/games/wuthering-waves.jpg','WUTWVS300YCGG',417.65,false,'active',3,'{"yokcash_service_id":"WUTWVS300YCGG","yokcash_cost_idr":77558}'),
  ('ca6af2fc-4d5b-44c7-9730-cf1aa4c18a96','e59486d1-bd68-42e6-8c7e-73ba6569f58a','980 + 110 Lunites','Lunites=1090',1449,null,'INR','img/games/wuthering-waves.jpg','WUTWVS980YCGG',1259.79,false,'active',4,'{"yokcash_service_id":"WUTWVS980YCGG","yokcash_cost_idr":233945}'),
  ('d7a2cf1d-6476-4478-a04e-9e582e7a14b0','e59486d1-bd68-42e6-8c7e-73ba6569f58a','1980 + 260 Lunites','Lunites=2240',2898,null,'INR','img/games/wuthering-waves.jpg','WUTWVS1980YCGG',2519.59,false,'active',5,'{"yokcash_service_id":"WUTWVS1980YCGG","yokcash_cost_idr":467890}'),
  ('624b823f-cfec-47e0-a4d7-90368b795bb2','e59486d1-bd68-42e6-8c7e-73ba6569f58a','3280 + 600 Lunites','Lunites=3880',4648,null,'INR','img/games/wuthering-waves.jpg','WUTWVS3280YCGG',4042.01,false,'active',6,'{"yokcash_service_id":"WUTWVS3280YCGG","yokcash_cost_idr":750605}'),
  ('45853d6c-d99d-4dca-b4c7-2c36e5650e31','e59486d1-bd68-42e6-8c7e-73ba6569f58a','6480 + 1600 Lunites','Lunites=8080',9060,null,'INR','img/games/wuthering-waves.jpg','WUTWVS6480YCGG',7877.18,false,'active',7,'{"yokcash_service_id":"WUTWVS6480YCGG","yokcash_cost_idr":1462800}')
on conflict (id) do nothing;
