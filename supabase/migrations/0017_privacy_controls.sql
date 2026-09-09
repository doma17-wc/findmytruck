-- FindMyTruck: privacy / contact-visibility controls.
-- Run this in the Supabase SQL editor AFTER 0016_catering.sql.
--
-- Privacy by default: a truck's phone number, contact email, and catering
-- contact info are now HIDDEN on the public profile unless the owner
-- explicitly switches them on (three independent toggles, all default OFF).
--
--   1. Three new boolean columns on `trucks`, all `not null default false`.
--   2. `public_trucks` view re-created so the gating happens IN THE VIEW
--      itself (a `case when show_x then x else null end`) -- not just in the
--      app layer. This means the raw phone/email value never leaves the
--      database via the public API when the toggle is off, even if some
--      future page forgets to check the flag.
--
-- `catering_contact_email` / `catering_contact_phone` (migration 0016) were
-- previously exposed on public_trucks unconditionally whenever a truck had
-- catering_available = true. They're now additionally gated behind
-- `show_catering_contact`, independent of the two general contact toggles.
--
-- No RLS changes needed: "owners update own truck" (0002/0014) already lets
-- an owner UPDATE these columns, and public_trucks keeps its existing
-- `grant select ... to anon, authenticated`.
--
-- SAFE TO RE-RUN: add column if not exists + drop/create view.

-- =========================================================================
-- 1. NEW COLUMNS ON trucks
-- =========================================================================

alter table trucks add column if not exists show_phone boolean not null default false;
alter table trucks add column if not exists show_email boolean not null default false;
alter table trucks add column if not exists show_catering_contact boolean not null default false;

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
  case when show_catering_contact then catering_contact_email else null end as catering_contact_email,
  case when show_catering_contact then catering_contact_phone else null end as catering_contact_phone,
  show_phone, show_email, show_catering_contact,
  case when show_phone then phone else null end as phone,
  case when show_email then owner_email else null end as email
from trucks;

grant select on public_trucks to anon, authenticated;
