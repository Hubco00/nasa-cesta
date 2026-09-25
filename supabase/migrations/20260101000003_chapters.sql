-- Kapitoly príbehu + rozšíriteľný model odomykacích podmienok.
--
-- `chapters` nesie jednoduché (jedno-podmienkové) nastavenie odomknutia
-- priamo na riadku (qr_token_hash / latitude+longitude+allowed_radius_meters /
-- question_config) pre unlock_type IN ('qr_code','location','question').
-- Pre unlock_type = 'combined' sa namiesto toho použijú riadky v
-- `chapter_unlock_conditions` (viac podmienok v poradí, napr. najprv GPS,
-- potom otázka) — bez nutnosti meniť schému `chapters` pri pridaní ďalšej
-- kombinácie v budúcnosti.

create table public.chapters (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text,
  content_markdown text,
  order_index integer not null default 0,
  is_published boolean not null default false,
  unlock_type text not null check (
    unlock_type in ('manual', 'qr_code', 'location', 'question', 'combined', 'admin')
  ),
  required_chapter_id uuid references public.chapters (id) on delete set null,

  -- unlock_type = 'qr_code': hash náhodného tokenu z QR kódu (nikdy plaintext).
  qr_token_hash text,

  -- unlock_type = 'location': cieľové súradnice + povolený rádius v metroch.
  -- Frontend tieto hodnoty nikdy nedostane priamo (pozri chapters_player_view).
  latitude double precision,
  longitude double precision,
  allowed_radius_meters integer,

  -- unlock_type = 'question': text otázky, možnosti, nápoveda, limit pokusov.
  -- Správna odpoveď je zámerne mimo tohto stĺpca — pozri `chapter_answers`.
  question_config jsonb,

  hint text,
  success_message text,
  failure_message text,
  is_final boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint chapters_location_fields_consistent check (
    (latitude is null) = (longitude is null)
  ),
  constraint chapters_not_self_required check (id <> required_chapter_id)
);

comment on table public.chapters is 'Kapitoly/kroky príbehu vrátane konfigurácie ich odomknutia.';
comment on column public.chapters.qr_token_hash is 'SHA-256 hash QR tokenu — nikdy neukladať plaintext hodnotu.';
comment on column public.chapters.latitude is 'Cieľová GPS súradnica — nesmie sa posielať hráčke, iba na server-side výpočet vzdialenosti.';

create index chapters_order_idx on public.chapters (order_index);
create index chapters_published_idx on public.chapters (is_published);
create index chapters_required_chapter_idx on public.chapters (required_chapter_id);

create trigger chapters_touch_updated_at
  before update on public.chapters
  for each row execute function public.touch_updated_at();

-- Pomocná funkcia pre RLS politiky iných tabuliek (chapter_blocks, Storage),
-- ktoré potrebujú vedieť, či je kapitola publikovaná. `chapters` samotná nemá
-- pre hráčku žiadnu SELECT politiku (iba admin) — obyčajný subquery typu
-- `exists (select 1 from chapters where ...)` v cudzej politike by preto pre
-- hráčku vždy vrátil 0 riadkov (subquery beží pod právami volajúcej role).
-- SECURITY DEFINER túto RLS reštrikciu bezpečne obíde, keďže vracia iba
-- neškodný boolean, nikdy citlivé stĺpce.
create or replace function public.chapter_is_published(p_chapter_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select is_published from public.chapters where id = p_chapter_id),
    false
  );
$$;

-- Podmienky pre unlock_type = 'combined'. `step_order` určuje poradie, v akom
-- musia byť splnené (napr. 1 = najprv GPS, 2 = potom otázka).
create table public.chapter_unlock_conditions (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters (id) on delete cascade,
  step_order integer not null default 1,
  condition_type text not null check (condition_type in ('qr_code', 'location', 'question')),

  qr_token_hash text,
  latitude double precision,
  longitude double precision,
  allowed_radius_meters integer,
  question_config jsonb,

  hint text,
  success_message text,
  failure_message text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (chapter_id, step_order),
  constraint chapter_unlock_conditions_location_fields_consistent check (
    (latitude is null) = (longitude is null)
  )
);

comment on table public.chapter_unlock_conditions is
  'Postupnosť podmienok pre kapitoly s unlock_type = combined.';

create index chapter_unlock_conditions_chapter_idx
  on public.chapter_unlock_conditions (chapter_id, step_order);

create trigger chapter_unlock_conditions_touch_updated_at
  before update on public.chapter_unlock_conditions
  for each row execute function public.touch_updated_at();

