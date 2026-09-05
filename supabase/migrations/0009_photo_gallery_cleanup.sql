-- FindMyTruck: unify the photo gallery.
-- Run this in the Supabase SQL editor AFTER 0008_admin_control_center.sql.
--
-- The dashboard/admin no longer have separate "cover photo" and "menu photo"
-- upload fields -- everything is now one drag-reorder gallery (`truck_photos`),
-- and `trucks.cover_photo_url` is just a denormalized copy of the gallery's
-- first photo, kept in sync by the app on every add / delete / reorder /
-- set-cover action.
--
-- This migration is purely additive and idempotent: it only INSERTs rows that
-- aren't already present (matched by url), touches no other columns, and is
-- safe to run more than once (and safe to run any time before or after the
-- corresponding app deploy).

-- 1. Fold any standalone cover_photo_url into the gallery, at the very front.
insert into truck_photos (truck_id, url, caption, sort_order)
select t.id, t.cover_photo_url, null, -2
from trucks t
where t.cover_photo_url is not null
  and not exists (
    select 1 from truck_photos p where p.truck_id = t.id and p.url = t.cover_photo_url
  );

-- 2. Fold any standalone menu_photo_url into the gallery too (right after the
-- cover), captioned "Menu" so it's still identifiable once merged in.
insert into truck_photos (truck_id, url, caption, sort_order)
select t.id, t.menu_photo_url, 'Menu', -1
from trucks t
where t.menu_photo_url is not null
  and not exists (
    select 1 from truck_photos p where p.truck_id = t.id and p.url = t.menu_photo_url
  );

-- 3. Renumber sort_order per truck (stable by old sort_order, then id) so the
-- folded-in cover ends up at position 0 and everything else keeps its
-- relative order right after it.
with ranked as (
  select id, row_number() over (partition by truck_id order by sort_order asc, id asc) - 1 as rn
  from truck_photos
)
update truck_photos p
set sort_order = r.rn
from ranked r
where p.id = r.id;

-- 4. Re-sync trucks.cover_photo_url to match the gallery's first photo now
-- that everything has been folded in and renumbered.
update trucks t
set cover_photo_url = (
  select p.url from truck_photos p
  where p.truck_id = t.id
  order by p.sort_order asc
  limit 1
);
