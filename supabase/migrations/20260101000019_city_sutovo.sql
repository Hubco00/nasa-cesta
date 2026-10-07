-- Nové miesto na mape: Šútovo (na obrázku mapy nie je nakreslené — appka
-- k jeho guličke pridá menovku, pozri src/features/map/cities.ts).
alter table public.chapter_map_pins drop constraint chapter_map_pins_city_key_check;
alter table public.chapter_map_pins add constraint chapter_map_pins_city_key_check check (
  city_key in (
    'bratislava', 'trnava', 'puchov', 'zbynov', 'zilina',
    'vricko', 'dolny_kubin', 'sutovo', 'presov', 'kosice'
  )
);
