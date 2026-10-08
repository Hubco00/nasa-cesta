-- Admin si v náhľade appky môže vyskúšať otázky, QR kódy a kroky s polohou
-- v ľubovoľnej kapitole. Doteraz ich server odmietol („Odpoveď sa nepodarilo
-- overiť“), lebo admin predchádzajúce kroky ako hráčka nesplnil. Čítať všetko
-- mohol admin už predtým (RLS), toto sa týka iba overovacích funkcií.

create or replace function public.block_is_visible(p_block_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  -- Admin v náhľade môže skúšať všetko (odpovedať, skenovať, overiť polohu)
  -- bez toho, aby prechádzal kroky ako hráčka. Pre hráčku sa nič nemení.
  select case
    when public.is_admin() then exists (
      select 1 from public.chapter_blocks where id = p_block_id
    )
    else (
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
    )
    )
  end;
$$;
