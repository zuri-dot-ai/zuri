-- Allow authenticated users to insert their own notification_preferences
-- (RLS still enforces user_id = auth.uid()). Required for PostgREST upsert
-- and for first-time preference writes when the signup trigger missed a row.
GRANT SELECT, INSERT, UPDATE ON TABLE public.notification_preferences TO authenticated;

-- Ensure push_enabled exists even if the FCM migration was only partly applied.
ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS push_enabled boolean NOT NULL DEFAULT true;
