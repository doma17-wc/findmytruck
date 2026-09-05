-- FindMyTruck: customer-written reviews + a follow/notification system.
-- Run this in the Supabase SQL editor AFTER 0012_richer_events.sql.
--
-- This migration:
--   1. app_settings  — a key/value table for platform toggles the /admin panel
--      flips at runtime. Seeds `reviews_require_login = false`.
--   2. reviews        — adds `photo_url` (dish photo) + a helpful index. The
--      existing `user_id` column IS the nullable "author_id" from the spec.
--      Adds an anon INSERT path so logged-out visitors can leave a review when
--      `reviews_require_login` is off (still gated + de-duped in the server
--      action). Owners keep their existing reply-only UPDATE policy.
--   3. profiles       — `notify_follow_live` (per-account opt-in, default true)
--      and `notify_token` (opaque token for one-click email unsubscribe).
--   4. notifications  — in-app notification feed (bell icon). User reads/updates
--      their own rows; inserts only ever happen through the SECURITY DEFINER
--      fan-out RPC below.
--   5. truck_live_notifications — a per-(truck, day) ledger so followers are
--      notified at most once per truck per day when it goes live (boost).
--   6. notify_followers_truck_live(...) — SECURITY DEFINER fan-out called from
--      the dashboard boost action: writes one in-app notification per follower,
--      records the ledger row, and returns the e-mail + unsubscribe token of
--      every follower who opted into e-mail so the action can send via Resend.
--   7. unsubscribe_follow_notifications(token) — one-click unsubscribe RPC used
--      by the link in every notification e-mail (no login required).
--   8. storage — explicit policy for review dish photos under
--      `truck-photos/reviews/**`.

create extension if not exists "pgcrypto";

-- =========================================================================
-- 1. PLATFORM SETTINGS  (app_settings)
-- =========================================================================

create table if not exists app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

insert into app_settings (key, value)
values ('reviews_require_login', 'false'::jsonb)
on conflict (key) do nothing;

alter table app_settings enable row level security;

-- The public review form reads this to decide whether to show a name field or
-- require sign-in, so anon needs SELECT.
drop policy if exists "public read app_settings" on app_settings;
create policy "public read app_settings" on app_settings
  for select to anon, authenticated using (true);

-- Anon write parity for the password-gated /admin panel (same pattern as
-- "anon write trucks" / "anon write reviews" — /admin always uses the anon key
-- and is gated at the application layer by ADMIN_PASSWORD).
drop policy if exists "anon write app_settings" on app_settings;
create policy "anon write app_settings" on app_settings
  for all to anon using (true) with check (true);

-- =========================================================================
-- 2. REVIEWS  (customer-written side)
-- =========================================================================

alter table reviews add column if not exists photo_url text;

create index if not exists idx_reviews_truck_created
  on reviews (truck_id, created_at desc);

-- Logged-out visitors can leave a review when `reviews_require_login` is off.
-- The server action still enforces the toggle, the honeypot, a light rate
-- limit, and one-review-per-person-per-truck-per-day before this ever runs.
-- (An "anon write reviews" FOR ALL policy already exists from 0006 for /admin
-- parity; this named policy documents the customer path explicitly.)
drop policy if exists "anon leave a review" on reviews;
create policy "anon leave a review" on reviews
  for insert to anon
  with check (user_id is null);

-- =========================================================================
-- 3. PROFILES  (notification preferences)
-- =========================================================================

alter table profiles
  add column if not exists notify_follow_live boolean not null default true;

alter table profiles
  add column if not exists notify_token uuid not null default gen_random_uuid();

create unique index if not exists idx_profiles_notify_token on profiles (notify_token);

-- The guard trigger from 0002 only blocks role / truck_id changes, so a user
-- updating their own notify_follow_live via "users update own profile" is fine.

-- =========================================================================
-- 4. NOTIFICATIONS  (in-app bell feed)
-- =========================================================================

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  truck_id uuid references trucks(id) on delete cascade,
  message text not null,
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user_created
  on notifications (user_id, created_at desc);
create index if not exists idx_notifications_user_unread
  on notifications (user_id) where read = false;

alter table notifications enable row level security;

-- A user fully owns their own feed: read it, and mark rows read. There is NO
-- insert policy — every insert goes through notify_followers_truck_live()
-- (SECURITY DEFINER), which bypasses RLS.
drop policy if exists "users read own notifications" on notifications;
create policy "users read own notifications" on notifications
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "users update own notifications" on notifications;
create policy "users update own notifications" on notifications
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- =========================================================================
-- 5. PER-(TRUCK, DAY) NOTIFY LEDGER
-- =========================================================================

create table if not exists truck_live_notifications (
  truck_id uuid not null references trucks(id) on delete cascade,
  date date not null default current_date,
  notified_count int not null default 0,
  created_at timestamptz not null default now(),
  primary key (truck_id, date)
);

alter table truck_live_notifications enable row level security;
-- No policies: only the SECURITY DEFINER fan-out touches this table.

-- =========================================================================
-- 6. FAN-OUT: notify_followers_truck_live(truck_id, message, link)
-- Called from the dashboard boost server action. Idempotent per truck per day
-- via the ledger insert below. Returns the followers to e-mail (opted-in only).
-- =========================================================================

create or replace function notify_followers_truck_live(
  p_truck_id uuid,
  p_message text,
  p_link text
)
returns table (email text, token uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new int;
  v_count int;
begin
  -- Claim today's slot for this truck. If the row already exists we've already
  -- notified this truck's followers today — emit nothing.
  insert into truck_live_notifications (truck_id, date)
  values (p_truck_id, current_date)
  on conflict (truck_id, date) do nothing;
  get diagnostics v_new = row_count;
  if v_new = 0 then
    return;
  end if;

  -- In-app notification for every follower.
  insert into notifications (user_id, type, truck_id, message, link)
  select f.user_id, 'truck_live', p_truck_id, p_message, p_link
  from user_favorites f
  where f.truck_id = p_truck_id;
  get diagnostics v_count = row_count;

  update truck_live_notifications
  set notified_count = v_count
  where truck_id = p_truck_id and date = current_date;

  -- E-mail recipients: followers who kept the opt-in on and have an address.
  return query
  select u.email::text, p.notify_token
  from user_favorites f
  join profiles p on p.id = f.user_id
  join auth.users u on u.id = f.user_id
  where f.truck_id = p_truck_id
    and coalesce(p.notify_follow_live, true) = true
    and u.email is not null;
end;
$$;

grant execute on function notify_followers_truck_live(uuid, text, text) to authenticated;

-- =========================================================================
-- 7. ONE-CLICK UNSUBSCRIBE (used by the link in notification e-mails)
-- =========================================================================

create or replace function unsubscribe_follow_notifications(p_token uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  perform set_config('app.bypass_profile_guard', 'true', true);
  update profiles set notify_follow_live = false where notify_token = p_token;
  get diagnostics v_count = row_count;
  return v_count > 0;
end;
$$;

grant execute on function unsubscribe_follow_notifications(uuid) to anon, authenticated;

-- =========================================================================
-- 8. STORAGE: review dish photos  (truck-photos/reviews/**)
-- =========================================================================

drop policy if exists "anyone upload review images" on storage.objects;
create policy "anyone upload review images" on storage.objects
  for insert to anon, authenticated
  with check (
    bucket_id = 'truck-photos'
    and (storage.foldername(name))[1] = 'reviews'
  );
