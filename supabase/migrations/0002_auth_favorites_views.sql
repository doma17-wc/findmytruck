-- FindMyTruck: Supabase Auth, favorites, truck-owner dashboard, and page views.
-- Run this in the Supabase SQL editor AFTER supabase/seed.sql has already been applied.
--
-- This migration:
--   1. Adds `profiles` (customer / truck_owner accounts, linked to auth.users)
--   2. Adds `user_favorites` (customers favoriting trucks)
--   3. Adds `truck_page_views` (simple analytics counter for owner dashboards)
--   4. Tightens RLS on trucks/truck_schedules/truck_photos so a signed-in truck
--      owner can only write to the truck linked to their own profile, while the
--      existing app-layer-gated /admin panel (which always uses the anon key,
--      never a logged-in session) keeps working exactly as before.
--   5. Adds two SECURITY DEFINER RPC functions used by the app's signup flows:
--      register_truck_owner(...) and ensure_customer_profile(...).

create extension if not exists "pgcrypto";

-- =========================
-- TABLES
-- =========================

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'customer' check (role in ('customer', 'truck_owner')),
  truck_id uuid references trucks(id) on delete set null,
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists user_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  truck_id uuid not null references trucks(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, truck_id)
);

create table if not exists truck_page_views (
  id bigint generated always as identity primary key,
  truck_id uuid not null references trucks(id) on delete cascade,
  viewed_at timestamptz not null default now()
);

create index if not exists idx_user_favorites_user_id on user_favorites(user_id);
create index if not exists idx_user_favorites_truck_id on user_favorites(truck_id);
create index if not exists idx_truck_page_views_truck_id on truck_page_views(truck_id);
create index if not exists idx_truck_page_views_viewed_at on truck_page_views(viewed_at);
create index if not exists idx_profiles_truck_id on profiles(truck_id);

-- =========================
-- ROW LEVEL SECURITY: profiles / user_favorites / truck_page_views
-- =========================

alter table profiles enable row level security;
alter table user_favorites enable row level security;
alter table truck_page_views enable row level security;

-- Profiles: users can only ever see/update their OWN row. There is no INSERT
-- policy at all -- rows are only ever created via the SECURITY DEFINER
-- functions below, which run as the table owner and bypass RLS. This is what
-- stops a customer from writing role='truck_owner' + an arbitrary truck_id
-- straight into their own profile row.
drop policy if exists "users select own profile" on profiles;
create policy "users select own profile" on profiles
  for select to authenticated
  using (id = auth.uid());

drop policy if exists "users update own profile" on profiles;
create policy "users update own profile" on profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Belt-and-braces: even the UPDATE policy above only checks id = auth.uid(),
-- so without this trigger a user could still flip their OWN role/truck_id
-- via a direct client update. The trigger blocks that, except when the
-- SECURITY DEFINER functions below explicitly set a bypass flag.
create or replace function guard_profiles_update()
returns trigger
language plpgsql
as $$
begin
  if current_setting('app.bypass_profile_guard', true) = 'true' then
    return new;
  end if;
  if new.role is distinct from old.role or new.truck_id is distinct from old.truck_id then
    raise exception 'Cannot change role or truck_id directly';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_profiles_update on profiles;
create trigger trg_guard_profiles_update
before update on profiles
for each row execute function guard_profiles_update();

-- Favorites: fully private to the owning user.
drop policy if exists "users manage own favorites" on user_favorites;
create policy "users manage own favorites" on user_favorites
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Page views: not sensitive (just a counter), so anyone (including
-- anonymous visitors loading a truck profile) can log a view, and anyone can
-- read the aggregate -- the owner dashboard reads its own truck's rows.
drop policy if exists "anyone can log a page view" on truck_page_views;
create policy "anyone can log a page view" on truck_page_views
  for insert to anon, authenticated
  with check (true);

drop policy if exists "anyone can read page views" on truck_page_views;
create policy "anyone can read page views" on truck_page_views
  for select to anon, authenticated
  using (true);

