-- ============================================================
-- WEBSITE BUILDER v2 follow-up: drop v1 composition_json
-- docs/02_WEBSITE_BUILDER.md §11 — v2 uses template_html instead.
-- Safe: websites table had 0 rows at apply time (pre-launch).
-- ============================================================

ALTER TABLE websites DROP COLUMN IF EXISTS composition_json;
