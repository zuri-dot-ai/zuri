-- ============================================================================
-- 009_rls.sql
-- ALL Row Level Security policies from docs/10_SECURITY.md Section 3.2
-- Every table: ENABLE ROW LEVEL SECURITY + FORCE ROW LEVEL SECURITY
-- ============================================================================

-- ============================================================
-- PROFILES
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles FORCE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- No INSERT policy for profiles — created by trigger / service role
-- No DELETE policy — account deletion handled by admin/service role only

-- ============================================================
-- BUSINESS PROFILES
-- ============================================================
ALTER TABLE business_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_profiles FORCE ROW LEVEL SECURITY;

CREATE POLICY "business_profiles_all_own" ON business_profiles
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- SUBSCRIPTIONS
-- ============================================================
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions FORCE ROW LEVEL SECURITY;

CREATE POLICY "subscriptions_select_own" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "subscriptions_service_all" ON subscriptions
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- USAGE TRACKING
-- ============================================================
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking FORCE ROW LEVEL SECURITY;

CREATE POLICY "usage_select_own" ON usage_tracking
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "usage_service_all" ON usage_tracking
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- PAYMENT HISTORY
-- ============================================================
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_history FORCE ROW LEVEL SECURITY;

CREATE POLICY "payment_select_own" ON payment_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "payment_service_all" ON payment_history
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- WEBHOOK EVENTS (service role only)
-- ============================================================
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events FORCE ROW LEVEL SECURITY;

CREATE POLICY "webhook_service_only" ON webhook_events
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- PLANS (public read — pricing is not secret)
-- ============================================================
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans FORCE ROW LEVEL SECURITY;

CREATE POLICY "plans_public_read" ON plans
  FOR SELECT USING (true);

CREATE POLICY "plans_service_write" ON plans
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- WEBSITES
-- ============================================================
ALTER TABLE websites ENABLE ROW LEVEL SECURITY;
ALTER TABLE websites FORCE ROW LEVEL SECURITY;

CREATE POLICY "websites_all_own" ON websites
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "websites_public_read_published" ON websites
  FOR SELECT USING (status = 'published');

CREATE POLICY "websites_service_all" ON websites
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- WEBSITE GENERATION JOBS
-- ============================================================
ALTER TABLE website_generation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_generation_jobs FORCE ROW LEVEL SECURITY;

CREATE POLICY "gen_jobs_select_own" ON website_generation_jobs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "gen_jobs_service_all" ON website_generation_jobs
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- WEBSITE IMAGES
-- ============================================================
ALTER TABLE website_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_images FORCE ROW LEVEL SECURITY;

CREATE POLICY "website_images_all_own" ON website_images
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- CONTACT SUBMISSIONS
-- ============================================================
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_submissions FORCE ROW LEVEL SECURITY;

CREATE POLICY "contact_select_owner" ON contact_submissions
  FOR SELECT USING (auth.uid() = website_owner_id);

CREATE POLICY "contact_public_insert" ON contact_submissions
  FOR INSERT WITH CHECK (true);

-- ============================================================
-- CONTENT CALENDAR
-- ============================================================
ALTER TABLE content_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_calendar FORCE ROW LEVEL SECURITY;

CREATE POLICY "calendar_all_own" ON content_calendar
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "calendar_service_all" ON content_calendar
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- CONTENT PILLARS
-- ============================================================
ALTER TABLE content_pillars ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_pillars FORCE ROW LEVEL SECURITY;

CREATE POLICY "pillars_all_own" ON content_pillars
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- GENERATED CONTENT
-- ============================================================
ALTER TABLE generated_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_content FORCE ROW LEVEL SECURITY;

CREATE POLICY "generated_all_own" ON generated_content
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- CONTENT STRATEGY INSIGHTS
-- ============================================================
ALTER TABLE content_strategy_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_strategy_insights FORCE ROW LEVEL SECURITY;

CREATE POLICY "insights_select_own" ON content_strategy_insights
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "insights_service_all" ON content_strategy_insights
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- ANALYTICS TABLES (pageviews, events, daily aggregates)
-- ============================================================
ALTER TABLE website_pageviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_pageviews FORCE ROW LEVEL SECURITY;

