-- Agency application form fields (hybrid apply flow)
-- website, logo_url, whatsapp, portfolio_image_urls

ALTER TABLE agency_applications
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS whatsapp text,
  ADD COLUMN IF NOT EXISTS portfolio_image_urls text[] DEFAULT '{}';
