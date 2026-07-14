-- ============================================================================
-- 006_marketplace.sql
-- agencies (+increment_agency_inquiries), agency_inquiries, agency_applications
-- Schema from docs/07_AGENCY_MARKETPLACE.md Section 7
-- ============================================================================

-- ============================================================================
-- AGENCIES
-- ============================================================================

create table if not exists agencies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  logo_url text,
  cover_image_url text,
  tagline text not null,
  description text not null,
  location_city text not null,
  services text[] not null default '{}',
  price_range text not null,
  team_size text not null,
  portfolio_items jsonb not null default '[]',
  contact_email text not null,
  contact_whatsapp text,
  response_time text not null default '1_2_days',
  is_featured boolean default false,
  is_verified boolean default false,
  is_zuri_certified boolean default false,
  is_active boolean default true,
  inquiries_count integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_agencies_services on agencies using gin(services);
create index if not exists idx_agencies_active_featured
  on agencies(is_active, is_featured desc, is_zuri_certified desc);
create index if not exists idx_agencies_slug on agencies(slug);

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

-- ============================================================================
-- AGENCY INQUIRIES
-- ============================================================================

create table if not exists agency_inquiries (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid references agencies(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  user_name text not null,
  user_email text not null,
  user_business_name text not null,
  user_industry text,
  user_location text,
  service_needed text,
  message text not null,
  budget text,
  status text not null default 'sent',
  -- status: sent | responded | not_responded | hired
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_agency_inquiries_user on agency_inquiries(user_id, created_at);
create index if not exists idx_agency_inquiries_agency on agency_inquiries(agency_id, created_at);

-- ============================================================================
-- AGENCY APPLICATIONS
-- ============================================================================

create table if not exists agency_applications (
  id uuid primary key default gen_random_uuid(),
  agency_name text not null,
  contact_name text not null,
  email text not null,
  phone text,
  location_city text not null,
  services text[] not null default '{}',
  team_size text,
  price_range text,
  portfolio_urls text[] default '{}',
  description text not null,
  referral_source text,
  status text not null default 'pending',
  -- status: pending | approved | rejected
  reviewer_notes text,
  reviewed_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists idx_agency_applications_status on agency_applications(status, created_at);
create index if not exists idx_agency_applications_email on agency_applications(email);
