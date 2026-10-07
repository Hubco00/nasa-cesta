import { defineConfig } from 'vitest/config'

// Samostatná konfigurácia pre testy vyžadujúce bežiaci lokálny Supabase
// (`npx supabase start`). Bežné `npm run test` ich preskakuje.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/test/integration/**/*.test.ts'],
    testTimeout: 15_000,
    // Súbory zdieľajú tú istú hráčku a DB (napr. tutoriál dočasne skryje
    // ostatné kapitoly) — paralelne by si navzájom menili postup.
    fileParallelism: false,
  },
})
