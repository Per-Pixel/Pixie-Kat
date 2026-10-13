-- 046: Seed Starlight, Honor of Kings, Genshin Impact (+USA), BGMI games.
-- Applied to prod 2026-10-06 via main/server/scripts/seed-new-games.mjs
-- (service role; that script also uploads images to public-media).
-- This file captures the catalog rows for parity. Idempotent via ON CONFLICT.
-- Pricing: HOK/BGMI = Yokcash harga IDR→INR @0.005385 × 1.15; Genshin = Moogold
-- retail INR; Starlight = Kazuki retail ₹279/₹669 (manual gifting).

insert into games (id, slug, name, subtitle, description, image_url, banner_url, category, currency_label, provider, status, sort_order, how_to_steps, instructions, metadata)
values
  ('e02d8649-b7ba-4b33-aa57-d1d07abb0cbb','starlight','Hayabusa Starlight – Kitsune''s Shadow','Mobile Legends Starlight Gifting',
   'Hayabusa''s October Kitsune''s Shadow Starlight skin delivered through Mobile Legends in-game gifting. Choose Normal or Premium Starlight and enter the correct Mobile Legends User ID and Zone ID. This is a gifting order, not an instant top-up — our team assigns a gifting account after payment approval, and the 168-hour in-game friendship timer starts only after the follow is verified.',
   'img/games/starlight.jpg','img/games/starlight-banner.jpg','MOBA','Starlight','manual','active',10,
   '[{"title":"Enter Account Details","description":"Place the order with the correct Mobile Legends User ID and Zone ID."},{"title":"Receive Gifting Account","description":"After payment approval, our team will custom-assign and share the gifting account."},{"title":"Follow and Confirm","description":"Follow the assigned account inside Mobile Legends and confirm it on your order page."},{"title":"Wait for Eligibility","description":"The 168-hour friendship wait starts only after our team verifies your follow."},{"title":"Starlight Delivery","description":"Your selected Normal or Premium Starlight will be gifted after eligibility is complete."}]'::jsonb,
   'Important gifting rules' || E'\n\n' || 'This is not instant delivery. Mobile Legends requires a 168-hour in-game friendship period before Starlight can be gifted. Delivery is normally scheduled after eligibility, commonly on day 8. Double-check your User ID and Zone ID before payment; changing the receiving account after follow verification restarts the timer.',
   '{"fulfillment_mode":"gifting","source":"kazuki:146"}'::jsonb),

  ('23707e1f-bfe7-4192-9282-db797a7dc160','honor-of-kings','Honor of Kings','Honor of Kings (HOK)',
   'Top up Honor of Kings Tokens instantly. Enter your Player ID, pick a token package, and pay — tokens land straight in your account.',
   'img/games/honor-of-kings-hok.jpg','img/games/honor-of-kings-banner.jpg','MOBA','Tokens','yokcash','active',11,
   '[{"title":"Enter Player ID","description":"Provide your Honor of Kings Player ID for delivery."},{"title":"Choose the Package","description":"Select the token pack you want."},{"title":"Make Payment","description":"Choose your preferred payment method."},{"title":"Confirmation","description":"Tokens are credited instantly after payment."}]'::jsonb,
   'Tokens are delivered to the Player ID you enter — double-check it before paying.',
   '{"source":"kazuki:115"}'::jsonb),

  ('db43c1c5-8097-4d7d-9c96-32ff25d51552','genshin-impact','Genshin Impact','Genesis Crystals',
   'Top up Genesis Crystals for Genshin Impact. Enter your UID and server, pick a pack, and crystals are delivered straight to your account.',
   'img/hero/game-genshin-card.webp','img/hero/game-genshin-card.webp','RPG','Genesis Crystals','yokcash','active',12,
   '[{"title":"Enter UID & Server","description":"Provide your Genshin Impact UID and select the correct server."},{"title":"Choose the Package","description":"Select the Genesis Crystals pack or Welkin Moon."},{"title":"Make Payment","description":"Choose your preferred payment method."},{"title":"Confirmation","description":"Crystals are credited after payment — restart the game to see them."}]'::jsonb,
   'Crystals go to the UID + server you enter. Wrong server = wrong account — check before paying.',
   '{"source":"moogold:428075"}'::jsonb),

  ('c36ae333-21b4-46cb-8eb1-0414222727b6','genshin-impact-usa','Genshin Impact (USA)','Chronal Nexus — US accounts',
   'Top up Chronal Nexus for Genshin Impact on the America server. Enter your UID, pick a pack, and the currency is delivered to your account.',
   'img/hero/game-genshin-card.webp','img/hero/game-genshin-card.webp','RPG','Chronal Nexus','manual','active',13,
   '[{"title":"Enter UID & Server","description":"Provide your Genshin Impact UID — US accounts are on the America server."},{"title":"Choose the Package","description":"Select the Chronal Nexus pack or Welkin Moon."},{"title":"Make Payment","description":"Choose your preferred payment method."},{"title":"Confirmation","description":"Delivery is processed after payment verification."}]'::jsonb,
   'For US-region accounts (America server). Delivery is manual — our team completes the top-up after payment.',
   '{"source":"moogold:428075","fulfillment_mode":"manual-moogold"}'::jsonb),

  ('fe8ce16c-8e20-400c-a94a-dd3d76289b2b','bgmi','BGMI','Battlegrounds Mobile India UC',
   'Top up UC for Battlegrounds Mobile India. Enter your numeric Character ID, pick a UC pack, and UC is credited to your account.',
   'img/hero/game-pubg-card.webp','img/hero/game-pubg-card.webp','Battle Royale','UC','yokcash','active',14,
   '[{"title":"Enter Character ID","description":"Provide your numeric BGMI Character ID from your in-game profile."},{"title":"Choose the Package","description":"Select the UC pack you want."},{"title":"Make Payment","description":"Choose your preferred payment method."},{"title":"Confirmation","description":"UC is credited instantly after payment."}]'::jsonb,
   'UC is delivered to the Character ID you enter — double-check it before paying.',
   '{}'::jsonb)
