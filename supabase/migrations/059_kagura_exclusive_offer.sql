-- ============================================================
-- Pixie-Kat: Kagura Legend as CMS Exclusive Offer (sort first)
-- Run AFTER 058_exclude_wallet_topup_from_analytics.sql
--
-- Replaces hardcoded homepage prepend in ExclusiveOffers.jsx.
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.promotional_items
    WHERE section = 'exclusive_offers'
      AND title = 'Kagura Legend · draw plan'
  ) THEN
    UPDATE public.promotional_items
    SET sort_order = sort_order + 1, updated_at = NOW()
    WHERE section = 'exclusive_offers';

    INSERT INTO public.promotional_items (
      section,
      title,
      image_url,
      flag,
      link_url,
      is_active,
      sort_order
    )
    VALUES (
      'exclusive_offers',
      'Kagura Legend · draw plan',
      'img/events/kagura/home-exclusive.jpg',
      'EVENT',
      '/event/kagura-legend',
      TRUE,
      0
    );
  END IF;
END $$;
