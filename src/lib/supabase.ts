import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(url && anonKey)

if (!isSupabaseConfigured) {
  console.warn(
    '[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY nie sú nastavené. ' +
      'Skopíruj .env.example do .env.local a doplň hodnoty z Supabase projektu (Settings → API). ' +
      'Aplikácia beží v obmedzenom režime bez prihlásenia a bez dát.',
  )
}

// V dev/preview režime bez nastavených premenných použijeme neplatný, ale
// syntakticky validný placeholder, aby createClient nezhodil celú appku.
// TODO Fáza 2: pridať generický typ `Database` vygenerovaný zo skutočnej schémy
// (`supabase gen types typescript`), keď budú existovať migrácie.
export const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  anonKey || 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  },
)
