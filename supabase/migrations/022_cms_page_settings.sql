-- ============================================================
-- Pixie-Kat: CMS page settings (How It Works, FAQ, Contact, Pricing copy)
-- Run AFTER 021_about_settings.sql
-- ============================================================

ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS how_it_works_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS faq_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS contact_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS pricing_settings JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Seed defaults only when columns are still empty objects
UPDATE public.store_settings
SET
  contact_settings = COALESCE(NULLIF(contact_settings, '{}'::jsonb), jsonb_build_object(
    'business_email', 'business@pixiekat.com',
    'whatsapp', '',
    'phone_display', '',
    'phone_hours', 'Mon–Sat, 10am–7pm IST',
    'hours_primary', 'Mon – Sat: 10am – 7pm',
    'hours_secondary', 'Sunday: Closed',
    'office_lines', jsonb_build_array(
      'Pixiekat HQ',
      '123 Gaming Street, Tech Park',
      'Bangalore, Karnataka 560001',
      'India'
    ),
    'map_embed_url', '',
    'whatsapp_message', 'Hi PixieKat support!'
  )),
  pricing_settings = COALESCE(NULLIF(pricing_settings, '{}'::jsonb), jsonb_build_object(
    'heading', 'Membership Plans',
    'subheading', 'Unlock exclusive benefits and save more on your gaming top-ups with our premium membership plans',
    'empty_message', 'No membership plans are available right now. Check back soon.',
    'faqs', jsonb_build_array(
      jsonb_build_object(
        'question', 'Can I change my plan anytime?',
        'answer', 'Yes, you can upgrade or downgrade your plan at any time. Changes take effect on your next eligible purchase.'
      ),
      jsonb_build_object(
        'question', 'Do unused benefits carry over?',
        'answer', 'Membership discounts apply while your plan is active. Benefits end when the plan expires unless you renew.'
      ),
      jsonb_build_object(
        'question', 'Is there a free trial?',
        'answer', 'Membership plans are paid subscriptions. Discounts apply immediately after purchase for the plan duration.'
      ),
      jsonb_build_object(
        'question', 'What payment methods do you accept?',
        'answer', 'We accept UPI, cards, net banking, digital wallets, and Pixie Wallet balance where available.'
      )
    )
  ))
WHERE id = TRUE;
