import { defineConfig, devices } from '@playwright/test'

if (process.env.FORCE_COLOR) {
  delete process.env.NO_COLOR
}

export default defineConfig({
  testDir: './tests/e2e/integration',
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'on-first-retry'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
})
