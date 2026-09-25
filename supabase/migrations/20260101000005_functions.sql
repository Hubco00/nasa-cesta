-- RPC funkcie: všetka herná logika (vyhodnotenie odpovede/QR/GPS, postup)
-- beží tu, nikdy iba vo frontende. Frontend nikdy nevidí správnu odpoveď,
-- QR token v plaintexte (po uložení) ani presné GPS súradnice cieľa.

create or replace function public.normalize_answer(p_answer text)
returns text
language sql
immutable
as $$
  select lower(trim(p_answer));
$$;

create or replace function public.hash_token(p_token text)
returns text
language sql
immutable
security definer
set search_path = public, extensions
as $$
  select encode(extensions.digest(p_token, 'sha256'), 'hex');
$$;

-- Zabezpečí, že hráčka má pre danú kapitolu riadok v player_progress a že
-- kapitola je pre ňu dosiahnuteľná (required_chapter_id je splnený alebo nie
-- je nastavený). Ak nie je dosiahnuteľná, vyhodí výnimku.
create or replace function public.ensure_chapter_unlocked(p_chapter_id uuid)
returns public.player_progress
language plpgsql
security definer
set search_path = public
as $$
declare
  v_chapter public.chapters;
  v_progress public.player_progress;
  v_prereq_done boolean;
begin
  select * into v_chapter from public.chapters where id = p_chapter_id and is_published;
  if not found then
    raise exception 'Kapitola neexistuje alebo nie je publikovaná' using errcode = 'P0001';
  end if;

  if v_chapter.required_chapter_id is not null then
    select exists (
      select 1 from public.player_progress
      where player_id = auth.uid()
        and chapter_id = v_chapter.required_chapter_id
        and status = 'completed'
    ) into v_prereq_done;

    if not v_prereq_done then
      raise exception 'Predchádzajúca kapitola ešte nie je splnená' using errcode = 'P0001';
    end if;
  end if;

  insert into public.player_progress (player_id, chapter_id, status, unlocked_at, last_interaction_at)
  values (auth.uid(), p_chapter_id, 'unlocked', now(), now())
  on conflict (player_id, chapter_id) do update
    set last_interaction_at = now()
  returning * into v_progress;

  return v_progress;
end;
$$;

