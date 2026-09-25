# Naša cesta

Romantický interaktívny príbeh/quest — postupné odomykanie kapitol cez text,
fotografie, otázky, QR kódy a GPS overenie polohy.

**Stav projektu:** funkčné MVP — hráčska časť (timeline, kapitoly, otázky, QR,
GPS) aj admin rozhranie (tvorba príbehu, fotky, QR generátor, správa hráčok)
fungujú proti lokálnemu Supabase. Chýba už iba založenie produkčného
Supabase projektu a pripojenie na Cloudflare Pages. Detaily v sekcii
[Stav implementácie](#stav-implementácie) nižšie.

## Technológie

React 19 · TypeScript · Vite · Tailwind CSS v4 · React Router · Supabase
(Auth/Postgres/Storage/RLS) · html5-qrcode (skenovanie) · qrcode (generovanie
pre admina) · marked + DOMPurify (bezpečný Markdown) · PWA (vite-plugin-pwa)
· Vitest · ESLint · Prettier.

## Lokálne spustenie

Požiadavky: Node.js 20+ (odporúčané 22 — `nvm use` si verziu načíta z `.nvmrc`) a npm.

```bash
npm install
cp .env.example .env.local
# do .env.local doplň VITE_SUPABASE_URL a VITE_SUPABASE_ANON_KEY
npm run dev
```

Aplikácia beží na `http://localhost:5173`.

Bez nastavených Supabase premenných appka nespadne — beží v obmedzenom
dev režime (prihlásenie nebude fungovať, v konzole uvidíš varovanie). Návod
na Supabase konfiguráciu je nižšie.

### Dostupné skripty

| Príkaz                     | Popis                                                          |
| -------------------------- | -------------------------------------------------------------- |
| `npm run dev`              | vývojový server s HMR                                          |
| `npm run build`            | typecheck + produkčný build do `dist/`                         |
| `npm run preview`          | lokálny náhľad produkčného buildu                              |
| `npm run typecheck`        | TypeScript kontrola bez buildu                                 |
| `npm run lint`             | ESLint                                                         |
| `npm run format`           | Prettier — automatická oprava                                  |
| `npm run format:check`     | Prettier — iba kontrola                                        |
| `npm run test`             | Vitest — unit testy (jednorazovo)                              |
| `npm run test:watch`       | Vitest vo watch režime                                         |
| `npm run test:integration` | Testy proti lokálnemu Supabase (vyžaduje `npx supabase start`) |

## Supabase konfigurácia

### Lokálny vývoj (Docker)

Vyžaduje Docker (Desktop alebo Engine).

```bash
npx supabase start   # prvýkrát stiahne images, potom naštartuje lokálny stack
```

Vypíše lokálne URL a kľúče (API URL, anon key, service_role key, Studio URL).
Skopíruj `API URL` a `anon key` do `.env.local`:

```bash
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<anon key z výstupu supabase start>
```

Migrácie z `supabase/migrations/` a dáta z `supabase/seed.sql` sa aplikujú
automaticky. Studio (admin UI nad databázou) beží na `http://127.0.0.1:54323`.

Seedované testovacie účty (**iba lokálny dev, nikdy takto na produkcii**):

| Rola   | E-mail               | Heslo              |
| ------ | -------------------- | ------------------ |
| admin  | `admin@example.com`  | `local-dev-admin`  |
| player | `player@example.com` | `local-dev-player` |

Užitočné príkazy:

```bash
npx supabase stop            # zastaví lokálny stack
npm run db:reset             # zahodí lokálnu DB, aplikuje migrácie + seed a nahrá seed fotku
npx supabase gen types typescript --local > src/types/database.ts
```

### Produkčný Supabase projekt

1. Vytvor projekt na [supabase.com](https://supabase.com) (free tier stačí).
2. V **Project Settings → API** skopíruj `Project URL` a `anon public` kľúč
   do produkčných environment variables (pozri sekciu Cloudflare Pages nižšie).
   **`service_role` kľúč nikde vo frontende ani v gite nepoužívaj.**
3. Prepoj CLI s projektom a nasaď migrácie:
   ```bash
   npx supabase link --project-ref <project-ref>
   npx supabase db push
   ```
   (`supabase/seed.sql` sa na `db push` nespúšťa — obsahuje testovacie
   `auth.users` určené iba pre lokálny dev. Ukážkové kapitoly si over/priprav
   cez admin rozhranie po nasadení.)
4. V **Storage** skontroluj, že vznikol privátny bucket `chapter-photos`
   (vytvára ho migrácia `20260101000006_storage.sql`).

### Vytvorenie admin používateľa (produkcia)

Auth používateľov na hostovanom projekte nikdy nevytváraj priamym SQL
insertom do `auth.users` — iba cez Supabase Auth:

1. Zaregistruj sa v appke bežným spôsobom (alebo cez Dashboard →
   Authentication → Add user). Vznikne profil s rolou `player`.
2. V **SQL Editor** spusti (nahraď e-mail):
   ```sql
   update public.profiles set role = 'admin' where email = 'tvoj@email.sk';
   ```

## Cloudflare Pages deployment

1. Choď na [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages
   → Create → Pages → Connect to Git** a vyber repozitár
   `github.com/Hubco00/nasa-cesta`.
2. Build nastavenia:
   - Framework preset: `Vite` (alebo `None`, ak preset chýba)
   - Build command: `npm run build`
   - Build output directory: `dist`
3. **Environment variables** (Settings → Environment variables, pre Production
   aj Preview):
   - `VITE_SUPABASE_URL` — URL produkčného Supabase projektu
   - `VITE_SUPABASE_ANON_KEY` — `anon public` kľúč
   - `service_role` kľúč sem **nikdy** nepatrí.
4. Deploy. Cloudflare Pages dáva appke HTTPS automaticky — potrebné pre
   Geolocation API aj prístup ku kamere.
5. Keďže appka má byť prekvapenie, over si v **Settings → Builds & deployments**,
   že preview URL adresy nie sú nikde verejne zdieľané. Produkčná URL má už
   `<meta name="robots" content="noindex, nofollow">` (`index.html`) a appka je
   za loginom, takže náhodný návštevník aj tak nič neuvidí.
6. Pri každom `git push` na `main` sa appka automaticky znova nasadí.

## Checklist pred odovzdaním

- [ ] Produkčný Supabase projekt založený, migrácie nasadené (`npx supabase db push`)
- [ ] Storage bucket `chapter-photos` existuje a je **privátny**
- [ ] Aspoň jeden admin účet vytvorený a otestovaný (prihlásenie + `/admin`)
- [ ] Všetky kapitoly vytvorené, obsah (text/fotky) naplnený cez admin panel
- [ ] Finálna kapitola (`is_final`) nastavená a otestovaná až na koniec
- [ ] QR kódy vygenerované, stiahnuté/vytlačené a fyzicky umiestnené
- [ ] GPS súradnice a rádius pre lokačné kapitoly overené priamo na mieste
      (nie len teoreticky — mobilná GPS presnosť sa líši)
- [ ] `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` nastavené v Cloudflare Pages
- [ ] Appka otvorená na reálnom mobile (nie len desktop browser), skontrolovať:
  - povolenie kamery pre QR skener
  - povolenie polohy pre GPS
  - pridanie na plochu (PWA) funguje
  - svetlý aj tmavý režim vyzerá dobre
- [ ] `npm run build` prechádza bez chýb, `npm run test` a `npm run test:integration` zelené
- [ ] Preview/produkčná URL appky nie je nikde predčasne zdieľaná

## Štruktúra projektu

```text
src/
  app/          # router, root App komponent
  components/   # zdieľané UI komponenty (Layout, ...)
  features/     # doménová logika (auth, chapters, qr-scanner, geolocation, ...)
  hooks/        # zdieľané React hooky
  lib/          # supabase klient, geo výpočty, validácia, security helpery
  pages/        # route-level stránky
  styles/       # Tailwind vstupný súbor + tokeny
  test/         # test setup
supabase/
  migrations/   # SQL migrácie
  functions/    # Supabase Edge Functions (ak budú potrebné)
```

## Stav implementácie

**Hotovo (Fáza 1 — projekt a základ):**

- Vite + React + TypeScript + Tailwind v4 scaffold
- React Router (redirect `/` → `/chapters`, `/login`, catch-all 404)
- ESLint (flat config) + Prettier, oboje bez chýb/warningov
- Vitest + Testing Library nastavené a funkčné
- Supabase klient s dev fallbackom (appka nespadne bez env premenných)
- `AuthProvider` (Supabase session) + `RequireAuth` route guard (presmerovanie
  neprihláseného používateľa na `/login`) — s testami
- Základný `Layout` a `LoginPage` (funkčné prihlásenie cez
  `supabase.auth.signInWithPassword`, zatiaľ bez reálneho Supabase projektu)
- `lib/geo.ts` — Haversinova formula + `checkLocation` s toleranciou GPS
  presnosti — s testami
- PWA manifest (vite-plugin-pwa), ikony, `robots: noindex` (appka nemá byť
  indexovaná pred prekvapením)
- `.env.example`, `.gitignore`, git repozitár na GitHub
  (`github.com/Hubco00/nasa-cesta`)

**Hotovo (Fáza 2 — databáza a autentifikácia):**

- SQL migrácie (`supabase/migrations/`): `profiles` (role player/admin,
  auto-vytvorenie cez trigger, ochrana proti self-role-escalation),
  `chapters` + `chapter_unlock_conditions` (rozšíriteľný model pre
  `unlock_type = combined`), `chapter_images`, `chapter_answers` (správne
  odpovede mimo dosahu klienta), `player_progress`,
  `player_condition_progress`, `qr_events`, privátny Storage bucket
  `chapter-photos`
- RLS politiky na všetkých tabuľkách: hráčka vidí iba vlastný postup a
  publikované kapitoly (cez `chapters_player_view`, bez `qr_token_hash` a GPS
  súradníc), admin (`is_admin()`) má plný prístup, žiadny priamy klientský
  zápis do `player_progress`/`qr_events`
- RPC funkcie (SECURITY DEFINER): `verify_answer`, `verify_qr`,
  `verify_location` (Haversine v SQL), `complete_manual_step`,
  `get_my_timeline`, `admin_set_qr_token`, `admin_set_chapter_status`,
  `admin_reset_progress` — správna odpoveď/QR token/GPS súradnice sa nikdy
  neposielajú do frontendu
- `RequireAdmin` route guard (`/admin`) + `useProfile` hook — s testami
- Vygenerované TS typy zo skutočnej schémy (`src/types/database.ts`),
  zapojené do `lib/supabase.ts`
- `supabase/seed.sql`: testovací admin/hráč účet (lokálne heslá), 5 ukážkových
  kapitol (manual/question/qr_code/location/manual-final)
- **Integračné testy proti reálne bežiacemu lokálnemu Supabase**
  (`npm run test:integration`, 9 testov): nepublikovaná kapitola sa
  nezobrazí, priamy zápis do `player_progress`/SELECT na `chapters` je
  zablokovaný, admin RPC operácie hráčka nezavolá, nesprávna/správna odpoveď,
  neplatný/platný QR token, GPS too_far/within_range

**Hotovo (Fáza 3 — hráčska časť):**

- `chapter_blocks`: chronologický a voliteľne vnorený (`parent_block_id`)
  obsah kapitoly — text a fotky s popiskom, nahrádza pôvodnú plochú
  `chapter_images`. Admin vie príbeh dopĺňať postupne (najprv text, neskôr
  k nemu pripojí fotku, potom ďalšia udalosť)
- `/chapters` — reálny timeline cez `get_my_timeline()`, `/chapters/:slug` —
  detail kapitoly s rekurzívnym renderom blokov, sanitizovaným Markdownom
  (`marked` + `DOMPurify`) a jemnou fade-in animáciou
- Fotky sa načítavajú cez krátkodobé signed URLs (súkromný bucket)
- Otázky: `QuestionForm` (voľná odpoveď aj multiple-choice, nápoveda pri
  zlej odpovedi, počítadlo pokusov)

**Hotovo (Fáza 4 — QR a GPS):**

- `QrScannerView`/`QrChapterUnlock` (`html5-qrcode`): kamera sa vyžiada až po
  otvorení skenera, zrozumiteľná správa pri zamietnutí, blokovanie
  opakovaného spracovania rovnakého kódu, token sa overuje výhradne cez RPC
- `LocationCheck` (`useGeolocation`): iba stavy „Príliš ďaleko / Si na
  správnom mieste / Poloha sa nepodarila zistiť“ — nikdy žiadne súradnice v
  UI, tlačidlo „Skontrolovať znova“
- `combined` unlock: `CombinedConditions` vedie hráčku podmienkami v poradí
  (napr. najprv GPS, potom otázka)
- Oba (QR aj GPS) sú code-splitnuté (`React.lazy`) — do hlavného bundlu sa
  nedostanú, kým ich hráčka naozaj nepotrebuje

**Hotovo (Fáza 5 — admin rozhranie):**

- `/admin` — zoznam kapitol, radenie (↑/↓ mení `order_index`), publikovať/skryť
- `/admin/chapters/new` a `/admin/chapters/:id` — editor kapitoly: názov, slug
  (auto-slugify), popis, typ odomknutia, predchádzajúca kapitola, nápoveda,
  správy pri úspechu/neúspechu; podľa typu navyše:
  - `question`: max. počet pokusov + nastavenie správnej odpovede (write-only)
  - `location`: lat/lng/rádius + tlačidlo „Použiť moju aktuálnu polohu“
  - `qr_code`: `QrTokenEditor` — vygeneruje token, uloží iba jeho hash,
    zobrazí QR na stiahnutie/vytlačenie
  - `combined`: `ConditionsEditor` — pridávanie QR/GPS/otázka podmienok v
    poradí (GPS podmienka v kombinovanom režime má zatiaľ len základné
    nastavenie cez Supabase Studio — pohodlný formulár je menší zvyšný dlh)
  - zrozumiteľná chybová hláška pri zlyhaní uloženia (napr. duplicitný slug),
    nie iba tichá neúspešná operácia
- `BlockEditor` — pridávanie textu/fotiek (upload do privátneho Storage),
  pripojenie bloku pod iný (nesting), radenie, mazanie
- `/admin/players` — zoznam hráčok, postup po kapitolách, ručná zmena statusu
  (locked/unlocked/completed) aj pre kapitoly, ku ktorým sa ešte nedostali,
  reset celého postupu

**Hotovo (Fáza 6 — PWA a deployment, čiastočne):**

- `OfflineBanner` — informuje, keď appka beží offline (nové kapitoly/QR/GPS
  vyžadujú internet)
- Code-splitting admin rozhrania a QR skenera (`React.lazy` + `Suspense`)
- README: kompletný návod na Cloudflare Pages deployment + checklist pred
  odovzdaním (pozri sekcie vyššie)

**Hotovo — mapa v kapitole:**

- Pod hlavným listom kapitoly je tlačidlo **Mapa** s počtom nových miest.
  Otvorí mapu Kráľovstva Slovensko (`public/map/kingdom-of-slovakia.jpg`) s
  guličkami iba na mestách, ktoré má nastavené _táto_ kapitola; ťuknutie
  ukáže príbehy/fotky daného mesta pre túto kapitolu. To isté mesto môže mať
  v každej kapitole iný obsah.
- Nové (neotvorené) miesto = pulzujúca ružová gulička, otvorené = malá zlatá
  bodka (pamätá sa iba lokálne v prehliadači).
- Dáta: `chapter_map_pins` (kapitola + mesto), obsah miesta sú bežné
  `chapter_blocks` s `map_pin_id` — rovnaký editor, vnáranie aj fotky ako v
  hlavnom liste.
- Admin: v editore kapitoly sekcia „Mapa — miesta v tejto kapitole“ → vyber
  mesto → „+ Pridať miesto“ → pod ním píšeš text/pridávaš fotky. Zoznam
  kapitol ukazuje počet blokov listu a mestá na mape.
- Polohy miest na obrázku sú v `src/features/map/cities.ts` (v % šírky/výšky)
  — ak by si mapu vymenil, stačí upraviť tam.
- Bezpečnosť: zamknuté kapitoly sa už nevracajú ani cez API (názov, obsah,
  fotky, miesta) — predtým ich skrývalo iba UI.

**Reálne otestované cez Playwright (headless browser, nie len unit testy)** a
2 skutočné chyby nájdené a opravené počas tohto testovania:

- Po resete postupu (alebo pre úplne novú hráčku) sa celý timeline javil ako
  zamknutý vrátane úplne prvej kapitoly → pridaná `effective_status()` +
  `get_chapter_status()` SQL funkcia, ktorá dopočíta virtuálny stav namiesto
  natvrdo `'locked'`, keď ešte neexistuje `player_progress` riadok
- RLS politika na `chapter_blocks` (a Storage politika nad fotkami) používala
  subquery priamo na `chapters`, ktorá pre hráčku nemá žiadnu SELECT politiku
  → bloky/fotky boli pre hráčku vždy neviditeľné → pridaná
  `chapter_is_published()` SECURITY DEFINER funkcia, ktorú teraz obe politiky
  používajú
- Oba nájdené scenáre majú pokrývajúci integračný test (11/11 v
  `test:integration`), aby sa nevrátili
- Overený reálny priebeh hry: reset → prvá kapitola unlocked → manuálny krok →
  otázka (nesprávna/správna odpoveď) → QR skener (zrozumiteľná správa pri
  zamietnutom prístupu ku kamere, appka nespadne) → admin ručné odomknutie →
  GPS (too_far/within_range so skutočnou zmenou súradníc) → posledná kapitola
  sa odomkne; admin CRUD (nová kapitola, textový blok) — nikde žiadna
  console/page chyba

**Zatiaľ chýba / vedomé zjednodušenia:**

- Produkčný Supabase projekt zatiaľ nie je založený — appka beží a je
  otestovaná iba proti lokálnemu Supabase stacku (`npx supabase start`)
- Appka zatiaľ nebola nasadená na Cloudflare Pages (návod v README je
  pripravený, chýba iba samotné pripojenie repozitára v Cloudflare dashboarde)
- GPS podmienka v `combined` (kombinovanom) unlocku nemá vlastný formulár v
  admin editore (nastavuje sa cez Supabase Studio) — jednoduché unlock typy
  (`location` priamo na kapitole) plný formulár majú
- Appka nebola zatiaľ ručne otestovaná na reálnom mobile (kamera/GPS/PWA
  install) — pozri checklist vyššie
- Web Push notifikácie zámerne nie sú implementované (neskoršia fáza, ako
  žiadalo pôvodné zadanie)
