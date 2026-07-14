-- ════════════════════════════════════════════════════════
--  ZURI — Seed Data
--  Run FOURTH (after rls-policies.sql).
--  Sample agencies for the marketplace. Replace with real
--  partners before public launch.
-- ════════════════════════════════════════════════════════

insert into public.agencies
  (name, description, specialties, location, price_range,
   response_time_hours, rating, review_count, contact_email,
   is_verified, is_featured, is_active)
values
  (
    'Lagos Social Co.',
    'Boutique social media agency helping Lagos SMEs grow on Instagram and TikTok with scroll-stopping content and community management.',
    array['instagram', 'tiktok', 'video'],
    'Lagos, Nigeria',
    '₦100k-250k',
    24, 4.8, 37,
    'hello@lagossocial.co',
    true, true, true
  ),
  (
    'Abuja Brand Studio',
    'Full-service brand and content studio for professional service firms. Strong on LinkedIn thought leadership and email newsletters.',
    array['linkedin', 'email', 'instagram'],
    'Abuja, Nigeria',
    '₦100k-250k',
    48, 4.6, 21,
    'studio@abujabrand.ng',
    true, true, true
  ),
  (
    'Naija Reels Lab',
    'Short-form video specialists. We turn your business into Reels, Shorts and TikToks that convert. Fast turnaround, founder-friendly pricing.',
    array['video', 'tiktok', 'instagram'],
    'Remote (Nigeria)',
    '₦50k-100k',
    24, 4.9, 52,
    'book@naijareelslab.com',
    true, true, true
  ),
  (
    'Port Harcourt Digital',
    'Digital marketing agency serving South-South businesses. Paid ads, social management, and WhatsApp marketing funnels.',
    array['instagram', 'facebook', 'whatsapp'],
    'Port Harcourt, Nigeria',
    '₦50k-100k',
    48, 4.4, 14,
    'team@phdigital.ng',
    true, false, true
  ),
  (
    'Savannah Content House',
    'Premium content agency for ambitious founders. Editorial-quality writing, photography direction, and multi-platform campaigns.',
    array['linkedin', 'instagram', 'email', 'video'],
    'Lagos, Nigeria',
    '$500-1500',
    48, 4.7, 29,
    'partners@savannahcontent.com',
    true, true, true
  ),
  (
    'GrowthGang NG',
    'Performance-driven agency focused on measurable results for e-commerce and retail brands. Meta & TikTok ads + organic content.',
    array['facebook', 'instagram', 'tiktok'],
    'Remote (Nigeria)',
    '₦100k-250k',
    24, 4.5, 33,
    'grow@growthgang.ng',
    true, false, true
  );

-- ────────────────────────────────────────────────────────
--  Quick verification
-- ────────────────────────────────────────────────────────
-- select name, location, specialties, rating from public.agencies
-- order by is_featured desc, rating desc;