-- Session 3C: trend evidence, content ratings, brand voice examples
-- Spec: 03B §2.2, §3.2; 04B §2.1

-- ── Trend source on calendar slots ───────────────────────────────────────────
ALTER TABLE public.content_calendar
  ADD COLUMN IF NOT EXISTS trend_source jsonb;

-- ── Content ratings (1–5, one per generated_content) ─────────────────────────
CREATE TABLE IF NOT EXISTS public.content_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  generated_content_id uuid REFERENCES public.generated_content(id) ON DELETE CASCADE NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (generated_content_id)
);

ALTER TABLE public.content_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_ratings FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'content_ratings' AND policyname = 'ratings_all_own'
  ) THEN
    CREATE POLICY "ratings_all_own" ON public.content_ratings
      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_content_ratings_user ON public.content_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_content_ratings_content ON public.content_ratings(generated_content_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.content_ratings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.content_ratings TO service_role;

-- ── Brand voice examples ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.brand_voice_examples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  text text NOT NULL,
  source text NOT NULL,
  platform text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.brand_voice_examples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_voice_examples FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'brand_voice_examples' AND policyname = 'voice_examples_all_own'
  ) THEN
    CREATE POLICY "voice_examples_all_own" ON public.brand_voice_examples
      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_voice_examples_user
  ON public.brand_voice_examples(user_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.brand_voice_examples TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.brand_voice_examples TO service_role;