on conflict (id) do nothing;

-- Game fields
insert into game_fields (game_id, field_key, label, field_type, placeholder, help_text, is_required, options, sort_order) values
  ('e02d8649-b7ba-4b33-aa57-d1d07abb0cbb','user_id','User ID','text','Enter Mobile Legends User ID','Enter the numeric User ID from your Mobile Legends profile.',true,'[]',1),
  ('e02d8649-b7ba-4b33-aa57-d1d07abb0cbb','zone_id','Zone ID','text','Enter Zone ID','Enter the Zone ID shown in brackets on your Mobile Legends profile.',true,'[]',2),
  ('23707e1f-bfe7-4192-9282-db797a7dc160','player_id','Player ID','text','Enter Player ID',null,true,'[]',1),
  ('db43c1c5-8097-4d7d-9c96-32ff25d51552','user_id','UID','text','Enter your Genshin Impact UID','The 9-digit UID shown at the bottom-right of your in-game screen.',true,'[]',1),
  ('db43c1c5-8097-4d7d-9c96-32ff25d51552','zone_id','Server','select','Select server','Pick the server your account is registered on.',true,'[{"value":"Asia","label":"Asia"},{"value":"America","label":"America"},{"value":"Europe","label":"Europe"},{"value":"TW, HK, MO","label":"TW, HK, MO"}]',2),
  ('c36ae333-21b4-46cb-8eb1-0414222727b6','user_id','UID','text','Enter your Genshin Impact UID','The 9-digit UID shown at the bottom-right of your in-game screen.',true,'[]',1),
  ('c36ae333-21b4-46cb-8eb1-0414222727b6','zone_id','Server','select','Select server','US accounts are on the America server.',true,'[{"value":"Asia","label":"Asia"},{"value":"America","label":"America"},{"value":"Europe","label":"Europe"},{"value":"TW, HK, MO","label":"TW, HK, MO"}]',2),
  ('fe8ce16c-8e20-400c-a94a-dd3d76289b2b','player_id','Character ID','text','Enter BGMI Character ID','The numeric ID under your in-game profile name.',true,'[]',1)
