-- QR kód ako súčasť obsahu (v liste kapitoly alebo pri meste na mape). Admin
-- k nemu pripojí príbehy, fotky a otázky (deti cez parent_block_id) — hráčka
-- ich uvidí až po naskenovaní správneho QR kódu, ktorý overí server. Token sa
-- ukladá iba ako hash, rovnako ako pri QR odomknutí kapitoly.

alter table public.chapter_blocks drop constraint chapter_blocks_block_type_check;
alter table public.chapter_blocks add constraint chapter_blocks_block_type_check
  check (block_type in ('text', 'photo', 'question', 'qr'));

alter table public.chapter_blocks add constraint chapter_blocks_qr_top_level
  check (block_type <> 'qr' or parent_block_id is null);

create table public.chapter_block_qr_tokens (
  block_id uuid primary key references public.chapter_blocks (id) on delete cascade,
  token_hash text not null,
  created_at timestamptz not null default now()
);

comment on table public.chapter_block_qr_tokens is
  'SHA-256 hash tokenu QR bloku — nikdy plaintext. Zápis iba cez admin_set_block_qr_token().';

alter table public.chapter_block_qr_tokens enable row level security;

-- Admin potrebuje vedieť, či je QR kód nastavený. Hráčka tabuľku nevidí.
create policy "chapter_block_qr_tokens: admin read"
  on public.chapter_block_qr_tokens for select
  to authenticated
  using (public.is_admin());

alter table public.qr_events
  add column block_id uuid references public.chapter_blocks (id) on delete cascade;
alter table public.qr_events drop constraint qr_events_exactly_one_target;
alter table public.qr_events add constraint qr_events_exactly_one_target
  check (num_nonnulls(chapter_id, condition_id, block_id) = 1);

-- Viditeľnosť bloku teraz kontroluje celú vetvu predkov: obsah pod QR kódom
-- (aj fotky príbehu pod ním) až po naskenovaní, list pod otázkou až po odpovedi.
create or replace function public.block_is_visible(p_block_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  with recursive chain as (
    select b.id, b.parent_block_id, b.block_type, b.reveal_on, b.chapter_id, 0 as depth
    from public.chapter_blocks b
    where b.id = p_block_id
    union all
    select p.id, p.parent_block_id, p.block_type, p.reveal_on, p.chapter_id, c.depth + 1
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
    or (
      c.depth > 0
      and c.block_type = 'qr'
      and not exists (
        select 1
        from public.player_block_progress pbp
        where pbp.player_id = auth.uid()
          and pbp.block_id = c.id
          and pbp.solved_at is not null
      )
    )
  );
$$;

create or replace function public.verify_block_qr(p_block_id uuid, p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stored_hash text;
  v_is_valid boolean;
begin
  if not exists (
    select 1 from public.chapter_blocks where id = p_block_id and block_type = 'qr'
  ) or not public.block_is_visible(p_block_id) then
    raise exception 'QR kód nie je dostupný' using errcode = 'P0001';
  end if;

  select token_hash into v_stored_hash
  from public.chapter_block_qr_tokens
  where block_id = p_block_id;

  if v_stored_hash is null then
    raise exception 'QR kód nie je nakonfigurovaný' using errcode = 'P0001';
  end if;

  -- Niektoré čítačky pridajú na koniec znak nového riadka.
  v_is_valid := public.hash_token(btrim(p_token, E' \t\r\n')) = v_stored_hash;

  insert into public.player_block_progress (
    player_id, block_id, attempt_count, solved_at, last_correct
  )
  values (
    auth.uid(), p_block_id, 1, case when v_is_valid then now() end, v_is_valid
  )
  on conflict (player_id, block_id) do update
    set attempt_count = public.player_block_progress.attempt_count + 1,
        solved_at = coalesce(public.player_block_progress.solved_at, excluded.solved_at),
        last_correct = excluded.last_correct;

  if v_is_valid then
    insert into public.qr_events (player_id, block_id) values (auth.uid(), p_block_id);
  end if;

  return jsonb_build_object('valid', v_is_valid);
end;
$$;

create or replace function public.admin_set_block_qr_token(p_block_id uuid, p_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Vyžaduje sa admin rola' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.chapter_blocks where id = p_block_id and block_type = 'qr'
  ) then
    raise exception 'QR blok neexistuje' using errcode = 'P0001';
  end if;

  insert into public.chapter_block_qr_tokens (block_id, token_hash)
  values (p_block_id, public.hash_token(p_token))
  on conflict (block_id) do update
    set token_hash = excluded.token_hash, created_at = now();
end;
$$;

grant execute on function
  public.verify_block_qr(uuid, text),
  public.admin_set_block_qr_token(uuid, text)
to authenticated;
