import { defineConfig } from 'drizzle-kit'

// Migrations live in `migrations/` because that is the `migrations_dir` Wrangler
// applies for the D1 binding (see wrangler.jsonc).
export default defineConfig({
  dialect: 'sqlite',
  driver: 'd1-http',
  schema: './src/db/schema.ts',
  out: './migrations'
})
