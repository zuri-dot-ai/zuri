-- Extend service_role table privileges for onboarding + generation flows.
-- Symptom: "A database error occurred." during /api/onboarding/complete
-- Root cause: permission denied (42501) on tables missing GRANTs — same class
-- of bug fixed for profiles in 20260714_fix_handle_check_privileges.sql

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.profiles TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.business_profiles TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.website_generation_jobs TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.websites TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.subscriptions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.notification_preferences TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.usage_tracking TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.payment_history TO service_role;

-- Authenticated row-scoped access (RLS enforces ownership)
GRANT SELECT, UPDATE ON TABLE public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.business_profiles TO authenticated;
GRANT SELECT ON TABLE public.website_generation_jobs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.websites TO authenticated;
GRANT SELECT ON TABLE public.subscriptions TO authenticated;
GRANT SELECT, UPDATE ON TABLE public.notification_preferences TO authenticated;
GRANT SELECT ON TABLE public.usage_tracking TO authenticated;
