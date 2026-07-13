import { cloudflare } from '@cloudflare/vite-plugin'
import EmailTailwind from '@hono-email/tailwind-plugin/vite'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// Deliberately not named `vite.config.ts`: `@hono-email/preview` auto-loads a
// `vite.config.*` in this directory if one exists, and merging the Cloudflare
// plugin into its preview dev server breaks dependency pre-bundling. Keeping
// this filename non-default lets `pnpm run preview` fall back to its own
// Tailwind-only setup (detected via the `tailwindcss` devDependency) while
// this config stays dedicated to `vite dev` / `vite build` for the Worker.
export default defineConfig({
  plugins: [cloudflare(), tailwindcss(), EmailTailwind()]
})
