-- Migration 037: Fix product name holding raw Smile.one SKU text
--
-- One product carried the provider's denomination description verbatim
-- ("mobilelegends BR 234&23 Diamond") instead of our storefront naming
-- convention ("234&23 Diamonds"). The cart, checkout bar, and order
-- records all render products.name, so the provider text leaked to
-- customers. Code-side, provider syncs now preserve admin-edited names
-- (see admin catalogService.syncProviderProducts).
UPDATE public.products
SET name = '234&23 Diamonds'
WHERE id = 'c79b7f2c-c690-407d-8ac3-e0533bf0b1a7'
  AND name = 'mobilelegends BR 234&23 Diamond';
