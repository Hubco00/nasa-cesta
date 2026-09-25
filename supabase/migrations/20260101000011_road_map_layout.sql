-- Ručne upravovaná mapa kapitol (cesta na úvodnej obrazovke): admin posúva
-- kapitoly a sám kreslí úseky cesty medzi nimi s nastaviteľným oblúkom.

-- Poloha stredu kapitoly v logických súradniciach plátna (šírka 360, výška
-- rastie so zoznamom). NULL = automatické rozloženie podľa poradia.
alter table public.chapters
  add column map_x double precision,
  add column map_y double precision;

create table public.chapter_map_segments (
  id uuid primary key default gen_random_uuid(),
  from_chapter_id uuid not null references public.chapters (id) on delete cascade,
  to_chapter_id uuid not null references public.chapters (id) on delete cascade,
  -- -1..1: 0 = rovná čiara, ± = oblúk na jednu či druhú stranu.
  curve real not null default 0 check (curve between -1 and 1),
  created_at timestamptz not null default now(),

  constraint chapter_map_segments_distinct check (from_chapter_id <> to_chapter_id),
  unique (from_chapter_id, to_chapter_id)
);

comment on table public.chapter_map_segments is
  'Úseky cesty na mape kapitol, ktoré nakreslil admin. Bez úsekov sa cesta kreslí automaticky podľa poradia.';

create index chapter_map_segments_from_idx on public.chapter_map_segments (from_chapter_id);
create index chapter_map_segments_to_idx on public.chapter_map_segments (to_chapter_id);

alter table public.chapter_map_segments enable row level security;

create policy "chapter_map_segments: admin full access"
  on public.chapter_map_segments for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Cesta je na mape vidno aj pri zamknutých kapitolách (tie sú na mape ako
-- zámky s číslom), preto stačí, aby boli oba konce publikované.
create policy "chapter_map_segments: players read segments of published chapters"
  on public.chapter_map_segments for select
  to authenticated
  using (
    public.chapter_is_published(from_chapter_id)
    and public.chapter_is_published(to_chapter_id)
  );

-- Timeline vracia aj polohu kapitoly na mape (mení sa návratový typ → drop).
drop function public.get_my_timeline();

create function public.get_my_timeline()
returns table (
  chapter_id uuid,
  title text,
  slug text,
  description text,
  order_index integer,
  unlock_type text,
  is_final boolean,
  status text,
  map_x double precision,
  map_y double precision
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
    t.eff_status,
    t.map_x,
    t.map_y
  from t
  order by t.order_index;
$$;

grant execute on function public.get_my_timeline() to authenticated;
