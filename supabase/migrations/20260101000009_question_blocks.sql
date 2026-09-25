-- Otázka ako súčasť obsahu (v liste kapitoly alebo pri meste na mape), nielen
-- ako podmienka odomknutia kapitoly. Správna odpoveď je v chapter_answers
-- (block_id), overuje sa iba cez verify_block_answer().

alter table public.chapter_blocks drop constraint chapter_blocks_block_type_check;
alter table public.chapter_blocks add constraint chapter_blocks_block_type_check
  check (block_type in ('text', 'photo', 'question'));

-- question_config: { type: 'text' | 'choice', options?: string[], hint?: string,
-- successMessage?: string } — nič tajné, správna odpoveď sem nepatrí.
alter table public.chapter_blocks add column question_config jsonb;
alter table public.chapter_blocks add constraint chapter_blocks_question_has_prompt
  check (block_type <> 'question' or body_markdown is not null);

-- Zmazanie príbehu zmaže aj jeho fotky — predtým by osireli na najvyššej úrovni.
alter table public.chapter_blocks drop constraint chapter_blocks_parent_block_id_fkey;
alter table public.chapter_blocks add constraint chapter_blocks_parent_block_id_fkey
  foreign key (parent_block_id) references public.chapter_blocks (id) on delete cascade;

alter table public.chapter_answers
  add column block_id uuid references public.chapter_blocks (id) on delete cascade;
alter table public.chapter_answers add constraint chapter_answers_block_id_key unique (block_id);
alter table public.chapter_answers drop constraint chapter_answers_exactly_one_owner;
alter table public.chapter_answers add constraint chapter_answers_exactly_one_owner
  check (num_nonnulls(chapter_id, condition_id, block_id) = 1);

-- Admin potrebuje vidieť nastavenú odpoveď, aby ju vedel v editore upraviť.
-- Hráčka odpovede naďalej nevidí.
create policy "chapter_answers: admin read"
  on public.chapter_answers for select
  to authenticated
  using (public.is_admin());

create table public.player_block_progress (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references auth.users (id) on delete cascade,
  block_id uuid not null references public.chapter_blocks (id) on delete cascade,
  attempt_count integer not null default 0,
  solved_at timestamptz,

  unique (player_id, block_id)
);

comment on table public.player_block_progress is
  'Či hráčka už správne odpovedala na otázku v obsahu. Zápisy iba cez verify_block_answer().';

create index player_block_progress_player_idx on public.player_block_progress (player_id);

alter table public.player_block_progress enable row level security;

create policy "player_block_progress: self read"
  on public.player_block_progress for select
  to authenticated
  using (player_id = auth.uid());

create policy "player_block_progress: admin read all"
  on public.player_block_progress for select
  to authenticated
  using (public.is_admin());

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

  insert into public.player_block_progress (player_id, block_id, attempt_count, solved_at)
  values (auth.uid(), p_block_id, 1, case when v_is_correct then now() end)
  on conflict (player_id, block_id) do update
    set attempt_count = public.player_block_progress.attempt_count + 1,
        solved_at = coalesce(public.player_block_progress.solved_at, excluded.solved_at);

  return jsonb_build_object('correct', v_is_correct);
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

  delete from public.player_block_progress where player_id = p_player_id;
  delete from public.player_condition_progress where player_id = p_player_id;
  delete from public.player_progress where player_id = p_player_id;
  delete from public.qr_events where player_id = p_player_id;
end;
$$;

grant execute on function public.verify_block_answer(uuid, text) to authenticated;
