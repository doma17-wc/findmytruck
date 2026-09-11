-- FindMyTruck: let a truck owner read the favorites/follows on THEIR OWN
-- truck (needed for the dashboard's "Followers" analytics -- see 0020).
--
-- `user_favorites` has only ever had one RLS policy ("users manage own
-- favorites", `using (user_id = auth.uid())`), so a truck owner's own
-- dashboard query -- `select ... from user_favorites where truck_id = X` --
-- was silently returning zero rows: RLS filters out every row whose
-- `user_id` isn't the CURRENT user, and the current user is the owner, not
-- the customers who favorited them. This adds the missing owner-read policy,
-- same `my_truck_ids()` pattern as every other owner-scoped table (0014).
--
-- SAFE TO RE-RUN: drop-if-exists.

drop policy if exists "owners read own truck favorites" on user_favorites;
create policy "owners read own truck favorites" on user_favorites
  for select to authenticated
  using (truck_id in (select my_truck_ids()));
