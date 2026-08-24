-- FindMyTruck: richer truck profile fields for the dashboard's chip-based
-- profile editor (food type, dietary options, payment methods, features).
-- Run this in the Supabase SQL editor AFTER 0002_auth_favorites_views.sql.

alter table trucks add column if not exists food_type text[] not null default '{}';
alter table trucks add column if not exists dietary_options text[] not null default '{}';
alter table trucks add column if not exists payment_methods text[] not null default '{}';
alter table trucks add column if not exists features text[] not null default '{}';

-- Re-create the public-safe view to expose the new columns (still excludes
-- phone/owner_name/owner_email). New columns must be appended at the END of
-- the select list -- `create or replace view` requires existing column
-- names/positions to stay stable, so inserting them earlier fails with
-- "cannot change name of view column ... to ...".
create or replace view public_trucks as
select
  id, slug, name, description, cuisine_type, price_range,
  logo_url, cover_photo_url, menu_text, menu_photo_url,
  instagram, tiktok, website, languages,
  is_active, is_claimed, short_code, created_at, updated_at,
  food_type, dietary_options, payment_methods, features
from trucks;

grant select on public_trucks to anon, authenticated;
