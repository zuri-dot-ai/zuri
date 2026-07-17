-- ============================================================
-- Fix: service_role (and roles) lacked table privileges on profiles
-- Error: permission denied for table profiles (42501)
-- ============================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Supabase service_role must be able to read/write app tables (bypasses RLS)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.profiles TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.websites TO service_role;

-- Authenticated users need row-scoped access via RLS policies
GRANT SELECT, UPDATE ON TABLE public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.websites TO authenticated;

-- Handle availability check — SECURITY DEFINER so it works even when
-- callers lack direct SELECT on other users' profile rows.
CREATE OR REPLACE FUNCTION public.is_handle_available(p_handle text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cleaned text;
BEGIN
  cleaned := lower(trim(p_handle));
  IF cleaned IS NULL OR cleaned = '' THEN
    RETURN false;
  END IF;

  IF EXISTS (SELECT 1 FROM public.profiles WHERE handle = cleaned) THEN
    RETURN false;
  END IF;

  IF to_regclass('public.websites') IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.websites WHERE handle = cleaned) THEN
      RETURN false;
    END IF;
  END IF;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_handle_available(text) TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.is_handle_available(text) IS
  'Returns true if handle is not taken on profiles or websites. Used by /api/handle/check.';
