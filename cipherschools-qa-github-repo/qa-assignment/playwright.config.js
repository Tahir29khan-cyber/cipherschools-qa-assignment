// playwright.config.js
import { defineConfig } from '@playwright/test';
import * as dotenv from 'dotenv';
dotenv.config({ path: './config/.env' });

export default defineConfig({
  testDir: './e2e',
  timeout: 45000,
  retries: 1,
  reporter: [['html', { outputFolder: 'playwright-report' }], ['list']],
  use: {
    baseURL: process.env.BASE_URL || 'https://with-bugs.practicesoftwaretesting.com',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
});
