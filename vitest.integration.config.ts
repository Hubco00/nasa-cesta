import { defineConfig } from 'vitest/config'

// Samostatná konfigurácia pre testy vyžadujúce bežiaci lokálny Supabase
// (`npx supabase start`). Bežné `npm run test` ich preskakuje.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/test/integration/**/*.test.ts'],
    testTimeout: 15_000,
  },
})
