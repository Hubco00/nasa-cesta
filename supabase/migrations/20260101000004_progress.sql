-- Postup hráčky. Riadok pre danú kapitolu vzniká až vo chvíli, keď sa stane
-- dosiahnuteľnou (require_chapter_id splnený) — chýbajúci riadok = 'locked'.
-- Zápisy robia výhradne SECURITY DEFINER RPC funkcie, nikdy priamy klientský
-- INSERT/UPDATE (viď RLS nižšie) — bráni to hráčke podvodne si nastaviť
-- vlastný postup.

create table public.player_progress (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references auth.users (id) on delete cascade,
  chapter_id uuid not null references public.chapters (id) on delete cascade,
  status text not null default 'locked' check (status in ('locked', 'unlocked', 'completed')),
  attempt_count integer not null default 0,
  unlocked_at timestamptz,
  completed_at timestamptz,
  last_interaction_at timestamptz not null default now(),

  unique (player_id, chapter_id)
);

comment on table public.player_progress is 'Postup hráčky naprieč kapitolami. Zápisy iba cez RPC funkcie.';

create index player_progress_player_idx on public.player_progress (player_id);
create index player_progress_chapter_idx on public.player_progress (chapter_id);

create table public.player_condition_progress (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references auth.users (id) on delete cascade,
  condition_id uuid not null references public.chapter_unlock_conditions (id) on delete cascade,
  status text not null default 'locked' check (status in ('locked', 'unlocked', 'completed')),
  attempt_count integer not null default 0,
  unlocked_at timestamptz,
  completed_at timestamptz,
  last_interaction_at timestamptz not null default now(),

  unique (player_id, condition_id)
);

comment on table public.player_condition_progress is
  'Postup hráčky pri jednotlivých podmienkach kapitoly s unlock_type = combined.';

create index player_condition_progress_player_idx on public.player_condition_progress (player_id);
create index player_condition_progress_condition_idx on public.player_condition_progress (condition_id);

-- Záznam o úspešnom naskenovaní QR kódu. Slúži ako ochrana proti opakovanému
-- spracovaniu toho istého kódu a ako jednoduchý audit trail. Žiadna GPS
-- história sa tu (ani nikde inde) neukladá.
create table public.qr_events (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references auth.users (id) on delete cascade,
  chapter_id uuid references public.chapters (id) on delete cascade,
  condition_id uuid references public.chapter_unlock_conditions (id) on delete cascade,
  created_at timestamptz not null default now(),

  constraint qr_events_exactly_one_target check (
    (chapter_id is null) <> (condition_id is null)
  )
);

comment on table public.qr_events is 'Audit log úspešných QR skenovaní. Bez GPS histórie.';

create index qr_events_player_idx on public.qr_events (player_id);

alter table public.player_progress enable row level security;
alter table public.player_condition_progress enable row level security;
alter table public.qr_events enable row level security;

-- Hráčka vidí iba svoj vlastný postup, žiadny priamy zápis (INSERT/UPDATE)
-- nie je povolený — všetko ide cez RPC funkcie s SECURITY DEFINER.
create policy "player_progress: self read"
  on public.player_progress for select
  to authenticated
  using (player_id = auth.uid());

create policy "player_progress: admin read all"
  on public.player_progress for select
  to authenticated
  using (public.is_admin());

create policy "player_condition_progress: self read"
  on public.player_condition_progress for select
  to authenticated
  using (player_id = auth.uid());

create policy "player_condition_progress: admin read all"
  on public.player_condition_progress for select
  to authenticated
  using (public.is_admin());

create policy "qr_events: self read"
  on public.qr_events for select
  to authenticated
  using (player_id = auth.uid());

create policy "qr_events: admin read all"
  on public.qr_events for select
  to authenticated
  using (public.is_admin());
