import { cloudflare } from '@cloudflare/vite-plugin'
import EmailTailwind from '@hono-email/tailwind-plugin/vite'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [cloudflare(), tailwindcss(), EmailTailwind()]
})
