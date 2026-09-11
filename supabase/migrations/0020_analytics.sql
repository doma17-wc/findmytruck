-- FindMyTruck: richer analytics layer for owners, admin, and aggregate
-- customer behaviour. Builds on truck_page_views (0002) and truck_impressions
-- (0010) rather than replacing them.
--
-- This migration:
--   1. Adds a `source` column to truck_page_views ('map' | 'list' | 'profile'
--      | 'qr') so owners can see where their profile opens come from.
--   2. Adds `truck_content_views`, a daily counter (same shape as
--      truck_impressions) for which menu items / photos get looked at.
--   3. Adds `site_visits`, a daily platform-wide counter of browser sessions
--      -- no identifiers, purely an aggregate count, for admin traffic trends.
--   4. Adds `cuisine_search_events`, a daily counter of cuisine-filter usage,
--      for admin's "most-searched cuisines".
--   5. Adds `owner_activity`, one row per truck-owner account, tracking
--      dashboard last-seen/visit counts so admin can see active vs dormant
--      trucks. Written only via a SECURITY DEFINER RPC keyed off auth.uid().
--
-- All counters are aggregate (truck-level or platform-level), never
-- per-person, consistent with the existing impressions/page-views design.
-- SAFE TO RE-RUN: create-if-not-exists / drop-then-create policies.

-- =========================
-- 1. truck_page_views.source
-- =========================

alter table truck_page_views add column if not exists source text
  check (source in ('map', 'list', 'profile', 'qr'));

-- =========================
-- 2. TABLE: truck_content_views
-- =========================

create table if not exists truck_content_views (
  truck_id uuid not null references trucks(id) on delete cascade,
  content_type text not null check (content_type in ('menu_item', 'photo')),
  content_key text not null,
  date date not null default current_date,
  count integer not null default 0,
  primary key (truck_id, content_type, content_key, date)
);

create index if not exists idx_truck_content_views_truck_id on truck_content_views(truck_id);

alter table truck_content_views enable row level security;

drop policy if exists "anyone can read content views" on truck_content_views;
create policy "anyone can read content views" on truck_content_views
  for select to anon, authenticated
  using (true);

create or replace function increment_truck_content_view(
  p_truck_id uuid,
  p_content_type text,
  p_content_key text
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into truck_content_views (truck_id, content_type, content_key, date, count)
  select id, p_content_type, left(p_content_key, 200), current_date, 1
  from trucks
  where id = p_truck_id and p_content_type in ('menu_item', 'photo')
  on conflict (truck_id, content_type, content_key, date) do update
    set count = truck_content_views.count + 1;
$$;

grant execute on function increment_truck_content_view(uuid, text, text) to anon, authenticated;

-- =========================
-- 3. TABLE: site_visits (platform-wide, no identifiers)
-- =========================

create table if not exists site_visits (
  date date primary key,
  visit_count integer not null default 0
);

alter table site_visits enable row level security;

drop policy if exists "anyone can read site visits" on site_visits;
create policy "anyone can read site visits" on site_visits
  for select to anon, authenticated
  using (true);

create or replace function record_site_visit()
returns void
language sql
security definer
set search_path = public
as $$
  insert into site_visits (date, visit_count)
  values (current_date, 1)
  on conflict (date) do update
    set visit_count = site_visits.visit_count + 1;
$$;

grant execute on function record_site_visit() to anon, authenticated;

-- =========================
-- 4. TABLE: cuisine_search_events
-- =========================

create table if not exists cuisine_search_events (
  cuisine text not null,
  date date not null default current_date,
  count integer not null default 0,
  primary key (cuisine, date)
);

alter table cuisine_search_events enable row level security;

drop policy if exists "anyone can read cuisine search events" on cuisine_search_events;
create policy "anyone can read cuisine search events" on cuisine_search_events
  for select to anon, authenticated
  using (true);

create or replace function increment_cuisine_search(p_cuisine text)
returns void
language sql
security definer
set search_path = public
as $$
  insert into cuisine_search_events (cuisine, date, count)
  values (lower(trim(left(p_cuisine, 60))), current_date, 1)
  on conflict (cuisine, date) do update
    set count = cuisine_search_events.count + 1;
$$;

grant execute on function increment_cuisine_search(text) to anon, authenticated;

-- =========================
-- 5. TABLE: owner_activity (dashboard engagement, for admin)
-- =========================

create table if not exists owner_activity (
  user_id uuid primary key references auth.users(id) on delete cascade,
  truck_id uuid references trucks(id) on delete set null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  last_seen_date date not null default current_date,
  active_days_count integer not null default 1,
  visit_count integer not null default 1
);

create index if not exists idx_owner_activity_truck_id on owner_activity(truck_id);

alter table owner_activity enable row level security;

-- Owners can see their own engagement row; admin reads everything via the
-- service-role key (bypasses RLS), same pattern as `profiles` / `users`.
drop policy if exists "owners select own activity" on owner_activity;
create policy "owners select own activity" on owner_activity
  for select to authenticated
  using (user_id = auth.uid());

-- No INSERT/UPDATE policy -- all writes go through the SECURITY DEFINER RPC
-- below, keyed off auth.uid(), so an owner can never touch another's row.
create or replace function record_owner_activity(p_truck_id uuid default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return;
  end if;

  insert into owner_activity (user_id, truck_id, first_seen_at, last_seen_at, last_seen_date, active_days_count, visit_count)
  values (v_uid, p_truck_id, now(), now(), current_date, 1, 1)
  on conflict (user_id) do update
    set truck_id = coalesce(p_truck_id, owner_activity.truck_id),
        last_seen_at = now(),
        visit_count = owner_activity.visit_count + 1,
        active_days_count = owner_activity.active_days_count
          + case when owner_activity.last_seen_date <> current_date then 1 else 0 end,
        last_seen_date = current_date;
end;
$$;

grant execute on function record_owner_activity(uuid) to authenticated;