-- Ak je kapitola typu 'combined' a všetky jej podmienky sú splnené, uzavrie
-- (status = 'completed') aj samotnú kapitolu.
create or replace function public.finalize_combined_chapter(p_chapter_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total integer;
  v_completed integer;
begin
  select count(*) into v_total
  from public.chapter_unlock_conditions
  where chapter_id = p_chapter_id;

  select count(*) into v_completed
  from public.chapter_unlock_conditions cuc
  join public.player_condition_progress pcp
    on pcp.condition_id = cuc.id and pcp.player_id = auth.uid() and pcp.status = 'completed'
  where cuc.chapter_id = p_chapter_id;

  if v_total > 0 and v_total = v_completed then
    update public.player_progress
      set status = 'completed', completed_at = now(), last_interaction_at = now()
      where player_id = auth.uid() and chapter_id = p_chapter_id and status <> 'completed';
  end if;
end;
$$;

-- Zabezpečí, že hráčka má riadok pre danú podmienku a že je na rade (všetky
-- podmienky s nižším step_order sú už splnené).
create or replace function public.ensure_condition_unlocked(p_condition_id uuid)
returns public.player_condition_progress
language plpgsql
security definer
set search_path = public
as $$
declare
  v_condition public.chapter_unlock_conditions;
  v_progress public.player_condition_progress;
  v_previous_pending integer;
begin
  select * into v_condition from public.chapter_unlock_conditions where id = p_condition_id;
  if not found then
    raise exception 'Podmienka neexistuje' using errcode = 'P0001';
  end if;

  -- Kapitola musí byť pre hráčku dosiahnuteľná (required_chapter_id splnený).
  perform public.ensure_chapter_unlocked(v_condition.chapter_id);

  select count(*) into v_previous_pending
  from public.chapter_unlock_conditions other
  left join public.player_condition_progress pcp
    on pcp.condition_id = other.id and pcp.player_id = auth.uid() and pcp.status = 'completed'
  where other.chapter_id = v_condition.chapter_id
    and other.step_order < v_condition.step_order
    and pcp.id is null;

  if v_previous_pending > 0 then
    raise exception 'Predchádzajúca podmienka ešte nie je splnená' using errcode = 'P0001';
  end if;

  insert into public.player_condition_progress (player_id, condition_id, status, unlocked_at, last_interaction_at)
  values (auth.uid(), p_condition_id, 'unlocked', now(), now())
  on conflict (player_id, condition_id) do update
    set last_interaction_at = now()
  returning * into v_progress;

  return v_progress;
end;
$$;

-- ---------------------------------------------------------------------------
-- Otázky
-- ---------------------------------------------------------------------------

create or replace function public.verify_answer(
  p_chapter_id uuid,
  p_condition_id uuid,
  p_answer text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_correct_answers text[];
  v_question_config jsonb;
  v_max_attempts integer;
  v_attempt_count integer;
  v_is_correct boolean;
  v_show_hint boolean;
begin
  if p_condition_id is not null then
    perform public.ensure_condition_unlocked(p_condition_id);

    select question_config into v_question_config
    from public.chapter_unlock_conditions
    where id = p_condition_id and condition_type = 'question';

    select correct_answers into v_correct_answers
    from public.chapter_answers where condition_id = p_condition_id;

    select attempt_count into v_attempt_count
    from public.player_condition_progress
    where player_id = auth.uid() and condition_id = p_condition_id;
  else
    perform public.ensure_chapter_unlocked(p_chapter_id);

    select question_config into v_question_config
    from public.chapters
    where id = p_chapter_id and unlock_type = 'question';

    select correct_answers into v_correct_answers
    from public.chapter_answers where chapter_id = p_chapter_id;

    select attempt_count into v_attempt_count
    from public.player_progress
    where player_id = auth.uid() and chapter_id = p_chapter_id;
  end if;

  if v_question_config is null or v_correct_answers is null then
    raise exception 'Otázka nie je nakonfigurovaná' using errcode = 'P0001';
  end if;

  v_max_attempts := (v_question_config ->> 'maxAttempts')::integer;
  v_show_hint := coalesce((v_question_config ->> 'showHintOnWrongAnswer')::boolean, true);

  if v_max_attempts is not null and v_attempt_count >= v_max_attempts then
    return jsonb_build_object(
      'correct', false,
      'attemptsExhausted', true,
      'attemptsLeft', 0,
      'showHint', false
    );
  end if;

  v_is_correct := public.normalize_answer(p_answer) = any (
    select public.normalize_answer(a) from unnest(v_correct_answers) as a
  );

  if p_condition_id is not null then
    update public.player_condition_progress
      set attempt_count = attempt_count + 1,
          status = case when v_is_correct then 'completed' else status end,
          completed_at = case when v_is_correct then now() else completed_at end,
          last_interaction_at = now()
      where player_id = auth.uid() and condition_id = p_condition_id;

    if v_is_correct then
      perform public.finalize_combined_chapter(p_chapter_id);
    end if;
  else
    update public.player_progress
      set attempt_count = attempt_count + 1,
          status = case when v_is_correct then 'completed' else status end,
          completed_at = case when v_is_correct then now() else completed_at end,
          last_interaction_at = now()
      where player_id = auth.uid() and chapter_id = p_chapter_id;
  end if;

  v_attempt_count := v_attempt_count + 1;

  return jsonb_build_object(
    'correct', v_is_correct,
    'attemptsExhausted', false,
    'attemptsLeft', case when v_max_attempts is null then null else greatest(v_max_attempts - v_attempt_count, 0) end,
    'showHint', (not v_is_correct) and v_show_hint
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- QR kódy
-- ---------------------------------------------------------------------------

create or replace function public.verify_qr(
  p_chapter_id uuid,
  p_condition_id uuid,
  p_token text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stored_hash text;
  v_is_valid boolean;
  v_target_chapter_id uuid;
begin
  if p_condition_id is not null then
    perform public.ensure_condition_unlocked(p_condition_id);

    select qr_token_hash, chapter_id into v_stored_hash, v_target_chapter_id
    from public.chapter_unlock_conditions
    where id = p_condition_id and condition_type = 'qr_code';
  else
    perform public.ensure_chapter_unlocked(p_chapter_id);
    v_target_chapter_id := p_chapter_id;

    select qr_token_hash into v_stored_hash
    from public.chapters
    where id = p_chapter_id and unlock_type = 'qr_code';
  end if;

  if v_stored_hash is null then
    raise exception 'QR kód nie je nakonfigurovaný' using errcode = 'P0001';
  end if;

  v_is_valid := public.hash_token(p_token) = v_stored_hash;

  if v_is_valid then
    insert into public.qr_events (player_id, chapter_id, condition_id)
    values (auth.uid(), case when p_condition_id is null then p_chapter_id end, p_condition_id);

    if p_condition_id is not null then
      update public.player_condition_progress
        set status = 'completed', completed_at = now(), last_interaction_at = now()
        where player_id = auth.uid() and condition_id = p_condition_id;

      perform public.finalize_combined_chapter(v_target_chapter_id);
    else
      update public.player_progress
        set status = 'completed', completed_at = now(), last_interaction_at = now()
        where player_id = auth.uid() and chapter_id = p_chapter_id;
    end if;
  end if;

  return jsonb_build_object('valid', v_is_valid);
end;
$$;

-- ---------------------------------------------------------------------------
-- GPS poloha (Haversinova formula priamo v SQL)
-- ---------------------------------------------------------------------------

create or replace function public.haversine_meters(
  lat1 double precision, lng1 double precision,
  lat2 double precision, lng2 double precision
)
returns double precision
language sql
immutable
as $$
  select 6371000 * 2 * asin(
    sqrt(
      sin(radians(lat2 - lat1) / 2) ^ 2 +
      cos(radians(lat1)) * cos(radians(lat2)) * sin(radians(lng2 - lng1) / 2) ^ 2
    )
  );
$$;

create or replace function public.verify_location(
  p_chapter_id uuid,
  p_condition_id uuid,
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
  v_target_lat double precision;
  v_target_lng double precision;
  v_radius integer;
  v_distance double precision;
  v_tolerance double precision;
  v_within_range boolean;
  v_target_chapter_id uuid;
begin
  if p_condition_id is not null then
    perform public.ensure_condition_unlocked(p_condition_id);

    select latitude, longitude, allowed_radius_meters, chapter_id
      into v_target_lat, v_target_lng, v_radius, v_target_chapter_id
    from public.chapter_unlock_conditions
    where id = p_condition_id and condition_type = 'location';
  else
    perform public.ensure_chapter_unlocked(p_chapter_id);
    v_target_chapter_id := p_chapter_id;

    select latitude, longitude, allowed_radius_meters
      into v_target_lat, v_target_lng, v_radius
    from public.chapters
    where id = p_chapter_id and unlock_type = 'location';
  end if;

  if v_target_lat is null then
    raise exception 'Poloha nie je nakonfigurovaná' using errcode = 'P0001';
  end if;

  v_distance := public.haversine_meters(p_lat, p_lng, v_target_lat, v_target_lng);
  v_tolerance := least(coalesce(p_accuracy, 0), 50);
  v_within_range := v_distance <= (v_radius + v_tolerance);

  if p_condition_id is not null then
    update public.player_condition_progress
      set attempt_count = attempt_count + 1,
          status = case when v_within_range then 'completed' else status end,
          completed_at = case when v_within_range then now() else completed_at end,
          last_interaction_at = now()
      where player_id = auth.uid() and condition_id = p_condition_id;

    if v_within_range then
      perform public.finalize_combined_chapter(v_target_chapter_id);
    end if;
  else
    update public.player_progress
      set attempt_count = attempt_count + 1,
          status = case when v_within_range then 'completed' else status end,
          completed_at = case when v_within_range then now() else completed_at end,
          last_interaction_at = now()
      where player_id = auth.uid() and chapter_id = p_chapter_id;
  end if;

  return jsonb_build_object('status', case when v_within_range then 'within_range' else 'too_far' end);
end;
$$;

-- ---------------------------------------------------------------------------
-- Manuálne kapitoly (bez ďalšej podmienky, iba potvrdenie "prečítané")
-- ---------------------------------------------------------------------------

create or replace function public.complete_manual_step(p_chapter_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_unlock_type text;
begin
  select unlock_type into v_unlock_type from public.chapters where id = p_chapter_id;

  if v_unlock_type <> 'manual' then
    raise exception 'Táto kapitola nie je typu manual' using errcode = 'P0001';
  end if;

  perform public.ensure_chapter_unlocked(p_chapter_id);

  update public.player_progress
    set status = 'completed', completed_at = now(), last_interaction_at = now()
    where player_id = auth.uid() and chapter_id = p_chapter_id;

  return jsonb_build_object('completed', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- Hráčkin prehľad postupu (na timeline obrazovku)
-- ---------------------------------------------------------------------------

-- Efektívny status kapitoly/podmienky pre hráčku: ak ešte neexistuje riadok
-- v player_progress (chapter_id sa ešte "nedotkla" žiadnou RPC funkciou),
-- vypočíta virtuálny stav namiesto natvrdo 'locked' — inak by po resete alebo
-- pre úplne novú hráčku vyzerala zamknutá aj úplne prvá kapitola bez
-- akejkoľvek podmienky.
create or replace function public.effective_status(
  p_stored_status text,
  p_required_chapter_id uuid
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
      when p_required_chapter_id is null then 'unlocked'
      when exists (
        select 1 from public.player_progress req
        where req.player_id = auth.uid()
          and req.chapter_id = p_required_chapter_id
          and req.status = 'completed'
      ) then 'unlocked'
      else 'locked'
    end
  );
$$;

-- Status jednej konkrétnej kapitoly pre aktuálnu hráčku (pre detail kapitoly,
-- ktorý sa dozvie iba slug/id, nie celý timeline).
create or replace function public.get_chapter_status(p_chapter_id uuid)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select public.effective_status(
    (
      select status from public.player_progress
      where player_id = auth.uid() and chapter_id = p_chapter_id
    ),
    (select required_chapter_id from public.chapters where id = p_chapter_id)
  );
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
  status text
)
language sql
security definer
set search_path = public
stable
as $$
  select
    c.id,
    c.title,
    c.slug,
    c.description,
    c.order_index,
    c.unlock_type,
    c.is_final,
    public.effective_status(pp.status, c.required_chapter_id)
  from public.chapters c
  left join public.player_progress pp
    on pp.chapter_id = c.id and pp.player_id = auth.uid()
  where c.is_published = true
  order by c.order_index;
$$;

-- ---------------------------------------------------------------------------
-- Admin operácie
-- ---------------------------------------------------------------------------

create or replace function public.admin_set_qr_token(
  p_chapter_id uuid,
  p_condition_id uuid,
  p_token text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Vyžaduje sa admin rola' using errcode = '42501';
  end if;

  if p_condition_id is not null then
    update public.chapter_unlock_conditions
      set qr_token_hash = public.hash_token(p_token)
      where id = p_condition_id;
  else
    update public.chapters
      set qr_token_hash = public.hash_token(p_token)
      where id = p_chapter_id;
  end if;
end;
$$;

create or replace function public.admin_set_chapter_status(
  p_player_id uuid,
  p_chapter_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Vyžaduje sa admin rola' using errcode = '42501';
  end if;

  if p_status not in ('locked', 'unlocked', 'completed') then
    raise exception 'Neplatný status';
  end if;

  insert into public.player_progress (player_id, chapter_id, status, unlocked_at, completed_at, last_interaction_at)
  values (
    p_player_id, p_chapter_id, p_status,
    case when p_status in ('unlocked', 'completed') then now() end,
    case when p_status = 'completed' then now() end,
    now()
  )
  on conflict (player_id, chapter_id) do update
    set status = p_status,
        unlocked_at = coalesce(public.player_progress.unlocked_at, case when p_status in ('unlocked', 'completed') then now() end),
        completed_at = case when p_status = 'completed' then now() else public.player_progress.completed_at end,
        last_interaction_at = now();
end;
$$;

create or replace function public.admin_reset_progress(p_player_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Vyžaduje sa admin rola' using errcode = '42501';
  end if;

  delete from public.player_condition_progress where player_id = p_player_id;
  delete from public.player_progress where player_id = p_player_id;
  delete from public.qr_events where player_id = p_player_id;
end;
$$;

-- Iba autentifikovaní používatelia (hráčka aj admin) smú tieto funkcie volať —
-- autorizácia na úrovni admin operácií sa vynucuje vnútri funkcie (is_admin()).
grant execute on function
  public.verify_answer(uuid, uuid, text),
  public.verify_qr(uuid, uuid, text),
  public.verify_location(uuid, uuid, double precision, double precision, double precision),
  public.complete_manual_step(uuid),
  public.get_my_timeline(),
  public.get_chapter_status(uuid),
  public.admin_set_qr_token(uuid, uuid, text),
  public.admin_set_chapter_status(uuid, uuid, text),
  public.admin_reset_progress(uuid)
to authenticated;
