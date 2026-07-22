-- ============================================================================
-- 20260721_agency_marketplace_spec_columns.sql
-- Extends the legacy `agencies` table (specialties/rating/response_time_hours)
-- with the docs/07_AGENCY_MARKETPLACE.md §2 columns needed for the public
-- marketplace (directory, inquiries, applications, admin CRUD).
--
-- Non-destructive: legacy columns and the existing AI-brief-matching feature
-- (src/app/(app)/agencies, /api/agencies/brief, /api/agencies/match) are
-- untouched. New application code reads/writes only the new columns.
-- ============================================================================

alter table agencies add column if not exists slug text;
alter table agencies add column if not exists cover_image_url text;
alter table agencies add column if not exists tagline text;
alter table agencies add column if not exists location_city text;
alter table agencies add column if not exists services text[] not null default '{}';
alter table agencies add column if not exists team_size text;
alter table agencies add column if not exists portfolio_items jsonb not null default '[]';
alter table agencies add column if not exists contact_whatsapp text;
alter table agencies add column if not exists response_time text not null default '1_2_days';
alter table agencies add column if not exists is_zuri_certified boolean not null default false;
alter table agencies add column if not exists inquiries_count integer not null default 0;
alter table agencies add column if not exists updated_at timestamptz not null default now();

-- Backfill new required fields for any pre-existing rows so NOT NULL /
-- uniqueness constraints below are satisfiable.
update agencies
set slug = coalesce(
  slug,
  lower(regexp_replace(regexp_replace(trim(name), '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g'))
    || '-' || substr(id::text, 1, 8)
)
where slug is null;

-- Backfill tagline — legacy table may or may not have description.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'agencies' and column_name = 'description'
  ) then
    update agencies
    set tagline = coalesce(tagline, left(description, 80), name)
    where tagline is null;
  else
    update agencies set tagline = coalesce(tagline, name) where tagline is null;
  end if;
end;
$$;

-- Backfill location_city — legacy table may use location, or neither column.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'agencies' and column_name = 'location'
  ) then
    update agencies
    set location_city = coalesce(location_city, location, 'Lagos')
    where location_city is null;
  else
    update agencies set location_city = coalesce(location_city, 'Lagos') where location_city is null;
  end if;
end;
$$;

alter table agencies alter column slug set not null;
alter table agencies alter column tagline set not null;
alter table agencies alter column location_city set not null;

create unique index if not exists idx_agencies_slug_unique on agencies(slug);
create index if not exists idx_agencies_services on agencies using gin(services);
create index if not exists idx_agencies_active_featured
  on agencies(is_active, is_featured desc, is_zuri_certified desc);

-- Atomic increment for inquiries_count (idempotent — matches docs §7)
create or replace function increment_agency_inquiries(agency_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update agencies set inquiries_count = inquiries_count + 1
  where id = agency_id;
end;
$$;
