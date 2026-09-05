-- FindMyTruck: flexible weekly-schedule frequency + a full Events system.
-- Run this in the Supabase SQL editor AFTER 0010_truck_impressions.sql.
--
-- This migration:
--   1. Adds a `frequency` dimension to each truck_schedules day, so a stop can
--      repeat every week (default, unchanged), on alternating (even/odd ISO)
--      weeks, or on specific occurrences of that weekday in the month
--      (1st/2nd/3rd/4th).
--   2. Adds `events` (one-off dated appearances -- festivals, markets, private
--      events) and `event_trucks` (many-to-many: a truck can attend many
--      events, an event can have many trucks).
--   3. Wires RLS on both new tables following the exact pattern already used
--      for `reviews` (see 0006_reviews_and_dashboard.sql): public read,
--      authenticated truck owners can manage rows tied to their own truck via
--      `profiles.truck_id`, and an unrestricted `anon` policy since /admin
--      runs on the shared anon client, gated at the app layer.

-- =========================================
-- 1. FLEXIBLE WEEKLY SCHEDULE FREQUENCY
-- =========================================

alter table truck_schedules
  add column if not exists frequency text not null default 'weekly'
    check (frequency in ('weekly', 'alternate', 'monthly_weeks'));

-- Used only when frequency = 'alternate': which ISO-week parity this stop runs on.
alter table truck_schedules
  add column if not exists frequency_parity text
    check (frequency_parity in ('even', 'odd'));

-- Used only when frequency = 'monthly_weeks': which occurrence(s) of that
-- weekday in the month this stop runs on, e.g. {1,3} = 1st and 3rd Friday.
alter table truck_schedules
  add column if not exists frequency_weeks smallint[];

-- =========================================
-- 2. EVENTS
-- =========================================

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  start_date date not null,
  end_date date not null,
  start_time time,
  end_time time,
  location_name text not null,
  location_lat double precision not null,
  location_lng double precision not null,
  link text,
  -- The truck that owns this event for permission purposes. Null for
  -- admin-created general events (e.g. a street food festival) with no single
  -- owning truck -- those are managed entirely from /admin.
  created_by_truck_id uuid references trucks(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_events_start_date on events(start_date);
create index if not exists idx_events_end_date on events(end_date);

create table if not exists event_trucks (
  event_id uuid not null references events(id) on delete cascade,
  truck_id uuid not null references trucks(id) on delete cascade,
  primary key (event_id, truck_id)
);

create index if not exists idx_event_trucks_truck_id on event_trucks(truck_id);

alter table events enable row level security;
alter table event_trucks enable row level security;

-- ---- events RLS ----

drop policy if exists "public read events" on events;
create policy "public read events" on events
  for select to anon, authenticated using (true);

drop policy if exists "authenticated create events" on events;
create policy "authenticated create events" on events
  for insert to authenticated
  with check (created_by_truck_id in (select truck_id from profiles where id = auth.uid()));

drop policy if exists "owners update own events" on events;
create policy "owners update own events" on events
  for update to authenticated
  using (created_by_truck_id in (select truck_id from profiles where id = auth.uid()))
  with check (created_by_truck_id in (select truck_id from profiles where id = auth.uid()));

drop policy if exists "owners delete own events" on events;
create policy "owners delete own events" on events
  for delete to authenticated
  using (created_by_truck_id in (select truck_id from profiles where id = auth.uid()));

-- Anon parity for the app-layer-gated /admin panel (matches reviews/schedules).
drop policy if exists "anon write events" on events;
create policy "anon write events" on events
  for all to anon using (true) with check (true);

-- ---- event_trucks RLS ----

drop policy if exists "public read event_trucks" on event_trucks;
create policy "public read event_trucks" on event_trucks
  for select to anon, authenticated using (true);

drop policy if exists "authenticated create own event_trucks" on event_trucks;
create policy "authenticated create own event_trucks" on event_trucks
  for insert to authenticated
  with check (truck_id in (select truck_id from profiles where id = auth.uid()));

drop policy if exists "authenticated delete own event_trucks" on event_trucks;
create policy "authenticated delete own event_trucks" on event_trucks
  for delete to authenticated
  using (truck_id in (select truck_id from profiles where id = auth.uid()));

drop policy if exists "anon write event_trucks" on event_trucks;
create policy "anon write event_trucks" on event_trucks
  for all to anon using (true) with check (true);
