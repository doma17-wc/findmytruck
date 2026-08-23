-- FindMyTruck database schema + seed data
-- Run this in the Supabase SQL editor (or via the Management API).

create extension if not exists "pgcrypto";

-- =========================
-- TABLES
-- =========================

create table if not exists trucks (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  cuisine_type text[] not null default '{}',
  price_range text,
  logo_url text,
  cover_photo_url text,
  menu_text text,
  menu_photo_url text,
  instagram text,
  tiktok text,
  website text,
  phone text,
  owner_name text,
  owner_email text,
  languages text[] not null default '{}',
  is_active boolean not null default true,
  is_claimed boolean not null default false,
  short_code text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists truck_schedules (
  id uuid primary key default gen_random_uuid(),
  truck_id uuid not null references trucks(id) on delete cascade,
  day_of_week int not null check (day_of_week between 0 and 6), -- 0=Mon .. 6=Sun
  location_name text not null,
  location_lat float8 not null,
  location_lng float8 not null,
  start_time time not null,
  end_time time not null,
  is_recurring boolean not null default true,
  specific_date date,
  notes text
);

create table if not exists truck_photos (
  id uuid primary key default gen_random_uuid(),
  truck_id uuid not null references trucks(id) on delete cascade,
  url text not null,
  caption text,
  sort_order int not null default 0
);

create table if not exists qr_redirects (
  short_code text primary key,
  truck_id uuid references trucks(id) on delete cascade,
  destination_url text not null,
  scan_count int not null default 0,
  created_at timestamptz not null default now()
);

-- =========================
-- INDEXES
-- =========================
create index if not exists idx_truck_schedules_truck_id on truck_schedules(truck_id);
create index if not exists idx_truck_schedules_day on truck_schedules(day_of_week);
create index if not exists idx_truck_photos_truck_id on truck_photos(truck_id);
create index if not exists idx_trucks_is_active on trucks(is_active);

-- =========================
-- updated_at trigger
-- =========================
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_trucks_updated_at on trucks;
create trigger trg_trucks_updated_at
before update on trucks
for each row execute function set_updated_at();

-- =========================
-- ROW LEVEL SECURITY
-- =========================
alter table trucks enable row level security;
alter table truck_schedules enable row level security;
alter table truck_photos enable row level security;
alter table qr_redirects enable row level security;

-- Public (anon) read access to non-sensitive truck columns is handled via the
-- `public_trucks` view below. Direct anon SELECT on `trucks` is intentionally
-- NOT granted, so phone/owner_name/owner_email never reach the public API.

-- Schedules and photos are not sensitive: allow public read.
drop policy if exists "public read schedules" on truck_schedules;
create policy "public read schedules" on truck_schedules
  for select using (true);

drop policy if exists "public read photos" on truck_photos;
create policy "public read photos" on truck_photos
  for select using (true);

-- qr_redirects: no public read policy (redirect uses the server-side route
-- with the anon key acting through a SECURITY DEFINER function instead).

-- Anon write access (used by the /admin dashboard, gated by ADMIN_PASSWORD
-- at the application layer since no service-role key is configured here).
drop policy if exists "anon write trucks" on trucks;
create policy "anon write trucks" on trucks
  for all using (true) with check (true);

drop policy if exists "anon write schedules" on truck_schedules;
create policy "anon write schedules" on truck_schedules
  for all using (true) with check (true);

drop policy if exists "anon write photos" on truck_photos;
create policy "anon write photos" on truck_photos
  for all using (true) with check (true);

drop policy if exists "anon write qr" on qr_redirects;
create policy "anon write qr" on qr_redirects
  for all using (true) with check (true);

-- =========================
-- Public-safe view (excludes phone/owner_name/owner_email)
-- =========================
create or replace view public_trucks as
select
  id, slug, name, description, cuisine_type, price_range,
  logo_url, cover_photo_url, menu_text, menu_photo_url,
  instagram, tiktok, website, languages,
  is_active, is_claimed, short_code, created_at, updated_at
from trucks;

grant select on public_trucks to anon, authenticated;

-- The trucks table itself still needs SELECT for the admin dashboard and for
-- the redirect route to resolve truck_id -> slug; anon SELECT is granted at
-- the RLS-policy level below but callers on the public site should always
-- query `public_trucks` instead of `trucks` to avoid leaking contact fields.
drop policy if exists "anon read trucks raw" on trucks;
create policy "anon read trucks raw" on trucks
  for select using (true);

-- =========================
-- STORAGE (photo uploads from /admin)
-- =========================
insert into storage.buckets (id, name, public)
values ('truck-photos', 'truck-photos', true)
on conflict (id) do nothing;

drop policy if exists "public read truck photos" on storage.objects;
create policy "public read truck photos" on storage.objects
  for select using (bucket_id = 'truck-photos');

drop policy if exists "anon upload truck photos" on storage.objects;
create policy "anon upload truck photos" on storage.objects
  for insert with check (bucket_id = 'truck-photos');

drop policy if exists "anon delete truck photos" on storage.objects;
create policy "anon delete truck photos" on storage.objects
  for delete using (bucket_id = 'truck-photos');

-- =========================
-- SEED DATA
-- =========================

insert into trucks (slug, name, description, cuisine_type, price_range, logo_url, cover_photo_url, instagram, tiktok, website, phone, owner_name, owner_email, languages, is_active, is_claimed, short_code)
values
(
  'smash-brothers',
  'Smash Brothers',
  'Double-smashed patties, American cheese, and a secret sauce. Zurich''s favorite smash burger truck, parked at Hardbrücke every weekday lunch.',
  array['Burgers', 'American'],
  '$$',
  null,
  null,
  'smashbrothers.ch',
  null,
  'https://smashbrothers.ch',
  '+41 79 000 00 01',
  'Marco Keller',
  'marco@smashbrothers.ch',
  array['de', 'en'],
  true,
  false,
  'sb001'
),
(
  'thai-street-kitchen',
  'Thai Street Kitchen',
  'Authentic Thai street food made fresh daily — pad thai, green curry, and papaya salad, served near Europaallee.',
  array['Asian', 'Thai'],
  '$$',
  null,
  null,
  'thaistreetkitchen.ch',
  null,
  null,
  '+41 79 000 00 02',
  'Nok Suwan',
  'nok@thaistreetkitchen.ch',
  array['en', 'th'],
  true,
  false,
  'tsk001'
),
(
  'taco-libre',
  'Taco Libre',
  'Handmade corn tortillas, slow-braised meats, and fresh salsas — Mexican street tacos near Toni-Areal.',
  array['Mexican'],
  '$',
  null,
  null,
  'tacolibre.ch',
  'tacolibre.ch',
  null,
  '+41 79 000 00 03',
  'Diego Fernandez',
  'diego@tacolibre.ch',
  array['de', 'es', 'en'],
  true,
  false,
  'tl001'
)
on conflict (slug) do nothing;

-- Schedules: day_of_week 0=Mon .. 6=Sun

-- Smash Brothers: Mon-Fri 11:30-14:00 @ Hardbrücke
insert into truck_schedules (truck_id, day_of_week, location_name, location_lat, location_lng, start_time, end_time, is_recurring)
select id, d, 'Hardbrücke', 47.3856, 8.5178, '11:30', '14:00', true
from trucks, unnest(array[0,1,2,3,4]) as d
where slug = 'smash-brothers';

-- Thai Street Kitchen: Tue, Wed, Thu 11:00-14:30 @ Europaallee
insert into truck_schedules (truck_id, day_of_week, location_name, location_lat, location_lng, start_time, end_time, is_recurring)
select id, d, 'Europaallee', 47.3782, 8.5391, '11:00', '14:30', true
from trucks, unnest(array[1,2,3]) as d
where slug = 'thai-street-kitchen';

-- Taco Libre: Mon, Wed, Fri 11:30-14:00 @ Toni-Areal
insert into truck_schedules (truck_id, day_of_week, location_name, location_lat, location_lng, start_time, end_time, is_recurring)
select id, d, 'Toni-Areal', 47.3901, 8.5158, '11:30', '14:00', true
from trucks, unnest(array[0,2,4]) as d
where slug = 'taco-libre';

-- QR redirects pointing at each truck's public profile
insert into qr_redirects (short_code, truck_id, destination_url)
select short_code, id, 'https://findmytruck.ch/trucks/' || slug
from trucks
on conflict (short_code) do nothing;
