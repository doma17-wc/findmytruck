-- FindMyTruck: self-service account management.
-- Run this in the Supabase SQL editor AFTER 0014_multi_truck_per_account.sql.
--
-- This migration is small — most of the account-management feature (change
-- password, owner pause via trucks.paused, permanent account deletion via the
-- service-role key) needs no schema change. The only new piece of state is a
-- customer "pause / deactivate" flag:
--
--   1. profiles.deactivated — a reversible customer switch. While on, the
--      account is excluded from the "a truck you follow is live" fan-out
--      (in-app notifications AND e-mail). Follows, reviews and RSVPs are kept
--      untouched; the customer flips it back on any time.
--   2. notify_followers_truck_live(...) — re-created (same body as 0013) with
--      both the in-app insert and the e-mail result filtered to
--      coalesce(deactivated, false) = false.
--
-- SAFE TO RE-RUN: add column if not exists + create or replace.

-- =========================================================================
-- 1. profiles.deactivated
-- =========================================================================

alter table profiles
  add column if not exists deactivated boolean not null default false;

-- The guard trigger from 0002 only blocks role / truck_id changes, so a user
-- updating their own `deactivated` via "users update own profile" is allowed.

-- =========================================================================
-- 2. notify_followers_truck_live — skip deactivated followers
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

  -- In-app notification for every follower who hasn't paused their account.
  -- LEFT JOIN so a follower with no profiles row is still notified (unchanged
  -- from 0013 — only an explicit deactivated = true suppresses it).
  insert into notifications (user_id, type, truck_id, message, link)
  select f.user_id, 'truck_live', p_truck_id, p_message, p_link
  from user_favorites f
  left join profiles p on p.id = f.user_id
  where f.truck_id = p_truck_id
    and coalesce(p.deactivated, false) = false;
  get diagnostics v_count = row_count;

  update truck_live_notifications
  set notified_count = v_count
  where truck_id = p_truck_id and date = current_date;

  -- E-mail recipients: followers who kept the opt-in on, aren't paused, and
  -- have an address.
  return query
  select u.email::text, p.notify_token
  from user_favorites f
  join profiles p on p.id = f.user_id
  join auth.users u on u.id = f.user_id
  where f.truck_id = p_truck_id
    and coalesce(p.notify_follow_live, true) = true
    and coalesce(p.deactivated, false) = false
    and u.email is not null;
end;
$$;

grant execute on function notify_followers_truck_live(uuid, text, text) to authenticated;
