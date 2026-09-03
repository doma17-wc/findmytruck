-- FindMyTruck: admin control center.
-- Run this in the Supabase SQL editor AFTER 0007_boost_status.sql.
--
-- This migration:
--   1. Adds a `paused` boolean to `trucks` (a paused truck keeps all its data
--      but is hidden from every public surface — map, list, browse, search,
--      profile page).
--   2. Re-creates the public-safe `public_trucks` view with `paused` appended.
--   3. Adds two SECURITY DEFINER RPCs the admin panel uses to link / unlink a
--      truck-owner account by email. They are granted to `service_role` ONLY
--      (never anon), so they can only be called from the admin server actions
--      using SUPABASE_SERVICE_ROLE_KEY — the password-gated /admin panel.

-- =========================
-- 1. NEW COLUMN ON trucks
-- =========================

alter table trucks add column if not exists paused boolean not null default false;

-- =========================
-- 2. PUBLIC-SAFE VIEW (drop + recreate so column order can't clash)
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
  boosted, boost_expires_at, boost_started_at, boost_lat, boost_lng,
  paused
from trucks;

grant select on public_trucks to anon, authenticated;

-- =========================
-- 3. RPC: admin_link_truck_owner(email, truck_id)
-- Links the auth user with that email to the given truck as a verified
-- truck_owner. Used by the admin "assign owner" action. Sets the profile-guard
-- bypass flag so it can write role / truck_id (see 0002_auth_favorites_views).
-- =========================

create or replace function admin_link_truck_owner(p_email text, p_truck_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
begin
  select id into v_uid from auth.users where lower(email) = lower(trim(p_email)) limit 1;
  if v_uid is null then
    raise exception 'No account found for %', p_email;
  end if;
  if not exists (select 1 from trucks where id = p_truck_id) then
    raise exception 'Truck not found';
  end if;

  -- Free the target truck from any other owner first.
  perform set_config('app.bypass_profile_guard', 'true', true);
  update profiles set truck_id = null, role = 'customer'
    where truck_id = p_truck_id and id <> v_uid;

  insert into profiles (id, role, truck_id, display_name)
  values (v_uid, 'truck_owner', p_truck_id, null)
  on conflict (id) do update
    set role = 'truck_owner', truck_id = excluded.truck_id;

  update trucks set claim_status = 'claimed', is_claimed = true where id = p_truck_id;
end;
$$;

grant execute on function admin_link_truck_owner(text, uuid) to service_role;

-- =========================
-- 4. RPC: admin_unlink_truck_owner(truck_id)
-- Detaches whatever account currently owns the truck and resets the truck to
-- 'unclaimed'. Used by the admin "unassign owner" action and when deleting a
-- truck-owner user.
-- =========================

create or replace function admin_unlink_truck_owner(p_truck_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('app.bypass_profile_guard', 'true', true);
  update profiles set truck_id = null, role = 'customer' where truck_id = p_truck_id;
  update trucks set claim_status = 'unclaimed', is_claimed = false where id = p_truck_id;
end;
$$;

grant execute on function admin_unlink_truck_owner(uuid) to service_role;
