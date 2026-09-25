-- Seed dáta pre LOKÁLNY vývoj (`supabase db reset` / `supabase start`).
--
-- POZOR: priamy INSERT do auth.users je bezpečný a bežný postup na lokálnom
-- Supabase stacku, ale NEROB TOTO na hostovanom (produkčnom) projekte — tam
-- používateľov vytváraj vždy cez Supabase Auth (registrácia v appke alebo
-- Dashboard → Authentication → Add user). Postup pre produkciu je popísaný
-- v README.md („Supabase konfigurácia“ → „Vytvorenie admin používateľa“).

-- GoTrue (Supabase Auth) očakáva pri token stĺpcoch prázdny reťazec, nie
-- NULL (jeho Go kód pri čítaní NULL do string zlyhá s "converting NULL to
-- string is unsupported") — preto ich nižšie explicitne nastavujeme na ''.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token,
  email_change_token_new, email_change, email_change_token_current,
  phone_change, phone_change_token, reauthentication_token
) values
  (
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-1111-1111-111111111111',
    'authenticated', 'authenticated',
    'admin@example.com',
    extensions.crypt('local-dev-admin', extensions.gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}', '{"display_name":"Admin"}',
    '', '', '', '', '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '22222222-2222-2222-2222-222222222222',
    'authenticated', 'authenticated',
    'player@example.com',
    extensions.crypt('local-dev-player', extensions.gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}', '{"display_name":"Hráčka"}',
    '', '', '', '', '', '', '', ''
  )
on conflict (id) do nothing;

update public.profiles set role = 'admin' where email = 'admin@example.com';

-- Ukážkové kapitoly -----------------------------------------------------

insert into public.chapters (
  id, title, slug, description, content_markdown,
  order_index, is_published, unlock_type, required_chapter_id,
  success_message, is_final
) values (
  '00000000-0000-0000-0000-000000000101',
  'Náš príbeh začína',
  'uvod',
  'Prvá kapitola — úvodný list.',
  E'# Vitaj na našej ceste\n\nToto je začiatok príbehu, ktorý napíšeme spolu.',
  1, true, 'manual', null,
  'Kapitola splnená — poďme ďalej.', false
);

insert into public.chapters (
  id, title, slug, description,
  order_index, is_published, unlock_type, required_chapter_id,
  question_config, hint, success_message, failure_message, is_final
) values (
  '00000000-0000-0000-0000-000000000102',
  'Ako sme sa spoznali',
  'otazka-ako-sme-sa-spoznali',
  'Otázka o spoločnej spomienke.',
  2, true, 'question', '00000000-0000-0000-0000-000000000101',
  jsonb_build_object(
    'type', 'single',
    'prompt', 'V ktorom meste sme sa prvýkrát stretli?',
    'options', null,
    'maxAttempts', 5,
    'showHintOnWrongAnswer', true
  ),
  'Bolo to mesto, kde sme si dali prvú kávu.',
  'Presne tak, spomínaš si rovnako ako ja.',
  'Skús to ešte raz.',
  false
);

insert into public.chapter_answers (chapter_id, correct_answers)
values ('00000000-0000-0000-0000-000000000102', array['Bratislava']);

insert into public.chapters (
  id, title, slug, description,
  order_index, is_published, unlock_type, required_chapter_id,
  qr_token_hash, success_message, failure_message, is_final
) values (
  '00000000-0000-0000-0000-000000000103',
  'Miesto nášho prvého rande',
  'qr-prve-rande',
  'Nájdi QR kód na mieste nášho prvého rande a naskenuj ho.',
  3, true, 'qr_code', '00000000-0000-0000-0000-000000000102',
  public.hash_token('quest_8f3a1d0c_demo'),
  'QR kód sedí — si na správnom mieste.',
  'Tento QR kód sem nepatrí.',
  false
);

insert into public.chapters (
  id, title, slug, description,
  order_index, is_published, unlock_type, required_chapter_id,
  latitude, longitude, allowed_radius_meters,
  success_message, failure_message, is_final
) values (
  '00000000-0000-0000-0000-000000000104',
  'Bratislavský hrad',
  'gps-bratislavsky-hrad',
  'Príď na miesto s výhľadom, ktoré poznáme veľmi dobre.',
  4, true, 'location', '00000000-0000-0000-0000-000000000103',
  48.1445, 17.1000, 150,
  'Si na správnom mieste.', 'Príliš ďaleko — skús sa priblížiť.', false
);

insert into public.chapters (
  id, title, slug, description, content_markdown,
  order_index, is_published, unlock_type, required_chapter_id,
  success_message, is_final
) values (
  '00000000-0000-0000-0000-000000000105',
  'Otoč sa.',
  'zaverecna-kapitola',
  'Posledná kapitola nášho príbehu.',
  E'# Otoč sa.\n\nPríbeh, ktorý sme spolu napísali, pokračuje ďalej.',
  5, true, 'manual', '00000000-0000-0000-0000-000000000104',
  null, true
);

-- Ukážkové bloky obsahu (chronologický príbeh v prvej kapitole) --------

insert into public.chapter_blocks (id, chapter_id, block_type, order_index, body_markdown)
values (
  '00000000-0000-0000-0000-000000000201',
  '00000000-0000-0000-0000-000000000101',
  'text', 10,
  E'Toto je prvý odsek nášho príbehu. Sem admin postupne pridáva ďalšie kapitoly, fotky a spomienky.'
);

insert into public.chapter_blocks (
  id, chapter_id, parent_block_id, block_type, order_index,
  storage_path, alt_text, caption
) values (
  '00000000-0000-0000-0000-000000000202',
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000201',
  'photo', 10,
  'seed/placeholder.png', 'Ukážková fotografia',
  'Táto fotka je pripojená priamo k odseku vyššie — presne takto sa dajú neskôr dopĺňať spomienky.'
);