on conflict do nothing;

-- Products: provider_product_id = Yokcash service code where provider=yokcash.
insert into products (game_id, name, amount, price, compare_price, currency, image_url, provider_product_id, cost_price, is_popular, status, sort_order, metadata) values
  -- Starlight (manual gifting)
  ('e02d8649-b7ba-4b33-aa57-d1d07abb0cbb','Normal Starlight','Normal Starlight',279,null,'INR','img/products/starlight-normal.jpg',null,null,true,'active',1,'{"fulfillment_mode":"gifting"}'),
  ('e02d8649-b7ba-4b33-aa57-d1d07abb0cbb','Premium Starlight','Premium Starlight',669,null,'INR','img/products/starlight-premium.jpg',null,null,false,'active',2,'{"fulfillment_mode":"gifting"}'),
  -- Honor of Kings (Yokcash HOKYC*, sell = IDR cost ×1.15, compare = Moogold regular)
  ('23707e1f-bfe7-4192-9282-db797a7dc160','16 Tokens','Tokens=16',18,20,'INR','img/products/hok-tokens-16.png','HOKYC17',15.94,false,'active',1,'{"yokcash_service_id":"HOKYC17","yokcash_cost_idr":2961}'),
  ('23707e1f-bfe7-4192-9282-db797a7dc160','80 Tokens','Tokens=80',92,100,'INR','img/products/hok-tokens-80.png','HOKYC88',79.70,false,'active',2,'{"yokcash_service_id":"HOKYC88","yokcash_cost_idr":14800}'),
  ('23707e1f-bfe7-4192-9282-db797a7dc160','240 Tokens','Tokens=240',269,302,'INR','img/products/hok-tokens-240.png','HOKYC257',234.10,false,'active',3,'{"yokcash_service_id":"HOKYC257","yokcash_cost_idr":43473}'),
  ('23707e1f-bfe7-4192-9282-db797a7dc160','400 Tokens','Tokens=400',458,505,'INR','img/products/hok-tokens-400.png','HOKYC432',398.47,false,'active',4,'{"yokcash_service_id":"HOKYC432","yokcash_cost_idr":73996}'),
  ('23707e1f-bfe7-4192-9282-db797a7dc160','560 Tokens','Tokens=560',624,707,'INR','img/products/hok-tokens-560.png','HOKYC605',542.91,false,'active',5,'{"yokcash_service_id":"HOKYC605","yokcash_cost_idr":100819}'),
  ('23707e1f-bfe7-4192-9282-db797a7dc160','800 + 30 Tokens','Tokens=800+30',916,1010,'INR','img/products/hok-tokens-800.png','HOKYC895',796.93,true,'active',6,'{"yokcash_service_id":"HOKYC895","yokcash_cost_idr":147991}'),
  ('23707e1f-bfe7-4192-9282-db797a7dc160','1200 + 45 Tokens','Tokens=1200+45',1346,1516,'INR','img/products/hok-tokens-1200.png','HOKYC1353',1170.49,false,'active',7,'{"yokcash_service_id":"HOKYC1353","yokcash_cost_idr":217361}'),
  ('23707e1f-bfe7-4192-9282-db797a7dc160','2400 + 108 Tokens','Tokens=2400+108',2749,3033,'INR','img/products/hok-tokens-2400.png','HOKYC2724',2390.79,false,'active',8,'{"yokcash_service_id":"HOKYC2724","yokcash_cost_idr":443972}'),
  ('23707e1f-bfe7-4192-9282-db797a7dc160','4000 + 180 Tokens','Tokens=4000+180',4582,5056,'INR','img/products/hok-tokens-4000.png','HOKYC4580',3984.64,false,'active',9,'{"yokcash_service_id":"HOKYC4580","yokcash_cost_idr":739952}'),
  ('23707e1f-bfe7-4192-9282-db797a7dc160','8000 + 360 Tokens','Tokens=8000+360',9238,10112,'INR','img/products/hok-tokens-8000.png','HOKYC9160',8033.18,false,'active',10,'{"yokcash_service_id":"HOKYC9160","yokcash_cost_idr":1491770}'),
  -- Genshin Impact (Yokcash GIYC*, sell = Moogold retail)
  ('db43c1c5-8097-4d7d-9c96-32ff25d51552','60 Genesis Crystals','Crystals=60',99,null,'INR',null,'GIYC60',93.30,false,'active',1,'{"yokcash_service_id":"GIYC60","moogold_variation_id":673095,"yokcash_cost_idr":17325}'),
  ('db43c1c5-8097-4d7d-9c96-32ff25d51552','300 + 30 Genesis Crystals','Crystals=330',499,null,'INR',null,'GIYC330',457.99,false,'active',2,'{"yokcash_service_id":"GIYC330","moogold_variation_id":673096,"yokcash_cost_idr":85050}'),
  ('db43c1c5-8097-4d7d-9c96-32ff25d51552','980 + 110 Genesis Crystals','Crystals=1090',1499,null,'INR',null,'GIYC1090',1441.83,false,'active',3,'{"yokcash_service_id":"GIYC1090","moogold_variation_id":673097,"yokcash_cost_idr":267750}'),
  ('db43c1c5-8097-4d7d-9c96-32ff25d51552','1980 + 260 Genesis Crystals','Crystals=2240',2999,null,'INR',null,'GIYC2240',2764.93,false,'active',4,'{"yokcash_service_id":"GIYC2240","moogold_variation_id":673098,"yokcash_cost_idr":513450}'),
  ('db43c1c5-8097-4d7d-9c96-32ff25d51552','3280 + 600 Genesis Crystals','Crystals=3880',4999,null,'INR',null,'GIYC3940',4608.21,false,'active',5,'{"yokcash_service_id":"GIYC3940","moogold_variation_id":673099,"yokcash_cost_idr":855750}'),
  ('db43c1c5-8097-4d7d-9c96-32ff25d51552','6480 + 1600 Genesis Crystals','Crystals=8080',9900,null,'INR',null,'GIYC8080',9210.77,true,'active',6,'{"yokcash_service_id":"GIYC8080","moogold_variation_id":673100,"yokcash_cost_idr":1710450}'),
  ('db43c1c5-8097-4d7d-9c96-32ff25d51552','Blessing of the Welkin Moon','Welkin Moon',499,null,'INR',null,'GIYCW',457.99,true,'active',7,'{"yokcash_service_id":"GIYCW","moogold_variation_id":1181776,"yokcash_cost_idr":85050}'),
  -- Genshin Impact USA (manual fulfilment via Moogold; Chronal Nexus names)
  ('c36ae333-21b4-46cb-8eb1-0414222727b6','60 Chronal Nexus','Chronal Nexus=60',99,null,'INR',null,null,99,false,'active',1,'{"moogold_variation_id":31096093,"fulfillment_mode":"manual"}'),
  ('c36ae333-21b4-46cb-8eb1-0414222727b6','300 + 30 Chronal Nexus','Chronal Nexus=330',499,null,'INR',null,null,499,false,'active',2,'{"moogold_variation_id":31096094,"fulfillment_mode":"manual"}'),
  ('c36ae333-21b4-46cb-8eb1-0414222727b6','980 + 110 Chronal Nexus','Chronal Nexus=1090',1499,null,'INR',null,null,1499,false,'active',3,'{"moogold_variation_id":31096095,"fulfillment_mode":"manual"}'),
  ('c36ae333-21b4-46cb-8eb1-0414222727b6','1980 + 260 Chronal Nexus','Chronal Nexus=2240',2999,null,'INR',null,null,2999,false,'active',4,'{"moogold_variation_id":31096096,"fulfillment_mode":"manual"}'),
  ('c36ae333-21b4-46cb-8eb1-0414222727b6','3280 + 600 Chronal Nexus','Chronal Nexus=3880',4999,null,'INR',null,null,4999,false,'active',5,'{"moogold_variation_id":31096097,"fulfillment_mode":"manual"}'),
  ('c36ae333-21b4-46cb-8eb1-0414222727b6','6480 + 1600 Chronal Nexus','Chronal Nexus=8080',9900,null,'INR',null,null,9900,true,'active',6,'{"moogold_variation_id":31096098,"fulfillment_mode":"manual"}'),
  ('c36ae333-21b4-46cb-8eb1-0414222727b6','Blessing of the Welkin Moon','Welkin Moon',499,null,'INR',null,null,499,true,'active',7,'{"moogold_variation_id":1181776,"fulfillment_mode":"manual"}'),
  -- BGMI (Yokcash PUBGYC*, sell = IDR cost ×1.15)
  ('fe8ce16c-8e20-400c-a94a-dd3d76289b2b','60 UC','UC=60',102,null,'INR',null,'PUBGYC60',88.47,false,'active',1,'{"yokcash_service_id":"PUBGYC60","yokcash_cost_idr":16429}'),
  ('fe8ce16c-8e20-400c-a94a-dd3d76289b2b','325 UC','UC=325',512,null,'INR',null,'PUBGYC325',445.32,false,'active',2,'{"yokcash_service_id":"PUBGYC325","yokcash_cost_idr":82696}'),
  ('fe8ce16c-8e20-400c-a94a-dd3d76289b2b','660 UC','UC=660',1025,null,'INR',null,'PUBGYC660',891.64,true,'active',3,'{"yokcash_service_id":"PUBGYC660","yokcash_cost_idr":165578}'),
  ('fe8ce16c-8e20-400c-a94a-dd3d76289b2b','1800 UC','UC=1800',2565,null,'INR',null,'PUBGYC1800',2230.59,false,'active',4,'{"yokcash_service_id":"PUBGYC1800","yokcash_cost_idr":414223}'),
  ('fe8ce16c-8e20-400c-a94a-dd3d76289b2b','3850 UC','UC=3850',5132,null,'INR',null,'PUBGYC3850',4462.18,false,'active',5,'{"yokcash_service_id":"PUBGYC3850","yokcash_cost_idr":828632}'),
  ('fe8ce16c-8e20-400c-a94a-dd3d76289b2b','8100 UC','UC=8100',9939,null,'INR',null,'PUBGYC8100',8642.92,false,'active',6,'{"yokcash_service_id":"PUBGYC8100","yokcash_cost_idr":1605000}')
