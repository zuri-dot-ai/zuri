-- ════════════════════════════════════════════════════════
--  ZURI — Calendar Generation Source Tracking
--  Distinguishes real AI-generated calendar slots from the
--  hardcoded template fallback used when Gemini calls fail,
--  so the UI can surface fallback content instead of letting
--  it sit indistinguishable from real AI output.
-- ════════════════════════════════════════════════════════

alter table content_calendar
  add column if not exists generation_source text not null default 'ai';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'content_calendar_generation_source_check'
  ) then
    alter table content_calendar
      add constraint content_calendar_generation_source_check
      check (generation_source in ('ai', 'fallback'));
  end if;
end $$;

comment on column content_calendar.generation_source is
  'ai = produced by a real Gemini call; fallback = hardcoded template used because Gemini failed.';
