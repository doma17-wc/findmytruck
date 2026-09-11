-- FindMyTruck: extends owner_activity (0020) to track engagement PER TRUCK,
-- not just per owner account, and adds a lightweight "last content update"
-- timestamp so both admin and the owner's own dashboard can show accurate,
-- per-truck engagement.
--
-- Why: owner_activity was keyed only on user_id, so a multi-truck owner
-- switching between trucks overwrote the same row -- only their most
-- recently viewed truck ever showed a last-seen date, and the other truck(s)
-- they manage looked permanently dormant even if actively used.
--
-- This migration:
--   1. Re-keys owner_activity on (user_id, truck_id) so each truck an owner
--      manages gets its own visit_count / last_seen_at row.
--   2. Adds `last_content_update_at` -- set whenever the owner saves their
--      profile, menu, or schedule (separate from just opening the dashboard).
--   3. Adds `owner_activity_daily`, a date-bucketed counter (same shape as
--      the other daily counters in this codebase) so "visits in the last 30
--      days" can be computed without inflating the lifetime `visit_count`.
--   4. Rewrites `record_owner_activity` to write both, scoped to a truck the
--      caller actually owns, and adds `record_owner_content_update`.
--
-- SAFE TO RE-RUN: create-if-not-exists / drop-then-create policies, and the
-- PK/backfill steps are guarded to no-op if already applied.

-- =========================================================================
-- 1. RE-KEY owner_activity ON (user_id, truck_id)
-- =========================================================================

-- Backfill any legacy no-truck row (shouldn't exist in practice -- the app
-- always passes a truck id -- but keeps the NOT NULL + PK change safe).
update owner_activity oa
  set truck_id = (
    select o.truck_id from truck_owners o where o.user_id = oa.user_id order by o.created_at limit 1
  )
  where oa.truck_id is null;

delete from owner_activity where truck_id is null;

alter table owner_activity add column if not exists last_content_update_at timestamptz;

do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'owner_activity_pkey' and conrelid = 'owner_activity'::regclass
  ) then
    alter table owner_activity drop constraint owner_activity_pkey;
  end if;
end $$;

alter table owner_activity alter column truck_id set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'owner_activity_pkey' and conrelid = 'owner_activity'::regclass
  ) then
    alter table owner_activity add constraint owner_activity_pkey primary key (user_id, truck_id);
  end if;
end $$;

create index if not exists idx_owner_activity_truck_id on owner_activity(truck_id);

-- =========================================================================
-- 2. TABLE: owner_activity_daily (dashboard opens, bucketed by day)
-- =========================================================================

create table if not exists owner_activity_daily (
  user_id uuid not null references auth.users(id) on delete cascade,
  truck_id uuid not null references trucks(id) on delete cascade,
  date date not null default current_date,
  count integer not null default 0,
  primary key (user_id, truck_id, date)
);

create index if not exists idx_owner_activity_daily_truck_id on owner_activity_daily(truck_id);
create index if not exists idx_owner_activity_daily_user_id on owner_activity_daily(user_id);

alter table owner_activity_daily enable row level security;

-- Same pattern as owner_activity: owners see only their own rows, admin
-- reads everything via the service-role key. No write policy -- all writes
-- go through the SECURITY DEFINER RPC below.
drop policy if exists "owners select own daily activity" on owner_activity_daily;
create policy "owners select own daily activity" on owner_activity_daily
  for select to authenticated
  using (user_id = auth.uid());

-- =========================================================================
-- 3. RPCs
-- =========================================================================

-- Records one dashboard open for (caller, p_truck_id). Scoped to a truck the
-- caller actually owns (defence in depth -- the dashboard only ever passes a
-- truck already RLS-scoped to them). Never records admin activity: the admin
-- panel is a separate password-gated cookie session, not a Supabase auth
-- user, so it never reaches this RPC.
create or replace function record_owner_activity(p_truck_id uuid default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null or p_truck_id is null then
    return;
  end if;
  if not exists (select 1 from truck_owners where user_id = v_uid and truck_id = p_truck_id) then
    return;
  end if;

  insert into owner_activity (user_id, truck_id, first_seen_at, last_seen_at, last_seen_date, active_days_count, visit_count)
  values (v_uid, p_truck_id, now(), now(), current_date, 1, 1)
  on conflict (user_id, truck_id) do update
    set last_seen_at = now(),
        visit_count = owner_activity.visit_count + 1,
        active_days_count = owner_activity.active_days_count
          + case when owner_activity.last_seen_date <> current_date then 1 else 0 end,
        last_seen_date = current_date;

  insert into owner_activity_daily (user_id, truck_id, date, count)
  values (v_uid, p_truck_id, current_date, 1)
  on conflict (user_id, truck_id, date) do update
    set count = owner_activity_daily.count + 1;
end;
$$;

grant execute on function record_owner_activity(uuid) to authenticated;

-- Records "the owner just saved their profile / menu / schedule" for
-- (caller, p_truck_id) -- a lighter touch-point than a full dashboard visit,
-- used for the owner's own "keep it fresh" nudge and admin's engagement view.
create or replace function record_owner_content_update(p_truck_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null or p_truck_id is null then
    return;
  end if;
  if not exists (select 1 from truck_owners where user_id = v_uid and truck_id = p_truck_id) then
    return;
  end if;

  insert into owner_activity (user_id, truck_id, first_seen_at, last_seen_at, last_seen_date, active_days_count, visit_count, last_content_update_at)
  values (v_uid, p_truck_id, now(), now(), current_date, 1, 1, now())
  on conflict (user_id, truck_id) do update
    set last_content_update_at = now();
end;
$$;

grant execute on function record_owner_content_update(uuid) to authenticated;
