import { readFile } from 'node:fs/promises'
import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page, type TestInfo } from '@playwright/test'

async function expectAccessible(page: Page, testInfo: TestInfo) {
  const results = await new AxeBuilder({ page }).analyze()
  const violations = results.violations.filter(
    ({ impact }) => impact === 'serious' || impact === 'critical',
  )
  await testInfo.attach('accessibility-results', {
    body: JSON.stringify(results, null, 2),
    contentType: 'application/json',
  })
  expect(violations).toEqual([])
}

async function expectPosterDownload(page: Page, name: string, testInfo: TestInfo) {
  const downloading = page.waitForEvent('download')
  await page.getByRole('button', { name, exact: true }).click()
  const download = await downloading
  expect(await download.failure()).toBeNull()
  expect(download.suggestedFilename()).toMatch(/\.png$/)
  const path = testInfo.outputPath(download.suggestedFilename())
  await download.saveAs(path)
  const png = await readFile(path)
  expect(png.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  // PNG IHDR dimensions verify that a full poster was generated.
  expect(png.readUInt32BE(16)).toBe(760)
  expect(png.readUInt32BE(20)).toBeGreaterThanOrEqual(980)
  await testInfo.attach('poster', { path, contentType: 'image/png' })
}

async function openRecords(page: Page) {
  // LazySection replaces its placeholder after scrolling into the viewport.
  await expect(async () => {
    await page.locator('#records').scrollIntoViewIfNeeded()
    await expect(page.getByLabel('搜索记录', { exact: true })).toBeVisible()
  }).toPass({ timeout: 10_000 })
}

async function drawTriangle(page: Page) {
  await page.getByLabel('占卜问题', { exact: true }).fill('我接下来该怎样处理这段关系？')
  await page.getByRole('button', { name: '爱情', exact: true }).click()
  await page.getByRole('button', { name: '圣三角', exact: true }).click()
  await page.getByRole('button', { name: '现状 / 阻碍 / 建议', exact: true }).click()
  await page.getByRole('button', { name: '洗牌并抽牌', exact: true }).click()
  await expect(page.getByRole('heading', { name: '结果解读', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '全部揭晓', exact: true }).click()
  await expect(page.getByRole('heading', { name: '封存本次指引', exact: true })).toBeVisible()
  await expect(page.getByLabel('记录标题', { exact: true })).toBeVisible()
}

test.beforeEach(async ({ page }) => {
  // Keep the daily card stable while allowing animations and shuffle timers to run.
  await page.clock.setFixedTime(new Date('2026-03-08T04:00:00Z'))
  await page.addInitScript(() => {
    let state = 20260308
    Math.random = () => {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0
      return state / 0x100000000
    }
  })
  await page.goto('/')
})

test('draws a spread, reveals a reading, and downloads a PNG poster', async ({ page }, testInfo) => {
  await drawTriangle(page)
  await expectPosterDownload(page, '下载海报', testInfo)
  await expectAccessible(page, testInfo)
})

test('reveals daily guidance, archives it, and downloads its poster', async ({ page }, testInfo) => {
  await page.getByRole('button', { name: '揭晓今日能量', exact: true }).click()
  await expect(page.getByRole('heading', { name: '核心指引', exact: true })).toBeVisible()
  const records = page.locator('#records')
  await openRecords(page)
  const record = records.locator('.record-card')
  await expect(record).toHaveCount(1)
  const title = await record.locator('h3').innerText()
  const question = await record.locator('.record-card__question').innerText()
  const artwork = await record.locator('img').getAttribute('alt')
  expect(title).toContain('每日一张')
  await expectPosterDownload(page, '下载今日海报', testInfo)
  await page.reload()
  await openRecords(page)
  await expect(record).toHaveCount(1)
  await expect(record.getByRole('heading', { name: title, exact: true })).toBeVisible()
  await expect(record.locator('.record-card__question')).toHaveText(question)
  await expect(record.locator('img')).toHaveAttribute('alt', artwork!)
  await expectAccessible(page, testInfo)
})

test('mobile viewport supports daily guidance, readings, and the encyclopedia', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: '揭晓今日能量', exact: true }).click()
  await expect(page.getByRole('heading', { name: '核心指引', exact: true })).toBeVisible()
  await drawTriangle(page)
  await page.getByRole('button', { name: '牌卡百科', exact: true }).click()
  await page.getByRole('button', { name: /查看全部 78 张/ }).click()
  await page.getByRole('button', { name: /愚者/ }).click()
  await expect(page.getByRole('heading', { name: '愚者', exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  await expectAccessible(page, testInfo)
})

test('archives a revealed spread and persists its saved title and tags after reload', async ({ page }) => {
  await drawTriangle(page)
  const records = page.locator('#records')
  await openRecords(page)
  const record = records.locator('.record-card')
  await expect(record).toHaveCount(1)
  await expect(record).toContainText('我接下来该怎样处理这段关系？')
  await expect(record.locator('img')).toHaveCount(3)
  const title = await record.locator('h3').innerText()
  await page.reload()
  await openRecords(page)
  await expect(record.getByRole('heading', { name: title, exact: true })).toBeVisible()
  await expect(record.locator('img')).toHaveCount(3)

  await drawTriangle(page)
  await page.getByLabel('记录标题', { exact: true }).fill('关系复盘：认真倾听与清晰表达')
  await page.getByLabel('记录标签', { exact: true }).fill('沟通 复盘')
  await page.getByRole('button', { name: '加入收藏', exact: true }).click()
  await openRecords(page)
  await records.getByRole('button', { name: '收藏', exact: true }).click()
  await expect(record).toHaveCount(1)
  await expect(record).toContainText('已收藏')
  await page.reload()
  await openRecords(page)
  await records.getByRole('button', { name: '收藏', exact: true }).click()
  await expect(record).toHaveCount(1)
  await expect(record.getByRole('heading', { name: '关系复盘：认真倾听与清晰表达', exact: true })).toBeVisible()
  await expect(record).toContainText('#沟通')
  await expect(record).toContainText('#复盘')
  await expect(record).toContainText('我接下来该怎样处理这段关系？')
  await expect(record.locator('img')).toHaveCount(3)
})
