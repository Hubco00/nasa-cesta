-- Rozšírenia a pomocné funkcie používané naprieč celou schémou.

create extension if not exists pgcrypto with schema extensions;

-- Generická funkcia na automatickú aktualizáciu stĺpca `updated_at`.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- `is_admin()` centralizuje kontrolu admin role pre RLS politiky a RPC funkcie.
-- SECURITY DEFINER + `set search_path` zabránia rekurzii RLS na `profiles`
-- (politiky na `profiles` by inak volali samé seba) a hijackingu search_path.
--
-- `language plpgsql` je tu zámerné (nie `sql`): telo `language sql` funkcie sa
-- plánuje hneď pri CREATE FUNCTION, čo by zlyhalo, keďže tabuľka
-- `public.profiles` vznikne až v nasledujúcej migrácii. plpgsql telo sa
-- validuje až pri prvom volaní.
create or replace function public.is_admin()
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
end;
$$;

comment on function public.is_admin() is
  'Vráti true, ak je aktuálne prihlásený používateľ admin. Používa sa v RLS politikách a RPC funkciách.';
