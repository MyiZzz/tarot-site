import { expect, test } from '@playwright/test'

test('daily artwork loads a responsive AVIF and retains a working JPEG fallback', async ({ page, request }) => {
  await page.goto('/')
  const artwork = page.locator('.daily-card-slot picture img')
  await expect(artwork).toHaveAttribute('loading', 'eager')
  await expect.poll(() => artwork.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true)
  const currentSrc = await artwork.evaluate((img: HTMLImageElement) => img.currentSrc)
  expect(currentSrc).toMatch(/-(240|480)\.avif$/)
  const fallback = await request.get((await artwork.getAttribute('src'))!)
  expect(fallback.ok()).toBe(true)
  expect(fallback.headers()['content-type']).toContain('image/jpeg')
  await page.getByRole('button', { name: '揭晓今日能量' }).click()
  await expect(artwork).toBeVisible()
})
