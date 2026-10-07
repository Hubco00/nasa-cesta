-- „Je toto, čo si mala na mysli?“ — pri písanej odpovedi, ktorú server
-- vyhodnotí ako nesprávnu, jej (ak to admin pri otázke zapol) ukáže správnu
-- odpoveď. Keď potvrdí, otázka sa počíta ako správna. Zapína sa v
-- question_config.offerCorrectAnswer (nie je tajné, je to iba nastavenie).

create or replace function public.verify_block_answer(p_block_id uuid, p_answer text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_block public.chapter_blocks;
  v_answer public.chapter_answers;
  v_is_correct boolean;
  v_unlocked jsonb;
begin
  select * into v_block
  from public.chapter_blocks
  where id = p_block_id and block_type = 'question';

  if not found or not public.block_is_visible(p_block_id) then
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

  return jsonb_build_object(
    'correct', v_is_correct,
    'unlockedChapters', v_unlocked,
    -- Správna odpoveď iba po nesprávnej, a iba ak ju admin pri otázke povolil.
    'suggestion', case
      when not v_is_correct
        and coalesce((v_block.question_config ->> 'offerCorrectAnswer')::boolean, false)
        and coalesce(v_block.question_config ->> 'type', 'text') = 'text'
      then v_answer.correct_answers[1]
    end
  );
end;
$$;

-- „Áno, toto som mala na mysli.“ Platí iba hneď po nesprávnej odpovedi na
-- otázku, pri ktorej admin ponuku správnej odpovede zapol.
create function public.accept_block_answer_suggestion(p_block_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_unlocked jsonb;
begin
  if not exists (
    select 1
    from public.chapter_blocks b
    join public.chapter_answers a on a.block_id = b.id
    where b.id = p_block_id
      and b.block_type = 'question'
      and coalesce((b.question_config ->> 'offerCorrectAnswer')::boolean, false)
      and coalesce(b.question_config ->> 'type', 'text') = 'text'
      and a.latitude is null
  ) or not public.block_is_visible(p_block_id) then
    raise exception 'Pri tejto otázke sa správna odpoveď neponúka' using errcode = 'P0001';
  end if;

  update public.player_block_progress
    set solved_at = now(), last_correct = true
    where player_id = auth.uid()
      and block_id = p_block_id
      and solved_at is null
      and last_correct = false;

  if not found then
    raise exception 'Najprv odpovedz na otázku' using errcode = 'P0001';
  end if;

  select coalesce(
    jsonb_agg(jsonb_build_object('title', c.title, 'slug', c.slug) order by c.order_index),
    '[]'::jsonb
  ) into v_unlocked
  from public.chapters c
  where c.required_block_id = p_block_id
    and public.chapter_is_accessible(c.id);

  return jsonb_build_object('correct', true, 'unlockedChapters', v_unlocked);
end;
$$;

grant execute on function public.accept_block_answer_suggestion(uuid) to authenticated;
