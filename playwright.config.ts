import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  retries: 1,
  use: {
    baseURL: 'http://127.0.0.1:4173/Webtoon-tools/',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173/Webtoon-tools/',
    reuseExistingServer: true,
  },
  projects: [
    { name: 'chromium-tablet', use: { ...devices['Desktop Chrome'], viewport: { width: 1024, height: 768 }, hasTouch: true } },
  ],
});
