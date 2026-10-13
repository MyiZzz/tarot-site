import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  workers: process.env.CI ? 2 : undefined,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4273',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      testIgnore: '**/visual-views.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    ...[
      { name: 'views-desktop', viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, isMobile: false },
      { name: 'views-mobile', viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true },
      { name: 'views-tablet', viewport: { width: 768, height: 1024 }, deviceScaleFactor: 2, isMobile: true },
    ].map(({ name, ...use }) => ({
      name,
      testMatch: '**/visual-views.spec.ts',
      use: { ...devices['Desktop Chrome'], ...use, hasTouch: use.isMobile },
    })),
  ],
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4273 --strictPort',
    reuseExistingServer: false,
    timeout: 120_000,
    url: 'http://127.0.0.1:4273',
  },
})
