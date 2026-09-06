-- FindMyTruck: MULTI-TRUCK PER ACCOUNT.
-- Run this in the Supabase SQL editor AFTER 0013_customer_reviews_follow_notifications.sql.
--
-- Moves ownership from the one-to-one `profiles.truck_id` to a proper
-- one-to-many `truck_owners` join table, so a single owner account can manage
-- several trucks — each still an independent public profile / map pin.
--
-- This migration:
--   1. Adds `truck_owners (user_id, truck_id, role)` and BACKFILLS it from the
--      existing `profiles.truck_id` links, so no current owner loses access.
--   2. Keeps `profiles.truck_id` as an informational "default / last-selected
--      truck" pointer (the dashboard falls back to it). Source of truth for
--      ownership is now `truck_owners`.
--   3. Adds `my_truck_ids()` — the set of truck ids the calling user owns — and
--      re-creates every RLS policy that used
--      `truck_id in (select truck_id from profiles where id = auth.uid())`
--      to use it, so an owner can read/write ONLY their own trucks (now several)
--      and nobody else's.
--   4. Updates the ownership RPCs (`register_truck_owner`, `claim_truck`,
--      `admin_link_truck_owner`, `admin_unlink_truck_owner`) to append/detach a
--      single truck instead of assuming one-per-account, and adds
--      `admin_unlink_one_truck_owner(user_id, truck_id)` for per-truck admin
--      management.
--
-- SAFE TO RE-RUN: every statement is idempotent (create ... if not exists,
-- drop policy if exists, create or replace, on conflict do nothing).

-- =========================================================================
-- 1. truck_owners JOIN TABLE
-- =========================================================================

create table if not exists truck_owners (
  user_id uuid not null references auth.users(id) on delete cascade,
  truck_id uuid not null references trucks(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner')),
  created_at timestamptz not null default now(),
  primary key (user_id, truck_id)
);

create index if not exists idx_truck_owners_user_id on truck_owners(user_id);
create index if not exists idx_truck_owners_truck_id on truck_owners(truck_id);

alter table truck_owners enable row level security;

-- An owner can see their own membership rows (used by the app to list "my
-- trucks"). Nothing else is readable.
drop policy if exists "owners read own links" on truck_owners;
create policy "owners read own links" on truck_owners
  for select to authenticated
  using (user_id = auth.uid());

-- Anon write parity for the app-layer-gated /admin panel (same pattern as
-- "anon write trucks" etc). Membership from the public site only ever changes
-- through the SECURITY DEFINER RPCs below — there is deliberately NO
-- authenticated insert/update/delete policy.
drop policy if exists "anon write truck_owners" on truck_owners;
create policy "anon write truck_owners" on truck_owners
  for all to anon using (true) with check (true);

-- =========================================================================
-- 2. BACKFILL from the existing one-to-one links
-- =========================================================================

insert into truck_owners (user_id, truck_id)
select id, truck_id
from profiles
where truck_id is not null
  and role = 'truck_owner'
on conflict do nothing;

comment on column profiles.truck_id is
  'Informational only: the owner''s default / last-selected truck for the dashboard. Source of truth for ownership is the truck_owners table.';

-- =========================================================================
-- 3. my_truck_ids() + RLS POLICY REWRITE
-- =========================================================================

-- The set of truck ids the current user owns. SECURITY DEFINER so it reads
-- truck_owners regardless of that table's RLS; STABLE so the planner can
-- treat it like the old sub-select.
create or replace function my_truck_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select truck_id from truck_owners where user_id = auth.uid()
$$;

grant execute on function my_truck_ids() to anon, authenticated;

-- ---- trucks (from 0002) ----
drop policy if exists "owners update own truck" on trucks;
create policy "owners update own truck" on trucks
  for update to authenticated
  using (id in (select my_truck_ids()))
  with check (id in (select my_truck_ids()));

-- ---- truck_schedules (from 0002) ----
drop policy if exists "owners manage own schedules" on truck_schedules;
create policy "owners manage own schedules" on truck_schedules
  for all to authenticated
  using (truck_id in (select my_truck_ids()))
  with check (truck_id in (select my_truck_ids()));

-- ---- truck_photos (from 0002) ----
drop policy if exists "owners manage own photos" on truck_photos;
create policy "owners manage own photos" on truck_photos
  for all to authenticated
  using (truck_id in (select my_truck_ids()))
  with check (truck_id in (select my_truck_ids()));

-- ---- reviews (from 0006) ----
drop policy if exists "owners reply own reviews" on reviews;
create policy "owners reply own reviews" on reviews
  for update to authenticated
  using (truck_id in (select my_truck_ids()))
  with check (truck_id in (select my_truck_ids()));

-- ---- events (from 0011) ----
drop policy if exists "authenticated create events" on events;
create policy "authenticated create events" on events
  for insert to authenticated
  with check (created_by_truck_id in (select my_truck_ids()));

drop policy if exists "owners update own events" on events;
create policy "owners update own events" on events
  for update to authenticated
  using (created_by_truck_id in (select my_truck_ids()))
  with check (created_by_truck_id in (select my_truck_ids()));

drop policy if exists "owners delete own events" on events;
create policy "owners delete own events" on events
  for delete to authenticated
  using (created_by_truck_id in (select my_truck_ids()));

-- ---- event_trucks (from 0011 + 0012) ----
drop policy if exists "authenticated create own event_trucks" on event_trucks;
create policy "authenticated create own event_trucks" on event_trucks
  for insert to authenticated
  with check (truck_id in (select my_truck_ids()));

drop policy if exists "authenticated delete own event_trucks" on event_trucks;
create policy "authenticated delete own event_trucks" on event_trucks
  for delete to authenticated
  using (truck_id in (select my_truck_ids()));

drop policy if exists "trucks update own event link" on event_trucks;
create policy "trucks update own event link" on event_trucks
  for update to authenticated
  using (truck_id in (select my_truck_ids()))
  with check (truck_id in (select my_truck_ids()));

drop policy if exists "hosts invite trucks to own events" on event_trucks;
create policy "hosts invite trucks to own events" on event_trucks
  for insert to authenticated
  with check (
    event_id in (
      select e.id from events e
      where e.created_by_truck_id in (select my_truck_ids())
    )
  );

drop policy if exists "hosts remove trucks from own events" on event_trucks;
create policy "hosts remove trucks from own events" on event_trucks
  for delete to authenticated
  using (
    event_id in (
      select e.id from events e
      where e.created_by_truck_id in (select my_truck_ids())
    )
  );

-- ---- storage: an owner's own trucks' photos (from 0002) ----
drop policy if exists "owners upload own truck photos" on storage.objects;
create policy "owners upload own truck photos" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'truck-photos'
    and (storage.foldername(name))[1] in (
      select truck_id::text from truck_owners where user_id = auth.uid()
    )
  );

drop policy if exists "owners delete own truck photos" on storage.objects;
create policy "owners delete own truck photos" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'truck-photos'
    and (storage.foldername(name))[1] in (
      select truck_id::text from truck_owners where user_id = auth.uid()
    )
  );

