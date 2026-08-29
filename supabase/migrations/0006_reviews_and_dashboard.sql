-- FindMyTruck: reviews table for the redesigned truck-owner dashboard.
-- Run this in the Supabase SQL editor AFTER 0005_unclaimed_profiles.sql.
--
-- This migration:
--   1. Adds a `reviews` table (customer reviews + a single owner reply).
--   2. Wires RLS so anyone can read reviews, signed-in users can leave one,
--      and a truck owner can only edit (reply to) reviews on their own truck.
--
-- NOTE: the "sold out" flag on menu items needs NO migration -- it lives inside
-- the existing `trucks.menu_items` jsonb array as an optional `sold_out: true`
-- key on each entry, handled entirely by normalizeMenuItems() in app code.

create extension if not exists "pgcrypto";

create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  truck_id uuid not null references trucks(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  author_name text not null,
  rating int not null check (rating between 1 and 5),
  text text,
  reply text,
  created_at timestamptz not null default now()
);

create index if not exists idx_reviews_truck_id on reviews(truck_id);
create index if not exists idx_reviews_created_at on reviews(created_at);

alter table reviews enable row level security;

-- Reviews are public content.
drop policy if exists "public read reviews" on reviews;
create policy "public read reviews" on reviews
  for select to anon, authenticated using (true);

-- Any signed-in user can leave a review; they can only attribute it to themselves.
drop policy if exists "authenticated create reviews" on reviews;
create policy "authenticated create reviews" on reviews
  for insert to authenticated
  with check (user_id is null or user_id = auth.uid());

-- A truck owner can update reviews on the truck linked to their own profile
-- (used for posting / editing the public reply). They cannot delete or insert.
drop policy if exists "owners reply own reviews" on reviews;
create policy "owners reply own reviews" on reviews
  for update to authenticated
  using (truck_id in (select truck_id from profiles where id = auth.uid()))
  with check (truck_id in (select truck_id from profiles where id = auth.uid()));

-- Anon parity for the app-layer-gated /admin panel (matches the other tables).
drop policy if exists "anon write reviews" on reviews;
create policy "anon write reviews" on reviews
  for all to anon using (true) with check (true);