on conflict do nothing;

-- Promo card wiring
update promotional_items set link_url='/games/bgmi', game_id='fe8ce16c-8e20-400c-a94a-dd3d76289b2b' where section='trending' and title='BGMI';
update promotional_items set title='Genshin Impact', link_url='/games/genshin-impact', game_id='db43c1c5-8097-4d7d-9c96-32ff25d51552', price=9900, compare_price=null where section='trending' and title='Genshin Impact INDIA/USA';
update promotional_items set link_url='/games/honor-of-kings', game_id='23707e1f-bfe7-4192-9282-db797a7dc160', price=92, compare_price=100 where section='trending' and title='Honor of Kings';
update promotional_items set link_url='/games/starlight', game_id='e02d8649-b7ba-4b33-aa57-d1d07abb0cbb', image_url='img/games/starlight.jpg' where section='exclusive_offers' and title='Starlight Pass Top Up';
update promotional_items set link_url='/games/genshin-impact', game_id='db43c1c5-8097-4d7d-9c96-32ff25d51552' where section='exclusive_offers' and title='Genshin Impact Genesis Crystals';
update promotional_items set link_url='/games/honor-of-kings', game_id='23707e1f-bfe7-4192-9282-db797a7dc160' where section='exclusive_offers' and title='Honor of Kings Tokens';
insert into promotional_items (section, title, link_url, game_id, image_url, price, currency, is_active, sort_order)
  select 'trending','Genshin Impact USA','/games/genshin-impact-usa','c36ae333-21b4-46cb-8eb1-0414222727b6','img/hero/game-genshin-card.webp',9900,'INR',true,4
  where not exists (select 1 from promotional_items where section='trending' and title='Genshin Impact USA');