-- =========================================================================
-- 4. OWNERSHIP RPCs
-- =========================================================================

-- ---- register_truck_owner(truck_name, display_name) ----
-- Claims an existing unclaimed truck by exact name, or creates a new one, then
-- links it to the caller. Now used BOTH for a brand-new owner signup AND for a
-- logged-in owner adding another truck from the dashboard, so the old
-- "this account is already linked to a truck" guard is gone.
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
      v_slug := v_slug || '-' || substr(gen_random_uuid()::text, 1, 6);
    end if;

    insert into trucks (slug, name, is_claimed, is_active, claim_status)
    values (v_slug, v_name, true, true, 'claimed')
    returning id into v_truck_id;
  else
    update trucks set is_claimed = true, claim_status = 'claimed' where id = v_truck_id;
  end if;

  insert into truck_owners (user_id, truck_id)
  values (v_uid, v_truck_id)
  on conflict do nothing;

  perform set_config('app.bypass_profile_guard', 'true', true);

  insert into profiles (id, role, truck_id, display_name)
  values (v_uid, 'truck_owner', v_truck_id, coalesce(nullif(trim(p_display_name), ''), v_name))
  on conflict (id) do update
    set role = 'truck_owner',
        -- keep an existing default truck; only fill it in if it was empty
        truck_id = coalesce(profiles.truck_id, excluded.truck_id),
        display_name = coalesce(profiles.display_name, excluded.display_name);

  return v_truck_id;
end;
$$;

grant execute on function register_truck_owner(text, text) to authenticated;

