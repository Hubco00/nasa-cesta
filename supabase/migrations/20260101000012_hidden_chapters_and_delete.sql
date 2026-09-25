-- Podmienky odomknutia kapitoly: po dokončení inej kapitoly (required_chapter_id),
-- po správnej odpovedi na otázku v obsahu (required_block_id), alebo oboje.
-- Kapitola môže byť na mape úplne skrytá, kým sa neodomkne. Plus bezpečné
-- mazanie kapitol.

alter table public.chapters
  add column required_block_id uuid references public.chapter_blocks (id),
  add column hidden_until_unlocked boolean not null default false;

comment on column public.chapters.required_block_id is
  'Otázka (chapter_blocks, block_type = question), na ktorú musí hráčka správne odpovedať, aby sa kapitola odomkla.';
comment on column public.chapters.hidden_until_unlocked is
  'Kým je kapitola zamknutá, na mape sa vôbec nezobrazí (ani ako zámok s číslom).';

create index chapters_required_block_idx on public.chapters (required_block_id);

-- Efektívny stav s oboma podmienkami. Uložený stav (napr. ručné odomknutie
-- adminom) má vždy prednosť.
create function public.effective_status(
  p_stored_status text,
  p_required_chapter_id uuid,
  p_required_block_id uuid
)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    p_stored_status,
    case
      when (
        p_required_chapter_id is null
        or exists (
          select 1 from public.player_progress req
          where req.player_id = auth.uid()
            and req.chapter_id = p_required_chapter_id
            and req.status = 'completed'
        )
      ) and (
        p_required_block_id is null
        or exists (
          select 1 from public.player_block_progress pbp
          where pbp.player_id = auth.uid()
            and pbp.block_id = p_required_block_id
            and pbp.solved_at is not null
        )
      ) then 'unlocked'
      else 'locked'
    end
  );
$$;

create or replace function public.chapter_effective_status(p_chapter_id uuid)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select public.effective_status(
    (
      select pp.status from public.player_progress pp
      where pp.player_id = auth.uid() and pp.chapter_id = c.id
    ),
    c.required_chapter_id,
    c.required_block_id
  )
  from public.chapters c
  where c.id = p_chapter_id;
$$;

create or replace function public.get_chapter_status(p_chapter_id uuid)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select public.chapter_effective_status(p_chapter_id);
$$;

