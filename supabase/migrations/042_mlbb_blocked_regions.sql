-- Mobile Legends: the current provider cannot serve Indonesia or Brazil
-- accounts. metadata.blocked_regions blocks checkout when the verified
-- account region matches (see verify-player / place-order region gating).
UPDATE games
SET metadata = coalesce(metadata, '{}'::jsonb) || '{"blocked_regions": ["ID", "BR"]}'::jsonb
WHERE slug = 'mobile-legends';
