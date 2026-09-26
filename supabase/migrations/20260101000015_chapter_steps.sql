-- Kapitola po krokoch: hlavný list kapitoly (bloky bez mesta a bez rodiča)
-- sa hráčke vydáva postupne — ďalší krok server pošle, až keď splní
-- predchádzajúci. Príbeh/fotka sa splní tlačidlom „Ďalej“ alebo až na mieste
-- (GPS), otázka správnou odpoveďou, QR kód naskenovaním. Splnenie kroku je
-- player_block_progress.solved_at. Obsah miest na mape zostáva voľný.

alter table public.chapter_blocks
  add column gate text not null default 'next' check (gate in ('next', 'location'));

comment on column public.chapter_blocks.gate is
  'Ako hráčka pokračuje po príbehu/fotke v hlavnom liste: next = tlačidlo Ďalej, location = až na mieste (súradnice v chapter_answers).';

create function public.block_step_passed(p_block_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.player_block_progress pbp
    where pbp.player_id = auth.uid()
      and pbp.block_id = p_block_id
      and pbp.solved_at is not null
  );
$$;

-- Sú splnené všetky kroky hlavného listu pred týmto blokom?
create function public.block_step_reachable(p_block_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select not exists (
    select 1
    from public.chapter_blocks b
    join public.chapter_blocks prev
      on prev.chapter_id = b.chapter_id
      and prev.map_pin_id is null
      and prev.parent_block_id is null
      and (prev.order_index, prev.id) < (b.order_index, b.id)
    where b.id = p_block_id
      and not public.block_step_passed(prev.id)
  );
$$;

-- Sú splnené všetky kroky kapitoly? (Podmienka záverečnej akcie kapitoly.)
create function public.chapter_steps_done(p_chapter_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select not exists (
    select 1
    from public.chapter_blocks b
    where b.chapter_id = p_chapter_id
      and b.map_pin_id is null
      and b.parent_block_id is null
      and not public.block_step_passed(b.id)
  );
$$;

-- Počet krokov prístupnej kapitoly — hráčka vidí „Krok 2 z 5“, nie ich obsah.
create function public.chapter_step_count(p_chapter_id uuid)
returns integer
language sql
security definer
set search_path = public
stable
as $$
  select count(*)::integer
  from public.chapter_blocks b
  where b.chapter_id = p_chapter_id
    and b.map_pin_id is null
    and b.parent_block_id is null
    and coalesce(public.chapter_is_accessible(p_chapter_id), false);
$$;

create or replace function public.block_is_visible(p_block_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  with recursive chain as (
    select
      b.id, b.parent_block_id, b.block_type, b.reveal_on, b.chapter_id, b.map_pin_id,
      0 as depth
    from public.chapter_blocks b
    where b.id = p_block_id
    union all
    select
      p.id, p.parent_block_id, p.block_type, p.reveal_on, p.chapter_id, p.map_pin_id,
      c.depth + 1
    from public.chapter_blocks p
    join chain c on p.id = c.parent_block_id
    where c.depth < 10
  )
  select coalesce(
    public.chapter_is_accessible((select chapter_id from chain where depth = 0)),
    false
  )
  and not exists (
    select 1
    from chain c
    where (
      c.reveal_on is not null
      and not exists (
        select 1
        from public.player_block_progress pbp
        where pbp.player_id = auth.uid()
          and pbp.block_id = c.parent_block_id
          and case c.reveal_on
            when 'correct' then pbp.solved_at is not null
            when 'wrong' then pbp.solved_at is null and pbp.last_correct = false
          end
      )
    )
    or (c.depth > 0 and c.block_type = 'qr' and not public.block_step_passed(c.id))
    -- Krok hlavného listu až po splnení predchádzajúcich krokov.
    or (
      c.parent_block_id is null
      and c.map_pin_id is null
      and not public.block_step_reachable(c.id)
    )
  );
$$;

-- Zapíše splnenie kroku (spoločné pre „Ďalej“ a polohu).
create function public.mark_block_step_passed(p_block_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.player_block_progress (
    player_id, block_id, attempt_count, solved_at, last_correct
  )
  values (auth.uid(), p_block_id, 1, now(), true)
  on conflict (player_id, block_id) do update
    set attempt_count = public.player_block_progress.attempt_count + 1,
        solved_at = coalesce(public.player_block_progress.solved_at, excluded.solved_at),
        last_correct = true;
$$;

-- Interná pomocná funkcia — hráčka ju nesmie volať priamo (inak by si
-- „splnila“ ľubovoľný krok bez tlačidla či polohy).
revoke execute on function public.mark_block_step_passed(uuid) from public, anon, authenticated;

-- Príbeh/fotka v hlavnom liste bez podmienky polohy — tlačidlo „Ďalej“.
create function public.complete_block_step(p_block_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.chapter_blocks
    where id = p_block_id
      and parent_block_id is null
      and map_pin_id is null
      and block_type in ('text', 'photo')
      and gate = 'next'
  ) or not public.block_is_visible(p_block_id) then
    raise exception 'Tento krok sa nedá takto dokončiť' using errcode = 'P0001';
  end if;

  perform public.mark_block_step_passed(p_block_id);
end;
$$;

-- Príbeh/fotka, za ktorými sa pokračuje až na mieste. Poloha sa iba porovná,
-- nikam sa neukladá. Pri neúspechu vráti hrubú vzdialenosť ako nápovedu.
create function public.verify_block_location(
  p_block_id uuid,
  p_lat double precision,
  p_lng double precision,
  p_accuracy double precision
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_answer public.chapter_answers;
  v_distance double precision;
  v_within boolean;
begin
  if not exists (
    select 1
    from public.chapter_blocks
    where id = p_block_id
      and parent_block_id is null
      and map_pin_id is null
      and block_type in ('text', 'photo')
      and gate = 'location'
  ) or not public.block_is_visible(p_block_id) then
    raise exception 'Tento krok sa nedá takto dokončiť' using errcode = 'P0001';
  end if;

  if p_lat is null or p_lng is null
    or p_lat not between -90 and 90 or p_lng not between -180 and 180 then
    raise exception 'Neplatná poloha' using errcode = 'P0001';
  end if;

  select * into v_answer from public.chapter_answers where block_id = p_block_id;
  if v_answer.latitude is null then
    raise exception 'Miesto nie je nastavené' using errcode = 'P0001';
  end if;

  v_distance := public.haversine_meters(p_lat, p_lng, v_answer.latitude, v_answer.longitude);
  -- Nepresné GPS (napr. v meste medzi domami) sa zohľadní do 100 m navyše.
  v_within := v_distance <= v_answer.radius_meters + least(greatest(coalesce(p_accuracy, 0), 0), 100);

  if v_within then
    perform public.mark_block_step_passed(p_block_id);
  end if;

  return jsonb_build_object(
    'status', case when v_within then 'within_range' else 'too_far' end,
    'distanceMeters', case
      when v_within then null
      when v_distance < 1000 then round(v_distance / 50) * 50
      when v_distance < 10000 then round(v_distance / 100) * 100
      else round(v_distance / 1000) * 1000
    end
  );
end;
$$;

-- Záverečná akcia kapitoly (Pokračovať, otázka, QR, GPS kapitoly) až po
-- všetkých krokoch.
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

  if not public.chapter_steps_done(p_chapter_id) then
    raise exception 'Najprv prejdi všetky kroky kapitoly' using errcode = 'P0001';
  end if;

  insert into public.player_progress (player_id, chapter_id, status, unlocked_at, last_interaction_at)
  values (auth.uid(), p_chapter_id, 'unlocked', now(), now())
  on conflict (player_id, chapter_id) do update
    set last_interaction_at = now()
  returning * into v_progress;

  return v_progress;
end;
$$;

grant execute on function
  public.block_step_passed(uuid),
  public.block_step_reachable(uuid),
  public.chapter_steps_done(uuid),
  public.chapter_step_count(uuid),
  public.complete_block_step(uuid),
  public.verify_block_location(uuid, double precision, double precision, double precision)
to authenticated;
