-- FindMyTruck: three-tier truck status ("Boost" replaces "Go live").
-- Run this in the Supabase SQL editor AFTER 0006_reviews_and_dashboard.sql.
--
-- Status on the map/list is now derived, not stored:
--   BOOSTED  the owner pressed "Boost" and boost_expires_at is still in the future
--   OPEN     a weekly schedule slot is active right now (no action needed)
--   CLOSED   neither of the above
--
-- "Boosted" is computed on read as (boosted = true AND now() < boost_expires_at),
-- so no cron job is needed -- a boost simply stops counting once it expires.
--
-- This migration:
--   1. Adds boost columns to `trucks`.
--   2. Migrates any in-progress legacy "Go live" session (a truck_schedules row
--      with notes = 'live') to the new boost columns, then removes those rows.
--   3. Re-creates the public-safe `public_trucks` view with the new columns.

-- =========================
-- 1. NEW COLUMNS ON trucks
-- =========================

alter table trucks add column if not exists boosted boolean not null default false;
alter table trucks add column if not exists boost_expires_at timestamptz;
alter table trucks add column if not exists boost_started_at timestamptz;
-- Optional GPS captured at boost time to refine the pin; schedule location is the fallback.
alter table trucks add column if not exists boost_lat double precision;
alter table trucks add column if not exists boost_lng double precision;

-- =========================
-- 2. MIGRATE LEGACY "Go live" SESSIONS
-- The old flow inserted a truck_schedules row with specific_date = today and
-- notes = 'live'. Carry any still-running one over to the boost columns.
-- =========================

update trucks t
set boosted = true,
    boost_started_at = (s.specific_date + s.start_time)::timestamptz,
    boost_expires_at = (s.specific_date + s.end_time)::timestamptz,
    boost_lat = s.location_lat,
    boost_lng = s.location_lng
from truck_schedules s
where s.truck_id = t.id
  and s.notes = 'live'
  and s.specific_date is not null
  and (s.specific_date + s.end_time)::timestamptz > now();

delete from truck_schedules
where notes = 'live' and specific_date is not null;

-- =========================
-- 3. PUBLIC-SAFE VIEW (drop + recreate so column order can't clash)
-- =========================

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
  boosted, boost_expires_at, boost_started_at, boost_lat, boost_lng
from trucks;

grant select on public_trucks to anon, authenticated;
