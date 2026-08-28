-- FindMyTruck: "unclaimed profiles" system.
-- Run this in the Supabase SQL editor AFTER 0004_structured_menu.sql.
--
-- Lets the map be populated with public food-truck data WITHOUT creating an
-- auth account for each truck and without publishing copyrighted photos.
-- Truck owners later claim their profile at /claim/<slug>; an admin verifies.
--
-- This migration:
--   1. Adds claim_status / source_region / source_website / region_lat /
--      region_lng to `trucks` (is_claimed already exists from seed.sql).
--   2. Re-creates the public-safe `public_trucks` view with the new columns.
--   3. Adds the claim_truck(slug) SECURITY DEFINER RPC used by the claim flow.
--   4. Hardens register_truck_owner(...) so it ignores pending/claimed trucks.

-- =========================
-- 1. NEW COLUMNS ON trucks
-- =========================

alter table trucks add column if not exists is_claimed boolean not null default false;
alter table trucks add column if not exists claim_status text not null default 'unclaimed';
alter table trucks add column if not exists source_region text;
alter table trucks add column if not exists source_website text;

-- Approx. home-base coordinates: lets a truck with NO schedule still get a map
-- pin at its region's centre (a "region marker"). Populated by the import
-- script from the public region name; owners replace it with a real schedule
-- once they've claimed the profile.
alter table trucks add column if not exists region_lat double precision;
alter table trucks add column if not exists region_lng double precision;

-- Constrain claim_status to the known values (drop-then-add so re-runs are safe).
alter table trucks drop constraint if exists trucks_claim_status_check;
alter table trucks add constraint trucks_claim_status_check
  check (claim_status in ('unclaimed', 'pending', 'claimed'));

-- Keep the two "claimed" signals consistent for rows that pre-date this column.
update trucks
set claim_status = case when is_claimed then 'claimed' else 'unclaimed' end
where (is_claimed and claim_status is distinct from 'claimed')
   or (not is_claimed and claim_status = 'claimed');

-- =========================
-- 2. PUBLIC-SAFE VIEW (append new columns at the END -- see 0003/0004)
-- =========================

create or replace view public_trucks as
select
  id, slug, name, description, cuisine_type, price_range,
  logo_url, cover_photo_url, menu_text, menu_photo_url,
  instagram, tiktok, website, languages,
  is_active, is_claimed, short_code, created_at, updated_at,
  food_type, dietary_options, payment_methods, features,
  menu_items,
  claim_status, source_region, source_website, region_lat, region_lng
from trucks;

grant select on public_trucks to anon, authenticated;

-- =========================
-- 3. RPC: claim_truck(slug)
-- Called from /claim/<slug> once the claimer has an authenticated session.
-- Links the caller's profile to the (still unclaimed) truck and moves it to
-- 'pending' so an admin can verify before it is marked fully claimed.
-- SECURITY DEFINER so it can write profiles past guard_profiles_update().
-- =========================

create or replace function claim_truck(p_slug text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_truck_id uuid;
  v_status text;
  v_name text;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select id, claim_status, name
    into v_truck_id, v_status, v_name
  from trucks
  where slug = p_slug;

  if v_truck_id is null then
    raise exception 'Truck not found';
  end if;
  if v_status = 'claimed' then
    raise exception 'This profile has already been claimed';
  end if;
  if v_status = 'pending' then
    raise exception 'A claim for this profile is already awaiting verification';
  end if;

  if exists (select 1 from profiles where id = v_uid and truck_id is not null) then
    raise exception 'This account is already linked to a truck';
  end if;

  perform set_config('app.bypass_profile_guard', 'true', true);

  insert into profiles (id, role, truck_id, display_name)
  values (v_uid, 'truck_owner', v_truck_id, v_name)
  on conflict (id) do update
    set role = 'truck_owner', truck_id = excluded.truck_id;

  update trucks set claim_status = 'pending' where id = v_truck_id;

  return v_truck_id;
end;
$$;

grant execute on function claim_truck(text) to authenticated;

-- =========================
-- 4. Harden register_truck_owner(...)
-- The /register-truck flow claims an existing truck by exact name match. Make
-- sure it only ever grabs a genuinely *unclaimed* truck (not one that is
-- 'pending' an in-person claim), and that a brand-new truck it creates is
-- immediately marked claimed.
-- =========================

create or replace function register_truck_owner(p_truck_name text, p_display_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_truck_id uuid;
  v_slug text;
  v_name text := trim(p_truck_name);
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  if v_name = '' then
    raise exception 'Truck name is required';
  end if;

  if exists (select 1 from profiles where id = v_uid and truck_id is not null) then
    raise exception 'This account is already linked to a truck';
  end if;

  select id into v_truck_id
  from trucks
  where lower(name) = lower(v_name)
    and is_claimed = false
    and coalesce(claim_status, 'unclaimed') = 'unclaimed'
  limit 1;

  if v_truck_id is null then
    v_slug := lower(regexp_replace(v_name, '[^a-zA-Z0-9]+', '-', 'g'));
    v_slug := trim(both '-' from v_slug);
    if v_slug = '' then
      v_slug := 'truck';
    end if;
    if exists (select 1 from trucks where slug = v_slug) then
      v_slug := v_slug || '-' || substr(v_uid::text, 1, 6);
    end if;

    insert into trucks (slug, name, is_claimed, is_active, claim_status)
    values (v_slug, v_name, true, true, 'claimed')
    returning id into v_truck_id;
  else
    update trucks set is_claimed = true, claim_status = 'claimed' where id = v_truck_id;
  end if;

  perform set_config('app.bypass_profile_guard', 'true', true);

  insert into profiles (id, role, truck_id, display_name)
  values (v_uid, 'truck_owner', v_truck_id, coalesce(nullif(trim(p_display_name), ''), v_name))
  on conflict (id) do update
    set role = 'truck_owner', truck_id = excluded.truck_id, display_name = excluded.display_name;

  return v_truck_id;
end;
$$;

grant execute on function register_truck_owner(text, text) to authenticated;
