-- Krátke videá (so zvukom) všade, kde sa dá nahrať fotka. Ukladajú sa do
-- toho istého privátneho bucketu a platia pre ne rovnaké RLS pravidlá ako pre
-- fotky (storage_path v chapter_blocks, viditeľnosť cez block_is_visible).
-- Lokálne to isté nastavuje supabase/config.toml.
update storage.buckets
set
  file_size_limit = 50 * 1024 * 1024,
  allowed_mime_types = array[
    'image/png', 'image/jpeg', 'image/webp',
    'video/mp4', 'video/webm', 'video/quicktime'
  ]
where id = 'chapter-photos';
