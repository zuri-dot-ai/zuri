-- Align content_calendar to strategy shape (scheduled_date, topic, hook, format_type, …)
-- Safe to run on DBs that still have legacy slot_date / theme / ai_draft columns.

-- Ensure content_pillars exists before FK
CREATE TABLE IF NOT EXISTS public.content_pillars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  icon text,
  color text,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_content_pillars_user_id ON public.content_pillars(user_id);

-- Rename slot_date → scheduled_date when needed
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'content_calendar' AND column_name = 'slot_date'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'content_calendar' AND column_name = 'scheduled_date'
  ) THEN
    ALTER TABLE public.content_calendar RENAME COLUMN slot_date TO scheduled_date;
  END IF;
END $$;

-- Ensure strategy columns exist
ALTER TABLE public.content_calendar
  ADD COLUMN IF NOT EXISTS pillar_id uuid REFERENCES public.content_pillars(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS scheduled_time time,
  ADD COLUMN IF NOT EXISTS format_type text,
  ADD COLUMN IF NOT EXISTS topic text,
  ADD COLUMN IF NOT EXISTS hook text,
  ADD COLUMN IF NOT EXISTS brief text,
  ADD COLUMN IF NOT EXISTS is_cultural_moment boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS cultural_moment_name text,
  ADD COLUMN IF NOT EXISTS coming_soon boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_series boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS series_title text,
  ADD COLUMN IF NOT EXISTS series_part integer,
  ADD COLUMN IF NOT EXISTS series_total integer,
  ADD COLUMN IF NOT EXISTS repurposed_from uuid REFERENCES public.content_calendar(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS needs_review boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS content_id uuid,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Backfill topic from legacy theme
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'content_calendar' AND column_name = 'theme'
  ) THEN
    UPDATE public.content_calendar
    SET topic = COALESCE(NULLIF(topic, ''), theme, 'Untitled post')
    WHERE topic IS NULL OR topic = '';
  ELSE
    UPDATE public.content_calendar
    SET topic = COALESCE(NULLIF(topic, ''), 'Untitled post')
    WHERE topic IS NULL OR topic = '';
  END IF;
END $$;

UPDATE public.content_calendar
SET format_type = COALESCE(NULLIF(format_type, ''), 'static_image')
WHERE format_type IS NULL OR format_type = '';

-- Map legacy statuses → strategy statuses
UPDATE public.content_calendar
SET status = 'draft'
WHERE status IN ('briefed', 'drafted');

-- Drop legacy columns
ALTER TABLE public.content_calendar
  DROP COLUMN IF EXISTS post_type,
  DROP COLUMN IF EXISTS theme,
  DROP COLUMN IF EXISTS ai_draft,
  DROP COLUMN IF EXISTS hashtags,
  DROP COLUMN IF EXISTS canva_url,
  DROP COLUMN IF EXISTS video_url;

-- scheduled_date / topic / format_type should be NOT NULL for new writes
ALTER TABLE public.content_calendar
  ALTER COLUMN scheduled_date SET NOT NULL;

DO $$
BEGIN
  BEGIN
    ALTER TABLE public.content_calendar ALTER COLUMN topic SET NOT NULL;
  EXCEPTION WHEN others THEN
    NULL; -- may fail if nulls remain; backfill above should cover
  END;
  BEGIN
    ALTER TABLE public.content_calendar ALTER COLUMN format_type SET NOT NULL;
  EXCEPTION WHEN others THEN
    NULL;
  END;
END $$;

DROP INDEX IF EXISTS public.idx_content_user_date;
DROP INDEX IF EXISTS public.idx_content_calendar_user_date;
CREATE INDEX IF NOT EXISTS idx_content_calendar_user_date
  ON public.content_calendar(user_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_content_calendar_status
  ON public.content_calendar(user_id, status);
CREATE INDEX IF NOT EXISTS idx_content_calendar_platform
  ON public.content_calendar(user_id, platform);

-- Ensure trending_topics_cache exists
CREATE TABLE IF NOT EXISTS public.trending_topics_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  industry text UNIQUE NOT NULL,
  topics jsonb NOT NULL,
  cached_at timestamptz DEFAULT now()
);

-- Grants for content strategy tables
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.content_pillars TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.content_calendar TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.trending_topics_cache TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.content_pillars TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.content_calendar TO authenticated;
GRANT SELECT ON TABLE public.trending_topics_cache TO authenticated;
