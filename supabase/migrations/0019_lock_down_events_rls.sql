-- FindMyTruck: lock down direct anon writes to `events` / `event_trucks`.
--
-- Same class of issue fixed for `trucks` in 0018_lock_down_trucks_rls.sql:
-- "anon write events" / "anon write event_trucks" (ALL, role anon, using
-- true, check true) let anyone unauthenticated insert/update/delete any
-- event or truck-event link via the Supabase REST endpoint.
--
-- This migration removes both. Nothing else needs to change:
--   - Public reads keep going through "public read events" / "public read
--     event_trucks" (untouched, still `using (true)` for anon+authenticated).
--   - The truck-owner dashboard's own-event writes already go through the
--     separate, correctly-scoped "authenticated ..." / "owners ..." / "hosts
--     ..." policies (untouched) -- unaffected either way.
--   - The admin panel's event actions (src/app/admin/actions.ts) and the
--     one-off scripts/import-events.mjs, which DID rely on "anon write
--     events" via the anon key, have been migrated to the service-role key
--     in the same change that ships this migration -- they no longer need
--     any RLS grant on `events` / `event_trucks` at all.
--
-- SAFE TO RE-RUN: drop-if-exists.

drop policy if exists "anon write events" on events;
drop policy if exists "anon write event_trucks" on event_trucks;