-- =========================
-- TIGHTEN EXISTING RLS on trucks / truck_schedules / truck_photos
-- =========================
-- The original seed.sql created "anon write ..." policies with no `to`
-- clause, which in Postgres means they apply to PUBLIC -- i.e. every role,
-- including any signed-in `authenticated` user, not just the admin panel's
-- anon-key requests. We re-scope those existing policies to `anon` only
-- (so /admin, which never authenticates, is completely unaffected) and add
-- new, narrow `authenticated` policies so a signed-in truck owner can only
-- ever touch the single truck linked to their own profile.

drop policy if exists "anon write trucks" on trucks;
create policy "anon write trucks" on trucks
  for all to anon using (true) with check (true);

drop policy if exists "anon read trucks raw" on trucks;
create policy "anon read trucks raw" on trucks
  for select to anon, authenticated using (true);

drop policy if exists "owners update own truck" on trucks;
create policy "owners update own truck" on trucks
  for update to authenticated
  using (id in (select truck_id from profiles where id = auth.uid()))
  with check (id in (select truck_id from profiles where id = auth.uid()));

drop policy if exists "anon write schedules" on truck_schedules;
create policy "anon write schedules" on truck_schedules
  for all to anon using (true) with check (true);

drop policy if exists "public read schedules" on truck_schedules;
create policy "public read schedules" on truck_schedules
  for select to anon, authenticated using (true);

drop policy if exists "owners manage own schedules" on truck_schedules;
create policy "owners manage own schedules" on truck_schedules
  for all to authenticated
  using (truck_id in (select truck_id from profiles where id = auth.uid()))
  with check (truck_id in (select truck_id from profiles where id = auth.uid()));

drop policy if exists "anon write photos" on truck_photos;
create policy "anon write photos" on truck_photos
  for all to anon using (true) with check (true);

drop policy if exists "public read photos" on truck_photos;
create policy "public read photos" on truck_photos
  for select to anon, authenticated using (true);

drop policy if exists "owners manage own photos" on truck_photos;
create policy "owners manage own photos" on truck_photos
  for all to authenticated
  using (truck_id in (select truck_id from profiles where id = auth.uid()))
  with check (truck_id in (select truck_id from profiles where id = auth.uid()));

drop policy if exists "anon write qr" on qr_redirects;
create policy "anon write qr" on qr_redirects
  for all to anon using (true) with check (true);

-- =========================
-- Storage: truck owners can also upload/delete their own truck's photos
-- (admin's anon-key upload/delete policies from seed.sql already cover the
-- /admin panel and are left untouched).
-- =========================
drop policy if exists "owners upload own truck photos" on storage.objects;
create policy "owners upload own truck photos" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'truck-photos'
    and (storage.foldername(name))[1] in (select truck_id::text from profiles where id = auth.uid())
  );

drop policy if exists "owners delete own truck photos" on storage.objects;
create policy "owners delete own truck photos" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'truck-photos'
    and (storage.foldername(name))[1] in (select truck_id::text from profiles where id = auth.uid())
  );

-- =========================
-- RPC: ensure_customer_profile
-- Called right after a customer signs up. Creates a 'customer' profile row
-- for the current session's user if one doesn't already exist.
-- =========================
create or replace function ensure_customer_profile(p_display_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  insert into profiles (id, role, display_name)
  values (v_uid, 'customer', nullif(trim(p_display_name), ''))
  on conflict (id) do nothing;
end;
$$;

grant execute on function ensure_customer_profile(text) to authenticated;

-- =========================
-- RPC: register_truck_owner
-- Called right after a truck owner signs up. Either claims an existing,
-- unclaimed truck whose name matches (case-insensitive), or creates a new
-- one, then links it to the caller's profile as role='truck_owner'.
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
  where lower(name) = lower(v_name) and is_claimed = false
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

    insert into trucks (slug, name, is_claimed, is_active)
    values (v_slug, v_name, true, true)
    returning id into v_truck_id;
  else
    update trucks set is_claimed = true where id = v_truck_id;
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
