-- FindMyTruck: catering feature.
-- Run this in the Supabase SQL editor AFTER 0015_account_management.sql.
--
-- Adds a self-contained "available for catering" advertisement on each truck --
-- separate from the weekly tour and from events. FindMyTruck is not a
-- middleman here: customers see the info and contact the truck directly
-- (mailto / tel), no booking or payment flows.
--
--   1. Nine new nullable/defaulted columns on `trucks` (no new table -- kept as
--      simple free-text/jsonb fields per the truck, matching how menu_items
--      already works).
--   2. `public_trucks` view re-created with the catering columns appended so
--      the public site (map, profile, /catering) can read them.
--
-- No new RLS policies are needed:
--   - "anon read trucks raw" (0002) already SELECTs every column of `trucks`
--     for anon + authenticated, and `public_trucks` is granted SELECT to both.
--   - "owners update own truck" (0002, redefined in 0014 for multi-truck) already
--     lets an owner UPDATE every column of a truck they own, catering included.
-- The app layer is what decides whether to render catering info (checking
-- catering_available), same pattern as `is_active` / `paused` elsewhere.
--
-- SAFE TO RE-RUN: add column if not exists + drop/create view.

-- =========================================================================
-- 1. NEW COLUMNS ON trucks
-- =========================================================================

alter table trucks add column if not exists catering_available boolean not null default false;
alter table trucks add column if not exists catering_description text;
-- Ordered array of { name, description, price } -- free-text "packages", same
-- shape convention as trucks.menu_items (see src/lib/menu.ts).
alter table trucks add column if not exists catering_offerings jsonb not null default '[]'::jsonb;
-- Free text, e.g. "Deutschschweiz", "Zürich + Umgebung", "ganze Schweiz" -- no map/geo.
alter table trucks add column if not exists catering_area text;
alter table trucks add column if not exists catering_min_guests integer;
alter table trucks add column if not exists catering_max_guests integer;
-- Ordered array of { id, url, caption } -- same shape as the truck_photos
-- gallery, just stored inline since it's a small, catering-only set of photos.
alter table trucks add column if not exists catering_photos jsonb not null default '[]'::jsonb;
alter table trucks add column if not exists catering_contact_email text;
alter table trucks add column if not exists catering_contact_phone text;

-- Speeds up "every truck available for catering" for the /catering page.
create index if not exists trucks_catering_available_idx
  on trucks (catering_available)
  where catering_available = true;

-- =========================================================================
-- 2. PUBLIC-SAFE VIEW (drop + recreate so column order can't clash)
-- =========================================================================

drop view if exists public_trucks;

create view public_trucks as
select
  id, slug, name, description, cuisine_type, price_range,
  logo_url, cover_photo_url, menu_text, menu_photo_url,
  instagram, tiktok, website, languages,
  is_active, is_claimed, short_code, created_at, updated_at,
  food_type, dietary_options, payment_methods, features,
  menu_items,
  claim_status, source_region, source_website, region_lat, region_lng,
  boosted, boost_expires_at, boost_started_at, boost_lat, boost_lng,
  paused,
  catering_available, catering_description, catering_offerings, catering_area,
  catering_min_guests, catering_max_guests, catering_photos,
  catering_contact_email, catering_contact_phone
from trucks;

grant select on public_trucks to anon, authenticated;
