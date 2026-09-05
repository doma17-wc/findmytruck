-- FindMyTruck: richer Events — posters, categories, truck collaborations, RSVPs.
-- Run this in the Supabase SQL editor AFTER 0011_events_and_flexible_schedule.sql.
--
-- This migration:
--   1. Adds `image_url` (poster / flyer / venue photo) and `event_type`
--      (festival / market / catering / street_food / opening / other) to events.
--   2. Adds a `status` to `event_trucks` ('invited' | 'confirmed' | 'declined')
--      so a host can invite other trucks who then confirm from their dashboard.
--      Every existing link is treated as 'confirmed' (unchanged behaviour), and
--      the host's own link is force-confirmed.
--   3. Adds `event_rsvps` (a logged-in customer marking "interested" / "going")
--      plus a public `event_rsvp_counts` view for the interest count.
--   4. Extends RLS: hosts can invite/remove trucks on their own events, invited
--      trucks can update their own link status, customers manage their own RSVPs,
--      and event posters can be uploaded to `truck-photos/events/**`.

-- =========================================
-- 1. EVENT POSTER + CATEGORY
-- =========================================

alter table events
  add column if not exists image_url text;

alter table events
  add column if not exists event_type text not null default 'other'
    check (event_type in ('festival', 'market', 'catering', 'street_food', 'opening', 'other'));

-- =========================================
-- 2. TRUCK COLLABORATIONS (invite + confirm)
-- =========================================

alter table event_trucks
  add column if not exists status text not null default 'confirmed'
    check (status in ('invited', 'confirmed', 'declined'));

alter table event_trucks
  add column if not exists invited_at timestamptz not null default now();

-- Existing rows keep the historical "just attending" meaning => confirmed
-- (already the column default, but be explicit for rows created mid-deploy).
update event_trucks set status = 'confirmed' where status is null;

-- The host truck is always confirmed on its own event.
update event_trucks et
set status = 'confirmed'
from events e
where e.id = et.event_id
  and e.created_by_truck_id is not null
  and e.created_by_truck_id = et.truck_id;

-- ---- event_trucks RLS: collaboration ----
-- Keep the existing "authenticated create own event_trucks" / "... delete own"
-- (a truck adding *itself*) and the "anon write" admin parity policy. Add the
-- host-driven invite/remove + the invited-truck status update.

drop policy if exists "hosts invite trucks to own events" on event_trucks;
create policy "hosts invite trucks to own events" on event_trucks
  for insert to authenticated
  with check (
    event_id in (
      select e.id from events e
      where e.created_by_truck_id in (select truck_id from profiles where id = auth.uid())
    )
  );

drop policy if exists "hosts remove trucks from own events" on event_trucks;
create policy "hosts remove trucks from own events" on event_trucks
  for delete to authenticated
  using (
    event_id in (
      select e.id from events e
      where e.created_by_truck_id in (select truck_id from profiles where id = auth.uid())
    )
  );

-- An invited truck (or the host) can update the link tied to their own truck —
-- used to accept / decline an invitation.
drop policy if exists "trucks update own event link" on event_trucks;
create policy "trucks update own event link" on event_trucks
  for update to authenticated
  using (truck_id in (select truck_id from profiles where id = auth.uid()))
  with check (truck_id in (select truck_id from profiles where id = auth.uid()));

-- =========================================
-- 3. CUSTOMER RSVP / "INTERESTED"
-- =========================================

create table if not exists event_rsvps (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'interested' check (status in ('interested', 'going')),
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);

create index if not exists idx_event_rsvps_event_id on event_rsvps(event_id);
create index if not exists idx_event_rsvps_user_id on event_rsvps(user_id);

alter table event_rsvps enable row level security;

-- A customer fully owns their own RSVP rows (read them back on their account,
-- toggle them on the events pages).
drop policy if exists "users manage own rsvps" on event_rsvps;
create policy "users manage own rsvps" on event_rsvps
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Public interest count, without exposing who RSVP'd. Like `public_trucks`,
-- this view is owned by the migration role and is read through by anon /
-- authenticated regardless of the base table's RLS.
create or replace view event_rsvp_counts as
select event_id, count(*)::int as interested_count
from event_rsvps
group by event_id;

grant select on event_rsvp_counts to anon, authenticated;

-- =========================================
-- 4. STORAGE: event posters
-- =========================================
-- All event images live under `truck-photos/events/<uuid>.<ext>`. Anon upload
-- (the /admin panel) is already covered by seed.sql's "anon upload truck
-- photos"; add an authenticated policy so a signed-in truck owner can upload a
-- poster for an event from their dashboard.

drop policy if exists "owners upload event images" on storage.objects;
create policy "owners upload event images" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'truck-photos'
    and (storage.foldername(name))[1] = 'events'
  );

drop policy if exists "owners delete event images" on storage.objects;
create policy "owners delete event images" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'truck-photos'
    and (storage.foldername(name))[1] = 'events'
  );
