-- Miesta na mape (Kingdom of Slovakia) patriace ku konkrétnej kapitole.
-- Jedno mesto môže mať obsah vo viacerých kapitolách (kapitola 1 aj 2 môžu
-- mať Dolný Kubín), každá s vlastnými príbehmi/fotkami. Obsah miesta sú
-- obyčajné `chapter_blocks` s nastaveným `map_pin_id`; bloky bez neho tvoria
-- hlavný list kapitoly.

create table public.chapter_map_pins (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters (id) on delete cascade,
  city_key text not null check (
    city_key in (
      'bratislava', 'trnava', 'puchov', 'zbynov', 'zilina',
      'vricko', 'dolny_kubin', 'presov', 'kosice'
    )
  ),
  created_at timestamptz not null default now(),

  unique (chapter_id, city_key)
);

comment on table public.chapter_map_pins is
  'Miesto na mape s vlastným obsahom v rámci jednej kapitoly.';

create index chapter_map_pins_chapter_idx on public.chapter_map_pins (chapter_id);

alter table public.chapter_blocks
  add column map_pin_id uuid references public.chapter_map_pins (id) on delete cascade;

create index chapter_blocks_map_pin_idx on public.chapter_blocks (map_pin_id);

-- Kapitola je pre hráčku prístupná iba ak je publikovaná a pre ňu nie je
-- zamknutá. Doteraz RLS kontrolovala iba publikovanie, takže obsah zamknutých
-- kapitol bol cez API čitateľný — UI ho len skrývalo.
create or replace function public.chapter_is_accessible(p_chapter_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select c.is_published
    and public.effective_status(
      (
        select pp.status from public.player_progress pp
        where pp.player_id = auth.uid() and pp.chapter_id = c.id
      ),
      c.required_chapter_id
    ) <> 'locked'
  from public.chapters c
  where c.id = p_chapter_id;
$$;

grant execute on function public.chapter_is_accessible(uuid) to authenticated;

alter table public.chapter_map_pins enable row level security;

create policy "chapter_map_pins: admin full access"
  on public.chapter_map_pins for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "chapter_map_pins: players read pins of accessible chapters"
  on public.chapter_map_pins for select
  to authenticated
  using (public.chapter_is_accessible(chapter_map_pins.chapter_id));

drop policy "chapter_blocks: players read blocks of published chapters"
  on public.chapter_blocks;

create policy "chapter_blocks: players read blocks of accessible chapters"
  on public.chapter_blocks for select
  to authenticated
  using (public.chapter_is_accessible(chapter_blocks.chapter_id));

drop policy "chapter-photos: players read published chapter photos" on storage.objects;

create policy "chapter-photos: players read photos of accessible chapters"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'chapter-photos'
    and exists (
      select 1
      from public.chapter_blocks cb
      where cb.storage_path = storage.objects.name
        and public.chapter_is_accessible(cb.chapter_id)
    )
  );

-- Pohľady pre hráčku skryjú aj zamknuté kapitoly, nie iba nepublikované.
create or replace view public.chapters_player_view
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
  where public.chapter_is_accessible(id);

create or replace view public.chapter_unlock_conditions_player_view
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
  where public.chapter_is_accessible(cuc.chapter_id);

-- Timeline nevracia názov, popis ani slug zamknutých kapitol.
create or replace function public.get_my_timeline()
returns table (
  chapter_id uuid,
  title text,
  slug text,
  description text,
  order_index integer,
  unlock_type text,
  is_final boolean,
  status text
)
language sql
security definer
set search_path = public
stable
as $$
  with t as (
    select
      c.*,
      public.effective_status(pp.status, c.required_chapter_id) as eff_status
    from public.chapters c
    left join public.player_progress pp
      on pp.chapter_id = c.id and pp.player_id = auth.uid()
    where c.is_published = true
  )
  select
    t.id,
    case when t.eff_status <> 'locked' then t.title end,
    case when t.eff_status <> 'locked' then t.slug end,
    case when t.eff_status <> 'locked' then t.description end,
    t.order_index,
    case when t.eff_status <> 'locked' then t.unlock_type end,
    t.is_final and t.eff_status <> 'locked',
    t.eff_status
  from t
  order by t.order_index;
$$;
