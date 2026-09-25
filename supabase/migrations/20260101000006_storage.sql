-- Privátny bucket pre fotografie kapitol. Vytvorený aj cez migráciu (nie iba
-- cez local config.toml), aby sa rovnaká štruktúra dala reprodukovať aj na
-- ostrom Supabase projekte spustením migrácií.
insert into storage.buckets (id, name, public)
values ('chapter-photos', 'chapter-photos', false)
on conflict (id) do nothing;

create policy "chapter-photos: admin manage"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'chapter-photos' and public.is_admin())
  with check (bucket_id = 'chapter-photos' and public.is_admin());

-- Hráčka smie čítať (na účely krátkodobých signed URLs) iba fotografie
-- patriace k už publikovaným kapitolám.
create policy "chapter-photos: players read published chapter photos"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'chapter-photos'
    and exists (
      select 1
      from public.chapter_images ci
      join public.chapters c on c.id = ci.chapter_id
      where ci.storage_path = storage.objects.name and c.is_published
    )
  );
