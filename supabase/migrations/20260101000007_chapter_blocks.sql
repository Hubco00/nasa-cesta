-- Obsah kapitoly ako chronologická (a voliteľne vnorená) postupnosť blokov —
-- text a fotky s popiskom. Nahrádza pôvodnú plochú `chapter_images` tabuľku:
-- admin teraz vie postupne pridávať udalosti („najprv príbeh, neskôr k nemu
-- pripojím fotku, potom ďalšia udalosť“) bez toho, aby musel vopred pripraviť
-- celý obsah naraz. `parent_block_id` umožňuje pripojiť blok (napr. fotku)
-- pod konkrétny iný blok namiesto lineárneho radenia za sebou.

drop policy if exists "chapter-photos: players read published chapter photos" on storage.objects;
drop policy if exists "chapter_images: admin full access" on public.chapter_images;
drop policy if exists "chapter_images: players read images of published chapters" on public.chapter_images;
drop table if exists public.chapter_images;

create table public.chapter_blocks (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters (id) on delete cascade,
  parent_block_id uuid references public.chapter_blocks (id) on delete set null,
  block_type text not null check (block_type in ('text', 'photo')),
  order_index integer not null default 0,
  title text,
  body_markdown text,
  storage_path text,
  alt_text text,
  caption text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint chapter_blocks_text_has_body check (block_type <> 'text' or body_markdown is not null),
  constraint chapter_blocks_photo_has_path check (block_type <> 'photo' or storage_path is not null),
  constraint chapter_blocks_not_self_parent check (id <> parent_block_id)
);

comment on table public.chapter_blocks is
  'Chronologický (a voliteľne vnorený cez parent_block_id) obsah kapitoly: text a fotky s popiskom.';

create index chapter_blocks_chapter_idx on public.chapter_blocks (chapter_id, order_index);
create index chapter_blocks_parent_idx on public.chapter_blocks (parent_block_id);

create trigger chapter_blocks_touch_updated_at
  before update on public.chapter_blocks
  for each row execute function public.touch_updated_at();

alter table public.chapter_blocks enable row level security;

create policy "chapter_blocks: admin full access"
  on public.chapter_blocks for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Používa `chapter_is_published()` (SECURITY DEFINER), nie priamy subquery na
-- `chapters` — tá pre hráčku nemá žiadnu SELECT politiku, takže bežný
-- subquery by pod jej právami vždy vrátil 0 riadkov a bloky by boli "neviditeľné".
create policy "chapter_blocks: players read blocks of published chapters"
  on public.chapter_blocks for select
  to authenticated
  using (public.chapter_is_published(chapter_blocks.chapter_id));

-- Storage RLS nad fotkami teraz kontroluje chapter_blocks namiesto zrušenej
-- chapter_images tabuľky. Rovnako používa chapter_is_published() namiesto
-- priameho joinu na `chapters` (rovnaký dôvod ako vyššie).
create policy "chapter-photos: players read published chapter photos"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'chapter-photos'
    and exists (
      select 1
      from public.chapter_blocks cb
      where cb.storage_path = storage.objects.name
        and public.chapter_is_published(cb.chapter_id)
    )
  );