-- ---- claim_truck(slug) ----
-- Links the caller to an unclaimed truck and moves it to 'pending' for an admin
-- to verify. A logged-in owner can now claim ADDITIONAL trucks (the old
-- single-truck guard is gone) — the claim page attaches the truck to their
-- existing account instead of forcing a new one.
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

  insert into truck_owners (user_id, truck_id)
  values (v_uid, v_truck_id)
  on conflict do nothing;

  perform set_config('app.bypass_profile_guard', 'true', true);

  insert into profiles (id, role, truck_id, display_name)
  values (v_uid, 'truck_owner', v_truck_id, v_name)
  on conflict (id) do update
    set role = 'truck_owner',
        truck_id = coalesce(profiles.truck_id, excluded.truck_id);

  update trucks set claim_status = 'pending' where id = v_truck_id;

  return v_truck_id;
end;
$$;

grant execute on function claim_truck(text) to authenticated;

-- ---- admin_link_truck_owner(email, truck_id) ----
-- Adds ONE truck to an owner account without touching their other trucks. Still
-- frees the target truck from any previous owner.
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

  perform set_config('app.bypass_profile_guard', 'true', true);

  -- Free this truck from any previous owner (their other trucks are untouched).
  delete from truck_owners where truck_id = p_truck_id and user_id <> v_uid;

  insert into truck_owners (user_id, truck_id)
  values (v_uid, p_truck_id)
  on conflict do nothing;

  -- Re-point a previous owner's default truck if it was this one, and demote
  -- anyone left owning nothing.
  update profiles p
    set truck_id = (
      select o.truck_id from truck_owners o where o.user_id = p.id
      order by o.created_at limit 1
    )
    where p.truck_id = p_truck_id and p.id <> v_uid;

  update profiles p
    set role = 'customer', truck_id = null
    where p.id <> v_uid
      and p.role = 'truck_owner'
      and not exists (select 1 from truck_owners o where o.user_id = p.id);

  insert into profiles (id, role, truck_id, display_name)
  values (v_uid, 'truck_owner', p_truck_id, null)
  on conflict (id) do update
    set role = 'truck_owner',
        truck_id = coalesce(profiles.truck_id, excluded.truck_id);

  update trucks set claim_status = 'claimed', is_claimed = true where id = p_truck_id;
end;
$$;

grant execute on function admin_link_truck_owner(text, uuid) to service_role;

-- ---- admin_unlink_truck_owner(truck_id) ----
-- Detaches EVERY owner from this truck and resets it to 'unclaimed'. Used by the
-- admin "unassign owner" action on the Claims tab and when deleting a truck.
create or replace function admin_unlink_truck_owner(p_truck_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('app.bypass_profile_guard', 'true', true);

  delete from truck_owners where truck_id = p_truck_id;

  update profiles p
    set truck_id = (
      select o.truck_id from truck_owners o where o.user_id = p.id
      order by o.created_at limit 1
    )
    where p.truck_id = p_truck_id;

  update profiles p
    set role = 'customer', truck_id = null
    where p.role = 'truck_owner'
      and not exists (select 1 from truck_owners o where o.user_id = p.id);

  update trucks set claim_status = 'unclaimed', is_claimed = false where id = p_truck_id;
end;
$$;

grant execute on function admin_unlink_truck_owner(uuid) to service_role;

-- ---- admin_unlink_one_truck_owner(user_id, truck_id) ----
-- Unassigns a SINGLE truck from a SINGLE owner, leaving their other trucks and
-- any other owners of that truck untouched. Only resets the truck to
-- 'unclaimed' if nobody owns it afterwards.
create or replace function admin_unlink_one_truck_owner(p_user_id uuid, p_truck_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('app.bypass_profile_guard', 'true', true);

  delete from truck_owners where user_id = p_user_id and truck_id = p_truck_id;

  update profiles p
    set truck_id = (
      select o.truck_id from truck_owners o where o.user_id = p_user_id
      order by o.created_at limit 1
    )
    where p.id = p_user_id and p.truck_id = p_truck_id;

  update profiles p
    set role = 'customer', truck_id = null
    where p.id = p_user_id
      and p.role = 'truck_owner'
      and not exists (select 1 from truck_owners o where o.user_id = p_user_id);

  update trucks
    set claim_status = 'unclaimed', is_claimed = false
    where id = p_truck_id
      and not exists (select 1 from truck_owners o where o.truck_id = p_truck_id);
end;
$$;

grant execute on function admin_unlink_one_truck_owner(uuid, uuid) to service_role;
