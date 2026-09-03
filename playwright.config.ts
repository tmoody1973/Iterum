import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://127.0.0.1:3310',
    viewport: { width: 1536, height: 1024 },
  },
  webServer: {
    command: 'npm run dev -- --hostname 127.0.0.1 --port 3310',
    url: 'http://127.0.0.1:3310',
    reuseExistingServer: !process.env.CI,
  },
})
