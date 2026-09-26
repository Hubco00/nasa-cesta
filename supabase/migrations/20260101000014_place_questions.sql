-- Otázka s odpoveďou „miesto na mape“: hráčka ťukne na miesto na skutočnej
-- mape a server overí, či je v nastavenej tolerancii od správneho miesta.
-- Súradnice správneho miesta sú v chapter_answers — hráčka ich nevidí, dostane
-- iba výsledok (a pri zlej odpovedi zaokrúhlenú vzdialenosť ako nápovedu).

alter table public.chapter_answers
  add column latitude double precision,
  add column longitude double precision,
  add column radius_meters integer;

alter table public.chapter_answers add constraint chapter_answers_place_complete
  check (num_nulls(latitude, longitude, radius_meters) in (0, 3));

alter table public.chapter_answers add constraint chapter_answers_place_valid check (
  latitude is null
  or (
    latitude between -90 and 90
    and longitude between -180 and 180
    and radius_meters between 10 and 100000
  )
);

create or replace function public.verify_block_place(
  p_block_id uuid,
  p_lat double precision,
  p_lng double precision
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_answer public.chapter_answers;
  v_distance double precision;
  v_is_correct boolean;
  v_unlocked jsonb;
begin
  if not exists (
    select 1 from public.chapter_blocks where id = p_block_id and block_type = 'question'
  ) or not public.block_is_visible(p_block_id) then
    raise exception 'Otázka nie je dostupná' using errcode = 'P0001';
  end if;

  if p_lat is null or p_lng is null
    or p_lat not between -90 and 90 or p_lng not between -180 and 180 then
    raise exception 'Neplatné miesto' using errcode = 'P0001';
  end if;

  select * into v_answer from public.chapter_answers where block_id = p_block_id;

  if v_answer.latitude is null then
    raise exception 'Otázka nie je nakonfigurovaná' using errcode = 'P0001';
  end if;

  v_distance := public.haversine_meters(p_lat, p_lng, v_answer.latitude, v_answer.longitude);
  v_is_correct := v_distance <= v_answer.radius_meters;

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

  return jsonb_build_object(
    'correct', v_is_correct,
    -- Iba hrubá nápoveda „teplo/zima“, nie presná poloha cieľa.
    'distanceMeters', case
      when v_is_correct then null
      when v_distance < 1000 then round(v_distance / 50) * 50
      when v_distance < 10000 then round(v_distance / 100) * 100
      else round(v_distance / 1000) * 1000
    end,
    'unlockedChapters', v_unlocked
  );
end;
$$;

-- Textová otázka teraz rešpektuje aj vetvu predkov (otázka pod QR kódom sa
-- nedá zodpovedať pred naskenovaním) a odmietne otázku, na ktorú sa odpovedá
-- miestom na mape.
create or replace function public.verify_block_answer(p_block_id uuid, p_answer text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_answer public.chapter_answers;
  v_is_correct boolean;
  v_unlocked jsonb;
begin
  if not exists (
    select 1 from public.chapter_blocks where id = p_block_id and block_type = 'question'
  ) or not public.block_is_visible(p_block_id) then
    raise exception 'Otázka nie je dostupná' using errcode = 'P0001';
  end if;

  select * into v_answer from public.chapter_answers where block_id = p_block_id;

  if v_answer.latitude is not null then
    raise exception 'Na túto otázku sa odpovedá miestom na mape' using errcode = 'P0001';
  end if;

  if v_answer.correct_answers is null or cardinality(v_answer.correct_answers) = 0 then
    raise exception 'Otázka nie je nakonfigurovaná' using errcode = 'P0001';
  end if;

  v_is_correct := public.normalize_answer(p_answer) = any (
    select public.normalize_answer(a) from unnest(v_answer.correct_answers) as a
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

grant execute on function
  public.verify_block_place(uuid, double precision, double precision)
to authenticated;
