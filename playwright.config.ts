import { defineConfig, devices } from '@playwright/test'

const port = Number(process.env.PLAYWRIGHT_PORT ?? 4302)
const baseURL = `http://127.0.0.1:${port}`

export default defineConfig({
  expect: { toHaveScreenshot: { animations: 'disabled' } },
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  workers: 2,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL,
    timezoneId: 'Asia/Shanghai',
    locale: 'zh-CN',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    ...(process.env.PLAYWRIGHT_WEBKIT === '1' ? [{
      name: 'webkit-smoke',
      testMatch: '**/webkit-smoke.spec.ts',
      use: { ...devices['Desktop Safari'], reducedMotion: 'reduce' as const },
    }] : []),
    {
      name: 'chromium',
      testIgnore: ['**/visual-views.spec.ts', '**/webkit-smoke.spec.ts'],
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
    command: `npm run preview -- --host 127.0.0.1 --port ${port} --strictPort`,
    reuseExistingServer: false,
    timeout: 120_000,
    url: baseURL,
  },
})
