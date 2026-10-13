import { expect, test } from '@playwright/test'

for (const dpr of [1, 2, 3]) {
  test(`daily artwork selects an appropriate source at DPR ${dpr}`, async ({ browser }) => {
    const context = await browser.newContext({ deviceScaleFactor: dpr, viewport: { width: 1280, height: 900 } })
    const page = await context.newPage()
    await page.goto('/')
    const artwork = page.locator('.daily-card-slot picture img')
    await expect(artwork).toHaveAttribute('loading', 'eager')
    await expect.poll(() => artwork.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true)
    expect(await artwork.evaluate((img: HTMLImageElement) => img.currentSrc)).toMatch(new RegExp(`-${dpr === 1 ? 240 : 480}\\.avif$`))
    await page.getByRole('button', { name: '揭晓今日能量' }).click()
    expect(await artwork.evaluate((img) => img.getBoundingClientRect().width)).toBeLessThanOrEqual(203)
    await context.close()
  })
}

for (const failure of ['abort', '404'] as const) {
  for (const failCount of [1, 2, 3]) {
    test(`${failure}: recovers after ${failCount} failed image formats`, async ({ page }) => {
      const requests: string[] = []
      await page.route('**/cards/rws/**', async (route) => {
        const url = route.request().url()
        requests.push(url)
        const formats = ['avif', 'webp', 'jpg'].slice(0, failCount)
        if (formats.some((format) => url.endsWith(`.${format}`))) {
          if (failure === 'abort') await route.abort()
          else await route.fulfill({ status: 404, body: '' })
        } else await route.continue()
      })
      await page.goto('/')
      const artwork = page.locator('.daily-card-slot picture img')
      const expected = failCount === 3 ? /^data:image\/svg\+xml,/ : failCount === 2 ? /\.jpg$/ : /\.webp$/
      await expect.poll(() => artwork.evaluate((img: HTMLImageElement) => img.currentSrc)).toMatch(expected)
      await expect.poll(() => artwork.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true)
      if (failCount === 3) await expect(artwork).toHaveAttribute('alt', /图片暂不可用/)
      expect(requests).toHaveLength(Math.min(failCount + 1, 3))
      expect(new Set(requests).size).toBe(requests.length)
      await page.getByRole('button', { name: '揭晓今日能量', exact: true }).click()
      await page.getByRole('button', { name: '顶部导航：记录中心', exact: true }).click()
      const thumbnail = page.locator('.record-card__thumbs img').first()
      await page.locator('.record-card__thumbs').first().scrollIntoViewIfNeeded()
      await expect.poll(() => thumbnail.evaluate((img: HTMLImageElement) => img.currentSrc)).toMatch(expected)
      await expect.poll(() => thumbnail.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true)
    })
  }
}
