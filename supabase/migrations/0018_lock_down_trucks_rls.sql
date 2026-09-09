-- FindMyTruck: lock down direct access to the raw `trucks` table.
--
-- Two pre-existing policies were far too permissive:
--   - "anon read trucks raw" (SELECT, roles anon + authenticated, using true)
--     let ANYONE read every column of `trucks` directly via the Supabase REST
--     endpoint -- including phone, owner_name, owner_email -- completely
--     bypassing the `public_trucks` view and the privacy toggles added in
--     migration 0017.
--   - "anon write trucks" (ALL, role anon, using true, check true) let anyone
--     unauthenticated insert/update/delete any truck row.
--
-- This migration removes both and replaces the read policy with a properly
-- scoped one. Nothing else needs to change:
--   - Public reads already go exclusively through `public_trucks`, a view
--     owned by `postgres` (which has BYPASSRLS) -- it has never depended on
--     these policies and is completely unaffected.
--   - The owner dashboard's own-row UPDATEs already go through the separate,
--     correctly-scoped "owners update own truck" policy (untouched).
--   - The owner dashboard's own-row SELECTs (dashboard/page.tsx,
--     getOwnedTrucks()) *did* rely on the blanket "anon read trucks raw"
--     policy for the `authenticated` role -- the new "owners read own truck"
--     policy below replaces that, scoped the same way as the update policy.
--   - Truck creation (register-truck, add-truck) and claiming (claim flow)
--     go through SECURITY DEFINER RPCs (register_truck_owner, claim_truck),
--     which bypass RLS internally -- unaffected either way.
--   - The admin panel and the one-off import/regeocode scripts, which DID
--     rely on both removed policies via the anon key, have been migrated to
--     the service-role key (src/app/admin/*, scripts/import-trucks.mjs,
--     scripts/regeocode-regions.mjs) in the same change that ships this
--     migration -- they no longer need any RLS grant on `trucks` at all.
--
-- SAFE TO RE-RUN: drop-if-exists + idempotent create.

drop policy if exists "anon write trucks" on trucks;
drop policy if exists "anon read trucks raw" on trucks;

create policy "owners read own truck" on trucks
  for select
  to authenticated
  using (id in (select my_truck_ids()));
