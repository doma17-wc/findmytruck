-- FindMyTruck: structured menu builder for the truck-owner dashboard.
-- Run this in the Supabase SQL editor AFTER 0003_truck_profile_details.sql.
--
-- Adds a `menu_items` jsonb column holding an ordered array of
--   { "name": string, "price": number|null, "description": string|null, "category": string|null }
-- The legacy free-text `menu_text` column is kept untouched for backwards
-- compatibility; the new dashboard editor writes to `menu_items` only.

alter table trucks add column if not exists menu_items jsonb not null default '[]'::jsonb;

-- Re-create the public-safe view so the new column reaches the public site.
-- New columns must be appended at the END of the select list (see 0003).
create or replace view public_trucks as
select
  id, slug, name, description, cuisine_type, price_range,
  logo_url, cover_photo_url, menu_text, menu_photo_url,
  instagram, tiktok, website, languages,
  is_active, is_claimed, short_code, created_at, updated_at,
  food_type, dietary_options, payment_methods, features,
  menu_items
from trucks;

grant select on public_trucks to anon, authenticated;
