-- =====================================================================
-- Jajanku — skema database
-- Jalankan sekali di Supabase Dashboard → SQL Editor → New query → Run
-- =====================================================================

-- ---------- Profil + pengaturan tampilan ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  diary_name text not null default 'Jajanku',
  monthly_budget numeric(14, 2) check (monthly_budget is null or monthly_budget >= 0),
  theme jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Untuk database yang dibuat dari versi skema sebelumnya
alter table public.profiles add column if not exists monthly_budget numeric(14, 2);

-- Buat profil otomatis saat user register
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Unit (user_id null = unit bawaan untuk semua) ----------
create table if not exists public.units (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  name text not null,
  symbol text not null,
  kind text not null check (kind in ('berat', 'volume', 'hitungan')),
  created_at timestamptz not null default now()
);
create index if not exists units_user_idx on public.units (user_id);

-- ---------- Toko ----------
create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

-- ---------- Momen (satu foto / satu kali jajan) ----------
create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'Jajan',
  eaten_on date not null default current_date,
  eaten_at time,
  location text,
  photo_path text,               -- foto asli (opsional, bucket privat "photos")
  created_at timestamptz not null default now()
);
create index if not exists entries_user_date_idx on public.entries (user_id, eaten_on desc);

-- ---------- Item / sajian di dalam momen ----------
create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.entries (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  category text not null default 'makanan'
    check (category in ('makanan', 'minuman', 'snack', 'lainnya')),
  store_id uuid references public.stores (id) on delete set null,
  unit_id uuid references public.units (id) on delete set null,
  qty numeric(12, 3) not null default 1 check (qty > 0),
  price numeric(14, 2) not null default 0 check (price >= 0),  -- harga per unit (Rp)
  package_size text,             -- mis. "38 g", dibaca AI
  sticker_path text,             -- PNG transparan (bucket publik "stickers")
  rating smallint check (rating between 1 and 5),
  calories integer check (calories between 0 and 20000), -- perkiraan kkal per unit
  note text check (char_length(note) <= 280),
  created_at timestamptz not null default now()
);
create index if not exists items_entry_idx on public.items (entry_id);
create index if not exists items_user_idx on public.items (user_id);
-- Kolom tambahan untuk database dari versi skema sebelumnya
alter table public.items add column if not exists rating smallint check (rating between 1 and 5);
alter table public.items add column if not exists note text check (char_length(note) <= 280);
alter table public.items add column if not exists calories integer check (calories between 0 and 20000);
create index if not exists items_user_name_idx on public.items (user_id, lower(name));

-- ---------- Row Level Security ----------
alter table public.profiles enable row level security;
alter table public.units    enable row level security;
alter table public.stores   enable row level security;
alter table public.entries  enable row level security;
alter table public.items    enable row level security;

drop policy if exists "profil sendiri" on public.profiles;
create policy "profil sendiri" on public.profiles
  for all to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

drop policy if exists "lihat unit bawaan & milik sendiri" on public.units;
create policy "lihat unit bawaan & milik sendiri" on public.units
  for select to authenticated
  using (user_id is null or user_id = (select auth.uid()));
drop policy if exists "kelola unit sendiri" on public.units;
create policy "kelola unit sendiri" on public.units
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "toko sendiri" on public.stores;
create policy "toko sendiri" on public.stores
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "momen sendiri" on public.entries;
create policy "momen sendiri" on public.entries
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "item sendiri" on public.items;
create policy "item sendiri" on public.items
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.entries e where e.id = entry_id and e.user_id = (select auth.uid()))
  );

-- ---------- Unit bawaan ----------
insert into public.units (user_id, name, symbol, kind)
select null, v.name, v.symbol, v.kind
from (values
  ('gram', 'g', 'berat'), ('kilogram', 'kg', 'berat'), ('ons', 'ons', 'berat'),
  ('liter', 'L', 'volume'), ('mililiter', 'mL', 'volume'),
  ('piece', 'pc', 'hitungan'), ('pack', 'pack', 'hitungan'), ('sachet', 'sachet', 'hitungan'),
  ('botol', 'botol', 'hitungan'), ('kaleng', 'kaleng', 'hitungan'), ('porsi', 'porsi', 'hitungan'),
  ('cup', 'cup', 'hitungan'), ('bungkus', 'bks', 'hitungan')
) as v(name, symbol, kind)
where not exists (select 1 from public.units u where u.user_id is null and u.symbol = v.symbol);

-- ---------- Storage ----------
-- stickers: publik (nama file = uuid acak), photos: privat
insert into storage.buckets (id, name, public) values ('stickers', 'stickers', true)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('photos', 'photos', false)
  on conflict (id) do nothing;

-- File disimpan di folder <user_id>/...
drop policy if exists "upload ke folder sendiri" on storage.objects;
create policy "upload ke folder sendiri" on storage.objects
  for insert to authenticated
  with check (
    bucket_id in ('stickers', 'photos')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "baca file sendiri" on storage.objects;
create policy "baca file sendiri" on storage.objects
  for select to authenticated
  using (
    bucket_id in ('stickers', 'photos')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "hapus file sendiri" on storage.objects;
create policy "hapus file sendiri" on storage.objects
  for delete to authenticated
  using (
    bucket_id in ('stickers', 'photos')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
