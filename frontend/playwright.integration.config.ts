import { defineConfig, devices } from '@playwright/test'

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
  ],
  webServer: {
    command: 'echo "Using existing dev:worker services"',
    port: 5173,
    reuseExistingServer: true,
    timeout: 5000
  }
})
