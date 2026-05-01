import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  retries: 1,
  workers: 1, // run serially to avoid DB conflicts
  reporter: [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    viewport: { width: 1280, height: 720 },
    actionTimeout: 10000,
    navigationTimeout: 15000,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Start both servers before running tests
  webServer: [
    {
      command: 'npm run dev --workspace=server',
      url: 'http://localhost:5000/api/health',
      reuseExistingServer: true,
      timeout: 30000,
      cwd: '..',
    },
    {
      command: 'npm run dev --workspace=client',
      url: 'http://localhost:3000',
      reuseExistingServer: true,
      timeout: 30000,
      cwd: '..',
    },
  ],
});
