-- Agency marketplace table privileges for service_role (+ authenticated admin reads).
-- Symptom: POST /api/agencies/apply → 500; PostgREST 42501:
--   "permission denied for table agency_applications"
--   hint: GRANT SELECT ON public.agency_applications TO service_role;
-- Same class of fix as 20260720_service_role_grants.sql / 20260722_notifications_grants.sql.
-- RLS still enforces row access; GRANTs are required for PostgREST to touch the table at all.

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.agency_applications TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.agencies TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.agency_inquiries TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.rate_limit_log TO service_role;

-- Admin UI /api/admin/* uses the user JWT (authenticated) + requireAdmin + RLS.
GRANT SELECT, UPDATE ON TABLE public.agency_applications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.agencies TO authenticated;
GRANT SELECT, UPDATE ON TABLE public.agency_inquiries TO authenticated;
