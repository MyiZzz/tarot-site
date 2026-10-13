import { readFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'

// Opt in after `npx playwright install --with-deps webkit`: PLAYWRIGHT_WEBKIT=1.
for (const width of [390, 1440]) {
  test(`responsive artwork, layout and PNG poster at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/')
    const image = page.locator('.daily-card-slot picture img')
    await expect.poll(() => image.evaluate((node: HTMLImageElement) => node.complete && node.naturalWidth > 0)).toBe(true)
    expect(await image.evaluate((node: HTMLImageElement) => node.currentSrc)).toMatch(/-(240|480)\.(avif|webp)$/)
    const box = (await image.boundingBox())!
    expect(box.width).toBeGreaterThan(0)
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width).toBeLessThanOrEqual(width)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width)
    await expect(page.getByRole('navigation', { name: width < 900 ? '移动端导航' : '主导航' })).toBeInViewport()
    await page.getByRole('button', { name: '揭晓今日能量', exact: true }).click()
    const downloading = page.waitForEvent('download')
    await page.getByRole('button', { name: '下载今日海报', exact: true }).click()
    const download = await downloading
    expect(await download.failure()).toBeNull()
    const path = testInfo.outputPath('daily-poster.png')
    await download.saveAs(path)
    const png = await readFile(path)
    expect(png.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    expect(png.readUInt32BE(16)).toBe(760)
    expect(png.readUInt32BE(20)).toBeGreaterThanOrEqual(980)
  })
}
