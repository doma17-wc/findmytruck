-- Applied to production (project jyulmnacskhmvnvqpfyu) via Supabase MCP on
-- 2026-09-11, in two passes -- see below.
--
-- Discovered while running the Supabase security advisor to sanity-check
-- migration 0023 (not something that was specifically asked for, but too
-- severe to leave open): admin_link_truck_owner, admin_unlink_truck_owner
-- and admin_unlink_one_truck_owner are SECURITY DEFINER functions with NO
-- internal authorization check at all (unlike claim_truck / register_
-- truck_owner, which both check auth.uid() before doing anything), and were
-- executable by anon and authenticated via PostgREST's default grants.
--
-- admin_link_truck_owner(p_email, p_truck_id) in particular: given any
-- email + truck_id, it deletes the current owner link, inserts the new one,
-- and marks the truck claimed -- with no check on who is calling. Concrete
-- impact: a fully unauthenticated POST to
-- /rest/v1/rpc/admin_link_truck_owner could reassign any of the 18 live
-- trucks' dashboard ownership to an attacker-controlled email, bypassing
-- both /admin's password gate and the truck_owners RLS fix in 0023
-- (SECURITY DEFINER functions bypass table RLS by design).
--
-- Verified every app call site (src/app/admin/actions.ts,
-- src/app/(site)/account-actions.ts) uses the service-role client, which is
-- unaffected by revoking anon/authenticated/public execute.
--
-- Pass 1 revoked EXECUTE from anon and authenticated specifically. Live
-- testing then showed admin_unlink_truck_owner and
-- admin_unlink_one_truck_owner were STILL callable by anon -- Postgres
-- grants EXECUTE to the PUBLIC pseudo-role by default at function creation
-- time, which every role (anon/authenticated included) inherits regardless
-- of a revoke targeted at named roles. Pass 2 (below, both included since
-- pass 1 alone is incomplete) closes it for real by revoking from PUBLIC.
revoke execute on function admin_link_truck_owner(text, uuid) from anon, authenticated;
revoke execute on function admin_unlink_truck_owner(uuid) from anon, authenticated;
revoke execute on function admin_unlink_one_truck_owner(uuid, uuid) from anon, authenticated;

revoke execute on function admin_link_truck_owner(text, uuid) from public;
revoke execute on function admin_unlink_truck_owner(uuid) from public;
revoke execute on function admin_unlink_one_truck_owner(uuid, uuid) from public;

-- Verified live post-fix: anon and authenticated both get a genuine
-- "permission denied for function ..." error (not the function's own
-- business-logic error, confirming the call never reaches the function
-- body), while service_role still executes normally. See the audit report
-- for the full test transcript.
