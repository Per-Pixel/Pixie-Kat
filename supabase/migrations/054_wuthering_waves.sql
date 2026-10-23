-- 054: Seed Wuthering Waves game (tangyanstore.com catalog, scraped 2026-10-23).
-- Applied to prod 2026-10-23 via main/server/scripts/seed-wuthering-waves.mjs
-- (service role; that script also uploads card/banner art to public-media).
-- This file captures the catalog rows for parity. Idempotent via ON CONFLICT.
-- Supplier retail = cost; sell = ~1.15 markup at tidy ₹5/₹10 points.
-- provider='manual' — no SmileCoin/SmileCode WuWa product exists, so orders
-- stay processing for staff fulfilment. region='global', no blocked_regions;
-- the buyer's server choice lands on the order via the zone_id field.
insert into games (id, slug, name, subtitle, description, image_url, banner_url, category, currency_label, provider, status, sort_order, region, how_to_steps, instructions, metadata)
values
  ('e59486d1-bd68-42e6-8c7e-73ba6569f58a','wuthering-waves','Wuthering Waves','Wuthering Waves Lunites',
   'Top up Lunites for Wuthering Waves. Enter your UID, select your server, pick a Lunite pack or the Lunite Subscription, and the currency is credited to your account after payment.',
   'img/games/wuthering-waves.jpg','img/games/wuthering-waves-banner.jpg','RPG','Lunites','manual','active',3,'global',
   '[{"title":"Enter UID & Server","description":"Provide your Wuthering Waves UID and select your account server."},{"title":"Choose the Package","description":"Select the Lunite pack or Lunite Subscription you want."},{"title":"Make Payment","description":"Choose your preferred payment method."},{"title":"Confirmation","description":"Lunites are credited to your account after payment."}]'::jsonb,
   'Lunites are delivered to the UID + server you select — double-check both before paying.',
   '{"source":"tangyanstore:Wuthering Waves","source_url":"https://tangyanstore.com/product/Wuthering%20Waves","pricing_source":"tangyanstore.com","fulfillment_mode":"manual"}'::jsonb)
on conflict (id) do nothing;

insert into game_fields (game_id, field_key, label, field_type, placeholder, help_text, is_required, options, sort_order) values
  ('e59486d1-bd68-42e6-8c7e-73ba6569f58a','user_id','UID','text','Enter your Wuthering Waves UID','The UID shown on your in-game profile.',true,'[]',1),
  ('e59486d1-bd68-42e6-8c7e-73ba6569f58a','zone_id','Server','select','Select server','Pick the server your account is registered on.',true,'[{"value":"SEA","label":"SEA"},{"value":"Asia","label":"Asia"},{"value":"America","label":"America"},{"value":"Europe","label":"Europe"},{"value":"TW_HK_MO","label":"TW_HK_MO"}]',2)
on conflict do nothing;

insert into products (id, game_id, name, amount, price, compare_price, currency, image_url, provider_product_id, cost_price, is_popular, status, sort_order, metadata) values
  ('a1b6f336-7e5d-4587-acc5-074c91ce0e5b','e59486d1-bd68-42e6-8c7e-73ba6569f58a','60 Lunites','Lunites=60',110,null,'INR','img/games/wuthering-waves.jpg',null,97,false,'active',1,'{"fulfillment_mode":"manual","tangyan_price_inr":97}'),
  ('752228a7-6a7f-4219-bf31-91a6f343852e','e59486d1-bd68-42e6-8c7e-73ba6569f58a','Lunite Subscription','Lunite Subscription',520,null,'INR','img/games/wuthering-waves.jpg',null,454,true,'active',2,'{"fulfillment_mode":"manual","tangyan_price_inr":454}'),
  ('9b8f396f-8749-4bb8-be0b-fa96b8039e48','e59486d1-bd68-42e6-8c7e-73ba6569f58a','330 Lunites','Lunites=330',515,null,'INR','img/games/wuthering-waves.jpg',null,446,false,'active',3,'{"fulfillment_mode":"manual","tangyan_price_inr":446}'),
  ('b101f101-5f77-4eb1-bcb1-6bbd3ad88375','e59486d1-bd68-42e6-8c7e-73ba6569f58a','1090 Lunites','Lunites=1090',1555,null,'INR','img/games/wuthering-waves.jpg',null,1351,false,'active',4,'{"fulfillment_mode":"manual","tangyan_price_inr":1351}'),
  ('ce6cd98e-52d3-4f92-b084-af1abf54483d','e59486d1-bd68-42e6-8c7e-73ba6569f58a','2240 Lunites','Lunites=2240',3090,null,'INR','img/games/wuthering-waves.jpg',null,2686,false,'active',5,'{"fulfillment_mode":"manual","tangyan_price_inr":2686}'),
  ('a693691d-526b-4601-be0e-497201cfa54c','e59486d1-bd68-42e6-8c7e-73ba6569f58a','3880 Lunites','Lunites=3880',5150,null,'INR','img/games/wuthering-waves.jpg',null,4479,false,'active',6,'{"fulfillment_mode":"manual","tangyan_price_inr":4479}'),
  ('b54de7e6-da5f-497c-9664-13d406b4bcfa','e59486d1-bd68-42e6-8c7e-73ba6569f58a','8080 Lunites','Lunites=8080',10040,null,'INR','img/games/wuthering-waves.jpg',null,8731,false,'active',7,'{"fulfillment_mode":"manual","tangyan_price_inr":8731}')
on conflict (id) do nothing;
