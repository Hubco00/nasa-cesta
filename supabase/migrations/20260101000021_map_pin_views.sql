-- Ktoré miesta na mape hráčka už otvorila (notifikačné guličky a číslo pri
-- tlačidle Mapa). Doteraz iba v localStorage zariadenia — reset postupu ich
-- preto nevynuloval a preklikanie na inom zariadení sa nepreniesla.

create table public.player_map_pin_views (
  player_id uuid not null references auth.users (id) on delete cascade,
  pin_id uuid not null references public.chapter_map_pins (id) on delete cascade,
  seen_at timestamptz not null default now(),
  primary key (player_id, pin_id)
);

comment on table public.player_map_pin_views is
  'Otvorené miesta na mape. Zápis iba cez mark_map_pin_seen().';

create index player_map_pin_views_pin_idx on public.player_map_pin_views (pin_id);

alter table public.player_map_pin_views enable row level security;

create policy "player_map_pin_views: self read"
  on public.player_map_pin_views for select
  to authenticated
  using (player_id = auth.uid());

create policy "player_map_pin_views: admin read all"
  on public.player_map_pin_views for select
  to authenticated
  using (public.is_admin());

create function public.mark_map_pin_seen(p_pin_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.player_map_pin_views (player_id, pin_id)
  select auth.uid(), p_pin_id
  where auth.uid() is not null
  on conflict do nothing;
$$;

grant execute on function public.mark_map_pin_seen(uuid) to authenticated;

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
  delete from public.player_map_pin_views where player_id = p_player_id;
end;
$$;
