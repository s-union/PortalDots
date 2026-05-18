import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e/integration',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ],
  webServer: {
    command: 'echo "Using existing services"',
    port: 4173,
    reuseExistingServer: true,
    timeout: 5000
  }
})
