-- Tutoriál: úvodná kapitola, ktorú hráčka vidí ako jedinú. Kým ju nedokončí,
-- ostatné kapitoly nie sú na mape ani dostupné (ani cez API, ani ak ich už
-- mala rozohrané). Admin ich vidí vždy.

alter table public.chapters
  add column is_tutorial boolean not null default false;

comment on column public.chapters.is_tutorial is
  'Úvodná kapitola — kým ju hráčka nedokončí, ostatné kapitoly nevidí.';

-- Tutoriál je na začiatku, nesmie na nič čakať (inak by sa hra zasekla) a
-- nemôže byť zároveň finálnou kapitolou.
alter table public.chapters add constraint chapters_tutorial_has_no_conditions check (
  not is_tutorial
  or (
    required_chapter_id is null
    and required_block_id is null
    and not hidden_until_unlocked
    and not is_final
  )
);

-- Má hráčka ešte nedokončený publikovaný tutoriál?
create function public.tutorial_pending()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select not coalesce(public.is_admin(), false)
    and exists (
      select 1
      from public.chapters t
      where t.is_tutorial
        and t.is_published
        and not exists (
          select 1
          from public.player_progress pp
          where pp.player_id = auth.uid()
            and pp.chapter_id = t.id
            and pp.status = 'completed'
        )
    );
$$;

create or replace function public.chapter_effective_status(p_chapter_id uuid)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select case
    when not c.is_tutorial and public.tutorial_pending() then 'locked'
    else public.effective_status(
      (
        select pp.status from public.player_progress pp
        where pp.player_id = auth.uid() and pp.chapter_id = c.id
      ),
      c.required_chapter_id,
      c.required_block_id
    )
  end
  from public.chapters c
  where c.id = p_chapter_id;
$$;

create or replace function public.chapter_is_on_map(p_chapter_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select c.is_published
    and (c.is_tutorial or not public.tutorial_pending())
    and not (c.hidden_until_unlocked and public.chapter_effective_status(c.id) = 'locked')
  from public.chapters c
  where c.id = p_chapter_id;
$$;

-- Návratový typ sa mení (pribudol is_tutorial) — funkciu treba vytvoriť znova.
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
  map_y double precision,
  is_tutorial boolean
)
language sql
security definer
set search_path = public
stable
as $$
  with pending as (
    select public.tutorial_pending() as yes
  ),
  t as (
    select
      c.*,
      case
        when not c.is_tutorial and (select yes from pending) then 'locked'
        else public.effective_status(pp.status, c.required_chapter_id, c.required_block_id)
      end as eff_status
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
    t.map_y,
    t.is_tutorial
  from t
  where not (t.hidden_until_unlocked and t.eff_status = 'locked')
    and (t.is_tutorial or not (select yes from pending))
  order by t.order_index;
$$;

grant execute on function
  public.tutorial_pending(),
  public.get_my_timeline()
to authenticated;
