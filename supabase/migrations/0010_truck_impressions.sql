-- FindMyTruck: truck impressions analytics layer.
-- Run this in the Supabase SQL editor AFTER 0009_photo_gallery_cleanup.sql.
--
-- This migration:
--   1. Adds `truck_impressions`, a lightweight DAILY COUNTER per truck (NOT one
--      row per impression -- impressions are high volume, so every card that
--      scrolls into view increments a single (truck_id, date) row instead of
--      inserting a new row).
--   2. Adds `increment_truck_impression`, overloaded for a single truck id (as
--      requested) and for a uuid[] batch (so the client can accumulate
--      impressions and flush them in one request). Both are SECURITY DEFINER
--      so they can safely be called by anon -- the anon key can never read or
--      write truck_impressions directly, only through these functions.
--
-- Distinct from `truck_page_views` (0002_auth_favorites_views.sql), which
-- records a real profile open. Impressions are raw visibility; page views are
-- actual interest.

-- =========================
-- 1. TABLE: truck_impressions
-- =========================

create table if not exists truck_impressions (
  truck_id uuid not null references trucks(id) on delete cascade,
  date date not null default current_date,
  count integer not null default 0,
  primary key (truck_id, date)
);

create index if not exists idx_truck_impressions_truck_id on truck_impressions(truck_id);
create index if not exists idx_truck_impressions_date on truck_impressions(date);

alter table truck_impressions enable row level security;

-- Not sensitive (just a counter) -- anyone can read the aggregate, same as
-- truck_page_views. There is deliberately NO insert/update policy: all writes
-- go through the SECURITY DEFINER functions below, which bypass RLS entirely.
drop policy if exists "anyone can read impressions" on truck_impressions;
create policy "anyone can read impressions" on truck_impressions
  for select to anon, authenticated
  using (true);

-- =========================
-- 2. RPC: increment_truck_impression(uuid) -- single truck
-- =========================

create or replace function increment_truck_impression(p_truck_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  insert into truck_impressions (truck_id, date, count)
  select id, current_date, 1 from trucks where id = p_truck_id
  on conflict (truck_id, date) do update
    set count = truck_impressions.count + 1;
$$;

grant execute on function increment_truck_impression(uuid) to anon, authenticated;

-- =========================
-- 3. RPC: increment_truck_impression(uuid[]) -- batch
-- Same name, overloaded on argument type. Lets the client accumulate the
-- truck cards that scrolled into view over a short interval (or until the
-- page unloads) and flush them all in a single request instead of one
-- request per card.
-- =========================

create or replace function increment_truck_impression(p_truck_ids uuid[])
returns void
language sql
security definer
set search_path = public
as $$
  insert into truck_impressions (truck_id, date, count)
  select u.truck_id, current_date, count(*)
  from unnest(p_truck_ids) as u(truck_id)
  join trucks t on t.id = u.truck_id
  group by u.truck_id
  on conflict (truck_id, date) do update
    set count = truck_impressions.count + excluded.count;
$$;

grant execute on function increment_truck_impression(uuid[]) to anon, authenticated;
