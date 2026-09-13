-- ============================================================
-- Pixie-Kat: Footer and Legal/Policy Pages CMS settings
-- Run AFTER 027_event_jjk_cheaper_settings.sql
-- ============================================================

ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS footer_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS legal_settings JSONB NOT NULL DEFAULT '{}'::jsonb;

UPDATE public.store_settings
SET
  footer_settings = COALESCE(
    NULLIF(footer_settings, '{}'::jsonb),
    jsonb_build_object(
      'cta_label_text', 'Get In Touch',
      'cta_heading_bold', 'Ready to level up your game?',
      'cta_heading_light', 'Top up your favorite titles instantly or explore our premium membership plans.',
      'contact_email', 'support@pixiekatstore.com',
      'contact_label', 'Reach us at:',
      'copyright_text', '© 2026 Pixie Kat Store. All rights reserved.',
      'brand_name_text', 'pixie kat store',
      'nav_links', jsonb_build_array(
        jsonb_build_object('label', 'How It Works', 'href', '/how-it-works'),
        jsonb_build_object('label', 'Games', 'href', '/games'),
        jsonb_build_object('label', 'Pricing', 'href', '/pricing'),
        jsonb_build_object('label', 'Support', 'href', '/support'),
        jsonb_build_object('label', 'Terms', 'href', '/terms'),
        jsonb_build_object('label', 'Privacy', 'href', '/privacy'),
        jsonb_build_object('label', 'Refund Policy', 'href', '/refund-policy')
      ),
      'social_links', jsonb_build_array(
        jsonb_build_object('label', 'LinkedIn', 'href', 'https://linkedin.com', 'icon', 'linkedin'),
        jsonb_build_object('label', 'Facebook', 'href', 'https://facebook.com', 'icon', 'facebook'),
        jsonb_build_object('label', 'Twitter', 'href', 'https://twitter.com', 'icon', 'twitter')
      )
    )
  ),
  legal_settings = COALESCE(
    NULLIF(legal_settings, '{}'::jsonb),
    jsonb_build_object(
      'terms', jsonb_build_object(
        'title', 'Terms of Service',
        'subtitle', 'Please read these terms carefully before using Pixie Kat Store services.',
        'last_updated', '2026-08-01',
        'sections', jsonb_build_array(
          jsonb_build_object(
            'heading', '1. Acceptance of Terms',
            'content', 'By accessing or using Pixie Kat Store, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree, you are prohibited from using our services.'
          ),
          jsonb_build_object(
            'heading', '2. Account & Top-Up Services',
            'content', 'You are responsible for ensuring correct user IDs, zone IDs, and account info when making digital game top-up transactions. Pixie Kat Store is not responsible for incorrect details submitted by the buyer.'
          ),
          jsonb_build_object(
            'heading', '3. Modifications to Service',
            'content', 'Pixie Kat Store reserves the right to modify prices, product availability, or terms at any time without prior notice.'
          )
        )
      ),
      'privacy', jsonb_build_object(
        'title', 'Privacy Policy',
        'subtitle', 'How we collect, use, and protect your personal information.',
        'last_updated', '2026-08-01',
        'sections', jsonb_build_array(
          jsonb_build_object(
            'heading', '1. Information We Collect',
            'content', 'We collect account details, order transaction history, game identification numbers, and contact info necessary to fulfill digital orders and provide customer support.'
          ),
          jsonb_build_object(
            'heading', '2. Data Protection & Security',
            'content', 'Your personal data is encrypted in transit and at rest. We do not sell your personal data to third parties under any circumstances.'
          ),
          jsonb_build_object(
            'heading', '3. Third-Party Services',
            'content', 'Payment processing and automated order fulfillment may transmit necessary transaction fields to authorized gateway and API partners.'
          )
        )
      ),
      'refund', jsonb_build_object(
        'title', 'Refund & Cancellation Policy',
        'subtitle', 'Guidelines for order refunds, wallet adjustments, and failed transaction processing.',
        'last_updated', '2026-08-01',
        'sections', jsonb_build_array(
          jsonb_build_object(
            'heading', '1. Digital Goods Non-Refundability',
            'content', 'Due to the nature of instant digital top-ups and game vouchers, completed orders where items have been successfully delivered are non-refundable.'
          ),
          jsonb_build_object(
            'heading', '2. Failed Orders & Wallet Refunds',
            'content', 'If an order fails or cannot be delivered due to system errors, the payment amount will be automatically refunded back to your Pixie Kat Wallet balance.'
          ),
          jsonb_build_object(
            'heading', '3. Support Requests',
            'content', 'For disputes or order issues, please contact support within 24 hours of transaction with your Order ID and player credentials.'
          )
        )
      )
    )
  )
WHERE id = TRUE;
