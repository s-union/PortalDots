import path from 'node:path'
import { configDefaults, defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import VueRouter from 'vue-router/vite'
import { fileURLToPath, URL } from 'node:url'
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin'
import { playwright } from '@vitest/browser-playwright'

const dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [VueRouter(), vue()],
  server: {
    fs: {
      // `**/.git/**` in the default deny list blocks file access
      // When the working directory path contains `.git` (e.g. git worktrees).
      deny: ['.env', '.env.*', '*.{crt,pem}']
    }
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'jsdom',
          globals: true,
          setupFiles: ['./src/test/setup.ts'],
          exclude: [...configDefaults.exclude, 'tests/e2e/**', '**/*.stories.ts'],
          coverage: {
            provider: 'v8',
            include: ['src/**/*.{ts,vue}'],
            exclude: [
              'src/test/**',
              'src/**/*.test.ts',
              'src/**/*.stories.ts',
              'src/stories/**',
              'src/**/*.d.ts',
              'src/lib/api/schema.ts'
            ]
          }
        }
      },
      {
        extends: true,
        plugins: [
          storybookTest({
            configDir: path.join(dirname, '.storybook'),
            storybookScript: 'pnpm storybook --no-open'
          })
        ],
        test: {
          name: 'storybook',
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            instances: [{ browser: 'chromium' }]
          },
          setupFiles: ['./.storybook/vitest.setup.ts'],
          exclude: []
        },
        optimizeDeps: {
          include: ['@fortawesome/vue-fontawesome', 'vue-router/experimental']
        }
      }
    ]
  }
})
