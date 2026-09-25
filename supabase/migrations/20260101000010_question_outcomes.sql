-- Odpoveď na otázku formou listu (+ voliteľná fotka ako odmena) — zvlášť pre
-- správnu a nesprávnu odpoveď. Je to bežný textový blok pod otázkou
-- (parent_block_id = otázka) s nastaveným `reveal_on`. Hráčka ho uvidí až
-- po odpovedi, ktorú server overí — inak by list po správnej odpovedi
-- prezradil odpoveď ešte pred odpovedaním.

alter table public.chapter_blocks
  add column reveal_on text check (reveal_on in ('correct', 'wrong'));

alter table public.chapter_blocks add constraint chapter_blocks_reveal_needs_parent
  check (reveal_on is null or parent_block_id is not null);

create unique index chapter_blocks_one_outcome_per_result
  on public.chapter_blocks (parent_block_id, reveal_on)
  where reveal_on is not null;

-- Výsledok posledného pokusu — "nesprávny" list sa ukazuje iba kým otázka nie
-- je vyriešená a posledná odpoveď bola zlá.
alter table public.player_block_progress add column last_correct boolean;

create or replace function public.block_is_visible(p_block_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(public.chapter_is_accessible(b.chapter_id), false)
    and (
      b.reveal_on is null
      or exists (
        select 1
        from public.player_block_progress pbp
        where pbp.player_id = auth.uid()
          and pbp.block_id = b.parent_block_id
          and case b.reveal_on
            when 'correct' then pbp.solved_at is not null
            when 'wrong' then pbp.solved_at is null and pbp.last_correct = false
          end
      )
    )
  from public.chapter_blocks b
  where b.id = p_block_id;
$$;

grant execute on function public.block_is_visible(uuid) to authenticated;

drop policy "chapter_blocks: players read blocks of accessible chapters"
  on public.chapter_blocks;

create policy "chapter_blocks: players read visible blocks"
  on public.chapter_blocks for select
  to authenticated
  using (public.block_is_visible(chapter_blocks.id));

drop policy "chapter-photos: players read photos of accessible chapters" on storage.objects;

create policy "chapter-photos: players read photos of visible blocks"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'chapter-photos'
    and exists (
      select 1
      from public.chapter_blocks cb
      where cb.storage_path = storage.objects.name
        and public.block_is_visible(cb.id)
    )
  );

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

  return jsonb_build_object('correct', v_is_correct);
end;
$$;
