-- Grant authenticated users row-scoped access to notifications (RLS enforces ownership).
-- Without these GRANTs PostgREST returns 403 even when RLS policies exist.

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.notifications TO service_role;
