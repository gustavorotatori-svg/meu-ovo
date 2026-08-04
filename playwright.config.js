import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: /.*\.spec\.js/,
  timeout: 120000,
  use: {
    browserName: 'chromium',
    channel: 'chrome',
    headless: true,
    locale: 'pt-BR',
    viewport: { width: 1366, height: 900 },
    screenshot: 'only-on-failure',
  },
  reporter: [['list']],
});
