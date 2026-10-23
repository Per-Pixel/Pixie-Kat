-- 053: Seed MLBB Mini Packs game (tangyanstore.com mini packs, scraped 2026-10-23).
-- Applied to prod 2026-10-23 via main/server/scripts/seed-mlbb-mini-packs.mjs
-- (service role). This file captures the catalog rows for parity. Idempotent
-- via ON CONFLICT.
-- Supplier retail = cost (₹13/₹24/₹50); sell = ~1.15 markup (₹15/₹28/₹58).
-- provider='manual' — SmileCoin's mobilelegends catalog has no 5/11/22 SKUs, so
-- orders stay processing for staff fulfilment. region='global' and no
-- blocked_regions: the packs are nominally region-specific on the supplier side
-- but are sold region-free. provider_game_code='mobilelegends' keeps player
-- verification + the free region lookup working (verified_region still lands on
-- orders for staff).
insert into games (id, slug, name, subtitle, description, image_url, banner_url, category, currency_label, provider, provider_game_code, status, sort_order, region, how_to_steps, instructions, metadata)
values
  ('2dad0472-cecd-489f-a5f7-591d3870ef5f','mlbb-mini-packs','MLBB Mini Packs','Mobile Legends Mini Diamond Packs',
   'Small-denomination Mobile Legends diamond packs — 5, 11 and 22 Diamonds — for any account region. Enter your User ID and Zone ID, pick a pack, and the diamonds are credited to your account after payment.',
   'img/games/mobile-legends.webp','img/promotion/eternal.webp','MOBA','Diamonds','manual','mobilelegends','active',2,'global',
   '[{"title":"Enter Account Details","description":"Provide your Mobile Legends User ID and Zone ID."},{"title":"Choose the Package","description":"Select the mini diamond pack you want."},{"title":"Make Payment","description":"Choose your preferred payment method."},{"title":"Confirmation","description":"Diamonds are credited to your account after payment."}]'::jsonb,
   'Mini packs work for all account regions. Diamonds are delivered to the User ID + Zone ID you enter — double-check them before paying.',
   '{"source":"tangyanstore:MLBB Mini Packs","source_url":"https://tangyanstore.com/product/MLBB%20Mini%20Packs","pricing_source":"tangyanstore.com","fulfillment_mode":"manual"}'::jsonb)
on conflict (id) do nothing;

insert into game_fields (game_id, field_key, label, field_type, placeholder, help_text, is_required, options, sort_order) values
  ('2dad0472-cecd-489f-a5f7-591d3870ef5f','user_id','User ID','text','Enter Mobile Legends User ID','The numeric User ID from your Mobile Legends profile.',true,'[]',1),
  ('2dad0472-cecd-489f-a5f7-591d3870ef5f','zone_id','Zone ID','text','Enter Zone ID','The Zone ID shown in brackets on your Mobile Legends profile.',true,'[]',2)
on conflict do nothing;

insert into products (id, game_id, name, amount, price, compare_price, currency, image_url, provider_product_id, cost_price, is_popular, status, sort_order, metadata) values
  ('e55d8d5b-5540-4910-87da-debeb9e368bc','2dad0472-cecd-489f-a5f7-591d3870ef5f','Mini Pack — 5 Diamonds','Diamond=5',15,null,'INR','img/products/mcgg-diamonds.jpg',null,13,false,'active',1,'{"fulfillment_mode":"manual","tangyan_price_inr":13}'),
  ('a6e51319-4e3f-4e64-b143-aefa9405bb6e','2dad0472-cecd-489f-a5f7-591d3870ef5f','Mini Pack — 11 Diamonds','Diamond=11',28,null,'INR','img/products/mcgg-diamonds.jpg',null,24,false,'active',2,'{"fulfillment_mode":"manual","tangyan_price_inr":24}'),
  ('9f70da2f-79ff-4176-abbc-b93beb5ea750','2dad0472-cecd-489f-a5f7-591d3870ef5f','Mini Pack — 22 Diamonds','Diamond=22',58,null,'INR','img/products/mcgg-diamonds.jpg',null,50,false,'active',3,'{"fulfillment_mode":"manual","tangyan_price_inr":50}')
on conflict (id) do nothing;
