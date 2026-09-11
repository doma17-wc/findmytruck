-- Applied to production (project jyulmnacskhmvnvqpfyu) via Supabase MCP on
-- 2026-09-11. Sections 1, 2 and 4 below were applied and live-verified
-- (anon insert/update/delete denied as expected, legitimate flows
-- unaffected -- see the audit report for the full verification transcript).
--
-- Section 3 (storage) was intentionally NOT applied: re-verification against
-- live code found "anon upload/delete truck photos" are load-bearing for
-- /admin's photo gallery (AdminPhotoGallery.tsx) and event-image management
-- (EventImageDropzone.tsx used from AdminEventsTab/EventsManager), which
-- write via the plain anon client since /admin has no Supabase Auth session
-- at all (it's the separate password-cookie system). Dropping these today
-- would break admin photo/event-image management for all 18 live trucks.
-- Needs a real fix first: move those storage writes into an admin server
-- action backed by the service-role client (same pattern as 0018/0019),
-- THEN drop the policies. Left open, flagged for prioritization.
--
-- Section 5 (indexes) was dropped entirely: live-checked pg_indexes and
-- found truck_schedules.truck_id and truck_photos.truck_id already have
-- dedicated indexes, and event_trucks.event_id is already covered by the
-- composite primary key (event_id, truck_id) via the leftmost-prefix rule.
-- No index migration was needed.

-- =========================================================================
-- 1. Close the truck-ownership hijack hole. [APPLIED]
--    "anon write truck_owners" (0014) was `for all to anon using(true) with
--    check(true)` — no auth.uid() tie at all. Any request carrying only the
--    public anon key could INSERT {user_id: <attacker>, truck_id: <any live
--    truck>} directly via the REST API and take over that truck's dashboard.
--    Verified dead: every real write to truck_owners goes through the
--    SECURITY DEFINER RPCs (admin_link_truck_owner / register_truck_owner /
--    admin_unlink_*) or the service-role client — never the anon client.
-- =========================================================================
drop policy if exists "anon write truck_owners" on truck_owners;

-- =========================================================================
-- 2. Close the reviews vandalism hole. [APPLIED]
--    "anon write reviews" (0006) was `for all to anon using(true) with
--    check(true)` — full insert/update/DELETE on every review by anyone with
--    the public anon key, not just the intended "anonymous visitor can leave
--    a review" case. Verified dead: the legitimate anonymous-review-insert
--    path is covered by the separate, narrower "anon leave a review" policy
--    (0013, insert-only, user_id is null), which this drop does not touch.
-- =========================================================================
drop policy if exists "anon write reviews" on reviews;

-- =========================================================================
-- 4. notify_followers_truck_live: add the ownership check it was missing. [APPLIED]
--    This SECURITY DEFINER function was granted to `authenticated` with no
--    check that the caller owns p_truck_id. The app only calls it from
--    boostAction() after requireOwnedTruckId(), but any signed-in customer
--    account could call the RPC directly (once per truck per day, per the
--    idempotency ledger) and push an attacker-controlled message/link into
--    every follower's notification feed + inbox for ANY truck. Same body as
--    0015, with an ownership check added at the top (same pattern as
--    record_owner_activity / record_owner_content_update in 0022).
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
  v_uid uuid := auth.uid();
begin
  if v_uid is null or not exists (
    select 1 from truck_owners where user_id = v_uid and truck_id = p_truck_id
  ) then
    raise exception 'not authorized for this truck';
  end if;

  insert into truck_live_notifications (truck_id, date)
  values (p_truck_id, current_date)
  on conflict (truck_id, date) do nothing;
  get diagnostics v_new = row_count;
  if v_new = 0 then
    return;
  end if;

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
