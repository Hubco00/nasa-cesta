# Naša cesta

Romantický interaktívny príbeh/quest — postupné odomykanie kapitol cez text,
fotografie, otázky, QR kódy a GPS overenie polohy.

**Stav projektu:** vo vývoji. Aktuálne hotovo: Fáza 1 (projekt, routing, login).
Zvyšok pozri v sekcii [Stav implementácie](#stav-implementácie) nižšie.

## Technológie

React 19 · TypeScript · Vite · Tailwind CSS v4 · React Router · Supabase
(Auth/Postgres/Storage/RLS) · html5-qrcode · PWA (vite-plugin-pwa) · Vitest ·
ESLint · Prettier.

## Lokálne spustenie

Požiadavky: Node.js 20+ a npm.

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

| Príkaz                 | Popis                                  |
| ---------------------- | -------------------------------------- |
| `npm run dev`          | vývojový server s HMR                  |
| `npm run build`        | typecheck + produkčný build do `dist/` |
| `npm run preview`      | lokálny náhľad produkčného buildu      |
| `npm run typecheck`    | TypeScript kontrola bez buildu         |
| `npm run lint`         | ESLint                                 |
| `npm run format`       | Prettier — automatická oprava          |
| `npm run format:check` | Prettier — iba kontrola                |
| `npm run test`         | Vitest (jednorazovo)                   |
| `npm run test:watch`   | Vitest vo watch režime                 |

## Supabase konfigurácia

> TODO — doplní sa vo Fáze 2 spolu s SQL migráciami (`supabase/migrations/`).
> Bude obsahovať: vytvorenie projektu, spustenie migrácií, nastavenie Storage
> bucketu pre fotografie, vytvorenie prvého admin používateľa.

## Cloudflare Pages deployment

> TODO — doplní sa vo Fáze 6. Build command: `npm run build`, output
> directory: `dist`. Potrebné environment variables: `VITE_SUPABASE_URL`,
> `VITE_SUPABASE_ANON_KEY` (nikdy `service_role` kľúč).

## Checklist pred odovzdaním

> TODO — doplní sa vo Fáze 6.

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
- `.env.example`, `.gitignore`, git repozitár inicializovaný (lokálne, ešte
  nie je pripojený na GitHub)

**Zatiaľ chýba:**

- Fáza 2: SQL migrácie, RLS politiky, profily/role, reálne prepojenie na
  Supabase projekt, admin route guard (`RequireAdmin`)
- Fáza 3: timeline/detail kapitol, obrázky, progress, otázky
- Fáza 4: QR skener, GPS odomykanie kapitoly, fallbacky
- Fáza 5: admin rozhranie (CRUD kapitol, upload fotiek, QR generátor)
- Fáza 6: service worker offline fallback UX, finálne bezpečnostné kontroly,
  dokončenie README sekcií vyššie, GitHub repo + Cloudflare Pages pripojenie
