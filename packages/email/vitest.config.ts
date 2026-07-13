import EmailTailwind from '@hono-email/tailwind-plugin/vite'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vitest/config'

// The Cloudflare Vite plugin is intentionally omitted here: it boots a workerd
// runtime that this test suite (plain node, in-memory D1 stub) doesn't need.
// Only the Tailwind plugins are required so `<Tailwind>` templates render styled.
export default defineConfig({
  plugins: [tailwindcss(), EmailTailwind()],
  test: {
    // Vitest stubs CSS transforms to an empty string by default, which would
    // short-circuit the Tailwind plugin's per-file CSS compilation before it
    // runs. Real CSS processing must stay enabled for `<Tailwind>` templates
    // to render with inlined styles.
    css: true,
    include: ['src/tests/**/*.test.ts']
  }
})