-- Správne odpovede — zámerne v samostatnej tabuľke bez SELECT prístupu pre
-- hráčky (pozri RLS v neskoršej migrácii), aby ich nebolo možné vyčítať cez
-- API ani pri correct `chapters`/`chapter_unlock_conditions` SELECT politike.
create table public.chapter_answers (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid references public.chapters (id) on delete cascade,
  condition_id uuid references public.chapter_unlock_conditions (id) on delete cascade,
  correct_answers text[] not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint chapter_answers_exactly_one_owner check (
    (chapter_id is null) <> (condition_id is null)
  ),
  unique (chapter_id),
  unique (condition_id)
);

comment on table public.chapter_answers is
  'Správne odpovede na otázky — mimo dosahu bežného SELECT prístupu hráčky, overuje sa iba cez RPC funkcie.';

create trigger chapter_answers_touch_updated_at
  before update on public.chapter_answers
  for each row execute function public.touch_updated_at();

-- Fotografie ku kapitole (galéria + hlavné foto podľa sort_order = 0).
create table public.chapter_images (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters (id) on delete cascade,
  storage_path text not null,
  alt_text text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

comment on table public.chapter_images is
  'Referencie na fotografie v privátnom Storage bucket-e "chapter-photos".';

create index chapter_images_chapter_idx on public.chapter_images (chapter_id, sort_order);

alter table public.chapters enable row level security;
alter table public.chapter_unlock_conditions enable row level security;
alter table public.chapter_answers enable row level security;
alter table public.chapter_images enable row level security;

-- Iba admin smie čítať/meniť surové tabuľky priamo z klienta. Hráčka
-- pristupuje ku kapitolám cez `chapters_player_view` (ďalšia migrácia), ktorá
-- vynecháva citlivé stĺpce (qr_token_hash, latitude, longitude) a zobrazuje
-- iba publikované kapitoly.
create policy "chapters: admin full access"
  on public.chapters for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "chapter_unlock_conditions: admin full access"
  on public.chapter_unlock_conditions for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- chapter_answers: žiadna SELECT politika pre hráčky ani pre admina cez
-- klienta — obsah sa vždy overuje iba cez SECURITY DEFINER RPC funkcie.
-- Admin ju napriek tomu potrebuje vedieť nastaviť/upraviť v editore, preto
-- povoľujeme INSERT/UPDATE/DELETE, ale nie SELECT.
create policy "chapter_answers: admin write only"
  on public.chapter_answers for insert
  to authenticated
  with check (public.is_admin());

create policy "chapter_answers: admin update"
  on public.chapter_answers for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "chapter_answers: admin delete"
  on public.chapter_answers for delete
  to authenticated
  using (public.is_admin());

create policy "chapter_images: admin full access"
  on public.chapter_images for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "chapter_images: players read images of published chapters"
  on public.chapter_images for select
  to authenticated
  using (
    exists (
      select 1 from public.chapters c
      where c.id = chapter_images.chapter_id and c.is_published
    )
  );

-- Bezpečný pohľad pre hráčky: iba publikované kapitoly, bez qr_token_hash a
-- bez GPS súradníc (tie sa vyhodnocujú výhradne cez RPC funkcie na serveri).
create view public.chapters_player_view
with (security_invoker = false)
as
  select
    id,
    title,
    slug,
    description,
    content_markdown,
    order_index,
    unlock_type,
    required_chapter_id,
    allowed_radius_meters,
    question_config,
    hint,
    success_message,
    failure_message,
    is_final,
    created_at,
    updated_at
  from public.chapters
  where is_published = true;

comment on view public.chapters_player_view is
  'Bezpečný pohľad na kapitoly pre hráčku: iba publikované, bez qr_token_hash a GPS súradníc.';

grant select on public.chapters_player_view to authenticated;

create view public.chapter_unlock_conditions_player_view
with (security_invoker = false)
as
  select
    cuc.id,
    cuc.chapter_id,
    cuc.step_order,
    cuc.condition_type,
    cuc.allowed_radius_meters,
    cuc.question_config,
    cuc.hint,
    cuc.success_message,
    cuc.failure_message,
    cuc.created_at,
    cuc.updated_at
  from public.chapter_unlock_conditions cuc
  join public.chapters c on c.id = cuc.chapter_id
  where c.is_published = true;

comment on view public.chapter_unlock_conditions_player_view is
  'Bezpečný pohľad na kombinované podmienky: bez qr_token_hash a GPS súradníc.';

grant select on public.chapter_unlock_conditions_player_view to authenticated;
