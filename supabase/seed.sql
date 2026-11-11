-- =====================================================================
-- Data contoh untuk Supabase LOKAL (dijalankan otomatis oleh `supabase db reset`)
--
-- Akun demo:
--   email    : demo@jajanku.test
--   password : Jajan-0de0295849
-- =====================================================================

do $$
declare
  uid uuid := '11111111-1111-4111-8111-111111111111';
  indomaret uuid; kopi uuid; warung uuid;
  e uuid;
  base date := date_trunc('month', current_date)::date;
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated',
    'demo@jajanku.test', crypt('Jajan-0de0295849', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', '{"display_name":"Demo"}', now(), now(),
    '', '', '', ''
  );

  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), uid, uid::text,
    jsonb_build_object('sub', uid::text, 'email', 'demo@jajanku.test', 'email_verified', true),
    'email', now(), now(), now());

  -- profil dibuat oleh trigger; beri nama diary
  update public.profiles set diary_name = 'Jajanku' where id = uid;

  insert into public.stores (user_id, name) values (uid, 'Indomaret') returning id into indomaret;
  insert into public.stores (user_id, name) values (uid, 'Kopi Kenangan') returning id into kopi;
  insert into public.stores (user_id, name) values (uid, 'Warung Bu Sri') returning id into warung;

  -- Momen 1
  insert into public.entries (user_id, title, eaten_on, eaten_at, location)
  values (uid, 'Ngemil sore', base + 2, '16:20', 'Kos') returning id into e;
  insert into public.items (entry_id, user_id, name, category, store_id, unit_id, qty, price, package_size) values
    (e, uid, 'Pocky Crushed Fruits', 'snack', indomaret, (select id from public.units where user_id is null and symbol = 'pack'), 1, 13900, '38 g'),
    (e, uid, 'Air mineral 600 mL', 'minuman', indomaret, (select id from public.units where user_id is null and symbol = 'botol'), 2, 4000, '600 mL');

  -- Momen 2
  insert into public.entries (user_id, title, eaten_on, eaten_at, location)
  values (uid, 'Makan siang', base + 5, '12:05', 'Dekat kampus') returning id into e;
  insert into public.items (entry_id, user_id, name, category, store_id, unit_id, qty, price) values
    (e, uid, 'Nasi ayam geprek', 'makanan', warung, (select id from public.units where user_id is null and symbol = 'porsi'), 1, 18000),
    (e, uid, 'Es teh manis', 'minuman', warung, (select id from public.units where user_id is null and symbol = 'cup'), 1, 5000);

  -- Momen 3
  insert into public.entries (user_id, title, eaten_on, eaten_at, location)
  values (uid, 'Ngopi pagi', base + 9, '08:40', 'Blok M') returning id into e;
  insert into public.items (entry_id, user_id, name, category, store_id, unit_id, qty, price) values
    (e, uid, 'Kopi susu gula aren', 'minuman', kopi, (select id from public.units where user_id is null and symbol = 'cup'), 1, 24000),
    (e, uid, 'Croissant', 'makanan', kopi, (select id from public.units where user_id is null and symbol = 'pc'), 1, 22000);
end $$;