CREATE POLICY "pageviews_public_insert" ON website_pageviews
  FOR INSERT WITH CHECK (true);

CREATE POLICY "pageviews_service_all" ON website_pageviews
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE website_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_events FORCE ROW LEVEL SECURITY;

CREATE POLICY "events_public_insert" ON website_events
  FOR INSERT WITH CHECK (true);

CREATE POLICY "events_service_all" ON website_events
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE website_analytics_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_analytics_daily FORCE ROW LEVEL SECURITY;

CREATE POLICY "analytics_daily_service_all" ON website_analytics_daily
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- META CONNECTIONS (encrypted tokens)
-- ============================================================
ALTER TABLE meta_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_connections FORCE ROW LEVEL SECURITY;

CREATE POLICY "meta_conn_select_own" ON meta_connections
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "meta_conn_service_all" ON meta_connections
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- META INSIGHTS
-- ============================================================
ALTER TABLE meta_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_insights FORCE ROW LEVEL SECURITY;

CREATE POLICY "meta_insights_select_own" ON meta_insights
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "meta_insights_service_all" ON meta_insights
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- SEARCH CONSOLE CONNECTIONS AND SNAPSHOTS
-- ============================================================
ALTER TABLE search_console_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_console_connections FORCE ROW LEVEL SECURITY;

CREATE POLICY "sc_conn_select_own" ON search_console_connections
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "sc_conn_service_all" ON search_console_connections
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE search_console_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_console_snapshots FORCE ROW LEVEL SECURITY;

CREATE POLICY "sc_snap_select_own" ON search_console_snapshots
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "sc_snap_service_all" ON search_console_snapshots
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- MONTHLY REPORTS
-- ============================================================
ALTER TABLE monthly_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_reports FORCE ROW LEVEL SECURITY;

CREATE POLICY "reports_select_own" ON monthly_reports
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "reports_service_all" ON monthly_reports
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- AGENCIES (public read — marketplace is public)
-- ============================================================
ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE agencies FORCE ROW LEVEL SECURITY;

CREATE POLICY "agencies_public_read" ON agencies
  FOR SELECT USING (is_active = true);

CREATE POLICY "agencies_admin_all" ON agencies
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ============================================================
-- AGENCY INQUIRIES
-- ============================================================
ALTER TABLE agency_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE agency_inquiries FORCE ROW LEVEL SECURITY;

CREATE POLICY "inquiries_all_own" ON agency_inquiries
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "inquiries_admin_read" ON agency_inquiries
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ============================================================
-- AGENCY APPLICATIONS
-- ============================================================
ALTER TABLE agency_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE agency_applications FORCE ROW LEVEL SECURITY;

CREATE POLICY "applications_public_insert" ON agency_applications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "applications_admin_all" ON agency_applications
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications FORCE ROW LEVEL SECURITY;

CREATE POLICY "notifications_all_own" ON notifications
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "notifications_service_insert" ON notifications
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- NOTIFICATION PREFERENCES
-- ============================================================
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences FORCE ROW LEVEL SECURITY;

CREATE POLICY "notif_prefs_all_own" ON notification_preferences
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- EMAIL SEND LOG (internal only)
-- ============================================================
ALTER TABLE email_send_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_send_log FORCE ROW LEVEL SECURITY;

CREATE POLICY "email_log_service_only" ON email_send_log
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- TRENDING TOPICS CACHE (service role only)
-- ============================================================
ALTER TABLE trending_topics_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE trending_topics_cache FORCE ROW LEVEL SECURITY;

CREATE POLICY "trends_cache_service_only" ON trending_topics_cache
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- RATE LIMIT LOG (internal — not in Section 3.2 catalogue but must have RLS)
-- ============================================================
ALTER TABLE rate_limit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_log FORCE ROW LEVEL SECURITY;

CREATE POLICY "rate_limit_service_only" ON rate_limit_log
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- AUDIT LOGS
-- ============================================================
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY;

CREATE POLICY "audit_select_own" ON audit_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "audit_service_insert" ON audit_logs
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "audit_admin_all" ON audit_logs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ============================================================================
-- RLS AUDIT QUERY (docs/10_SECURITY.md Section 3.1)
-- Every row must show rowsecurity = true
-- ============================================================================
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
