-- Profily hráčov/adminov. Riadok sa vytvorí automaticky pri registrácii cez
-- Supabase Auth (trigger na auth.users), rola je defaultne 'player'.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text,
  role text not null default 'player' check (role in ('player', 'admin')),
  created_at timestamptz not null default now()
);

comment on table public.profiles is 'Verejný profil pre každého Auth používateľa vrátane role (player/admin).';

create index profiles_role_idx on public.profiles (role);

-- Automatické vytvorenie profilu pri registrácii nového používateľa.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'display_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;

-- Hráč vidí iba svoj vlastný profil, admin vidí všetky (potrebné napr. pre
-- zoznam hráčok v admin rozhraní / zobrazenie postupu).
create policy "profiles: self read"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

create policy "profiles: admin read all"
  on public.profiles for select
  to authenticated
  using (public.is_admin());

create policy "profiles: self update"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Rolu nesmie zmeniť nikto cez bežné API volanie (ani admin cez klienta) —
-- iba manuálne v databáze / cez service_role. Bráni to hráčke povýšiť sa na
-- admina jednoduchým UPDATE-om vlastného profilu.
create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
as $$
begin
  if new.role is distinct from old.role and auth.role() <> 'service_role' then
    new.role = old.role;
  end if;
  return new;
end;
$$;

create trigger profiles_prevent_role_escalation
  before update on public.profiles
  for each row execute function public.prevent_role_escalation();
