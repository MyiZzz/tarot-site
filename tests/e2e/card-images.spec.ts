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

for (const dpr of [1, 2, 3]) {
  test(`detail and thumbnail sources at DPR ${dpr}`, async ({ browser }) => {
    const context = await browser.newContext({ deviceScaleFactor: dpr, viewport: { width: 390, height: 844 } })
    const page = await context.newPage()
    await page.goto('/')
    await page.getByRole('button', { name: '揭晓今日能量', exact: true }).click()
    const dailySource = await page.locator('.daily-card-slot img').evaluate((img: HTMLImageElement) => img.currentSrc)
    await page.locator('#records').scrollIntoViewIfNeeded()
    const thumbnail = page.locator('.record-card__thumbs img').first()
    await thumbnail.scrollIntoViewIfNeeded()
    // Browsers may reuse the already-downloaded daily source for this same card.
    await expect.poll(() => thumbnail.evaluate((img: HTMLImageElement) => img.currentSrc)).toBeTruthy()
    const thumbnailSource = await thumbnail.evaluate((img: HTMLImageElement) => img.currentSrc)
    expect(/-240\.avif$/.test(thumbnailSource) || thumbnailSource === dailySource).toBe(true)
    expect(await thumbnail.locator('..').locator('source').first().getAttribute('srcset')).not.toContain('768w')
    const encyclopedia = page.locator('#encyclopedia')
    await encyclopedia.scrollIntoViewIfNeeded()
    const detail = encyclopedia.locator('picture img')
    await detail.scrollIntoViewIfNeeded()
    await expect.poll(() => detail.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true)
    const width = await detail.evaluate((img) => img.getBoundingClientRect().width)
    const expected = [240, 480, 768].find((candidate) => candidate >= width * dpr) ?? 768
    await expect.poll(() => detail.evaluate((img: HTMLImageElement) => img.currentSrc)).toMatch(new RegExp(`-${expected}\\.avif$`))
    await context.close()
  })
}

test('mobile reading grid preserves complete upright and reversed artwork', async ({ page }, testInfo) => {
  await page.clock.setFixedTime(new Date('2026-03-08T04:00:00Z'))
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await page.getByLabel('占卜问题', { exact: true }).fill('如何安排接下来的工作与生活？')
  await page.getByRole('button', { name: '事业', exact: true }).click()
  await page.getByRole('button', { name: '黄道十二宫', exact: true }).click()
  await page.getByRole('button', { name: '洗牌并抽牌', exact: true }).click()
  await page.getByRole('button', { name: '全部揭晓', exact: true }).click()
  const grid = page.locator('.spread-board__cards-layer')
  const images = grid.locator('img')
  await expect(images).toHaveCount(12)
  for (const artwork of await images.all()) {
    await artwork.scrollIntoViewIfNeeded()
    await expect.poll(() => artwork.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true)
    const geometry = await artwork.evaluate((img: HTMLImageElement) => {
      const box = img.getBoundingClientRect()
      const frame = img.closest('.tarot-card-figure__image-wrap')!.getBoundingClientRect()
      const footer = img.closest('.tarot-card-figure')!.querySelector('.tarot-card-figure__footer')!.getBoundingClientRect()
      return { ratio: box.width / box.height, intrinsic: Number(img.getAttribute('width')) / Number(img.getAttribute('height')), fit: getComputedStyle(img).objectFit, bottom: box.bottom, footerTop: footer.top, frameHeight: frame.height, height: box.height }
    })
    expect(geometry.fit).toBe('contain')
    expect(geometry.ratio).toBeCloseTo(geometry.intrinsic, 2)
    expect(geometry.bottom).toBeLessThanOrEqual(geometry.footerTop)
    expect(geometry.height).toBeCloseTo(geometry.frameHeight, 0)
  }
  // The fixed clock and question seed the reading, including both orientations.
  for (const reversed of [false, true]) {
    const artwork = grid.locator(reversed ? 'img.is-reversed' : 'img:not(.is-reversed)').first()
    await artwork.scrollIntoViewIfNeeded()
    await expect(artwork).toHaveCSS('transform', reversed ? 'matrix(-1, 0, 0, -1, 0, 0)' : 'none')
    await page.screenshot({ path: testInfo.outputPath(`mobile-artwork-${reversed ? 'reversed' : 'upright'}.png`) })
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
})