create or replace function public.chapter_is_accessible(p_chapter_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select c.is_published and public.chapter_effective_status(c.id) <> 'locked'
  from public.chapters c
  where c.id = p_chapter_id;
$$;

-- Je kapitola na mape vidno (publikovaná a nie je skrytá zamknutá)?
create or replace function public.chapter_is_on_map(p_chapter_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select c.is_published
    and not (c.hidden_until_unlocked and public.chapter_effective_status(c.id) = 'locked')
  from public.chapters c
  where c.id = p_chapter_id;
$$;

create or replace function public.get_my_timeline()
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
      public.effective_status(pp.status, c.required_chapter_id, c.required_block_id)
        as eff_status
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
  where not (t.hidden_until_unlocked and t.eff_status = 'locked')
  order by t.order_index;
$$;

-- Kontrola pred akciou v kapitole (odpoveď, QR, GPS, pokračovať). Uložený stav
-- má prednosť — predtým ručné odomknutie adminom nestačilo, ak podmienka
-- (predchádzajúca kapitola) ešte nebola splnená.
create or replace function public.ensure_chapter_unlocked(p_chapter_id uuid)
returns public.player_progress
language plpgsql
security definer
set search_path = public
as $$
declare
  v_progress public.player_progress;
begin
  if not exists (select 1 from public.chapters where id = p_chapter_id and is_published) then
    raise exception 'Kapitola neexistuje alebo nie je publikovaná' using errcode = 'P0001';
  end if;

  if public.chapter_effective_status(p_chapter_id) = 'locked' then
    raise exception 'Kapitola je ešte zamknutá' using errcode = 'P0001';
  end if;

  insert into public.player_progress (player_id, chapter_id, status, unlocked_at, last_interaction_at)
  values (auth.uid(), p_chapter_id, 'unlocked', now(), now())
  on conflict (player_id, chapter_id) do update
    set last_interaction_at = now()
  returning * into v_progress;

  return v_progress;
end;
$$;

drop function public.effective_status(text, uuid);

drop policy "chapter_map_segments: players read segments of published chapters"
  on public.chapter_map_segments;

create policy "chapter_map_segments: players read segments between visible chapters"
  on public.chapter_map_segments for select
  to authenticated
  using (
    public.chapter_is_on_map(from_chapter_id) and public.chapter_is_on_map(to_chapter_id)
  );

-- Odpoveď na otázku vráti aj kapitoly, ktoré sa ňou práve odomkli.
create or replace function public.verify_block_answer(p_block_id uuid, p_answer text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_block public.chapter_blocks;
  v_correct_answers text[];
  v_is_correct boolean;
  v_unlocked jsonb;
begin
  select * into v_block
  from public.chapter_blocks
  where id = p_block_id and block_type = 'question';

  if not found or not coalesce(public.chapter_is_accessible(v_block.chapter_id), false) then
    raise exception 'Otázka nie je dostupná' using errcode = 'P0001';
  end if;

  select correct_answers into v_correct_answers
  from public.chapter_answers
  where block_id = p_block_id;

  if v_correct_answers is null then
    raise exception 'Otázka nie je nakonfigurovaná' using errcode = 'P0001';
  end if;

  v_is_correct := public.normalize_answer(p_answer) = any (
    select public.normalize_answer(a) from unnest(v_correct_answers) as a
  );

  insert into public.player_block_progress (
    player_id, block_id, attempt_count, solved_at, last_correct
  )
  values (
    auth.uid(), p_block_id, 1, case when v_is_correct then now() end, v_is_correct
  )
  on conflict (player_id, block_id) do update
    set attempt_count = public.player_block_progress.attempt_count + 1,
        solved_at = coalesce(public.player_block_progress.solved_at, excluded.solved_at),
        last_correct = excluded.last_correct;

  select coalesce(
    jsonb_agg(jsonb_build_object('title', c.title, 'slug', c.slug) order by c.order_index),
    '[]'::jsonb
  ) into v_unlocked
  from public.chapters c
  where v_is_correct
    and c.required_block_id = p_block_id
    and public.chapter_is_accessible(c.id);

  return jsonb_build_object('correct', v_is_correct, 'unlockedChapters', v_unlocked);
end;
$$;

-- Zmazanie kapitoly adminom. Kapitoly, ktoré na ňu nadväzovali, sa napoja na
-- jej predchodcu (inak by sa hráčke rovno odomkli). Ak od otázky v tejto
-- kapitole závisí iná kapitola, zmazanie odmietne — admin musí najprv zmeniť
-- jej podmienku. Vráti cesty fotiek, ktoré má klient zmazať zo Storage.
create or replace function public.admin_delete_chapter(p_chapter_id uuid)
returns text[]
language plpgsql
security definer
set search_path = public
as $$
declare
  v_previous uuid;
  v_waiting text;
  v_paths text[];
begin
  if not public.is_admin() then
    raise exception 'Vyžaduje sa admin rola' using errcode = '42501';
  end if;

  select string_agg(d.title, ', ') into v_waiting
  from public.chapters d
  join public.chapter_blocks b on b.id = d.required_block_id
  where b.chapter_id = p_chapter_id and d.id <> p_chapter_id;

  if v_waiting is not null then
    raise exception 'Na otázku v tejto kapitole čaká kapitola „%“ — najprv jej zmeň podmienku odomknutia.', v_waiting
      using errcode = 'P0001';
  end if;

  select required_chapter_id into v_previous from public.chapters where id = p_chapter_id;

  update public.chapters
    set required_chapter_id = case when v_previous = id then null else v_previous end
    where required_chapter_id = p_chapter_id;

  select coalesce(array_agg(storage_path), '{}') into v_paths
  from public.chapter_blocks
  where chapter_id = p_chapter_id and storage_path is not null;

  delete from public.chapters where id = p_chapter_id;

  return v_paths;
end;
$$;

grant execute on function
  public.effective_status(text, uuid, uuid),
  public.chapter_effective_status(uuid),
  public.chapter_is_on_map(uuid),
  public.admin_delete_chapter(uuid)
to authenticated;
