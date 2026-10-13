import { expect, test, type Locator, type TestInfo } from '@playwright/test'

async function capture(view: Locator, name: string, testInfo: TestInfo) {
  await view.scrollIntoViewIfNeeded()
  for (const image of await view.locator('img').all()) {
    await image.scrollIntoViewIfNeeded()
    await expect.poll(() => image.evaluate(async (node: HTMLImageElement) => {
      try { await node.decode() } catch { return false }
      return node.naturalWidth > 0 && node.naturalHeight > 0
    })).toBe(true)
  }
  await view.scrollIntoViewIfNeeded()
  const path = testInfo.outputPath(`${name}.png`)
  // Section captures exclude fixed navigation, which otherwise bisects tall images.
  await view.screenshot({
    path,
    animations: 'disabled',
    style: '.stitch-topbar, .stitch-mobile-nav, .skip-link { visibility: hidden !important; }',
  })
  await testInfo.attach(name, { path, contentType: 'image/png' })
  expect(await view.page().evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    view.page().viewportSize()!.width,
  )
}

test('five populated views with the largest spread and long Chinese content', async ({ page }, testInfo) => {
  test.setTimeout(90_000)
  await page.clock.setFixedTime(new Date('2026-03-08T04:00:00Z'))
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  expect(await page.evaluate(() => devicePixelRatio)).toBe(testInfo.project.use.deviceScaleFactor)
  await page.getByRole('button', { name: '揭晓今日能量', exact: true }).click()
  await capture(page.locator('#daily'), '01-daily', testInfo)

  const question = '当工作安排、家庭责任和个人成长同时需要我的注意时，我应该如何明确优先顺序、与重要的人沟通边界，并为未来十二个月制定可以持续执行的行动计划？'
  await page.getByLabel('占卜问题', { exact: true }).fill(question)
  await page.getByRole('button', { name: '事业', exact: true }).click()
  await page.getByRole('button', { name: '黄道十二宫', exact: true }).click()
  await capture(page.locator('#reading'), '02-studio', testInfo)
  await page.getByRole('button', { name: '洗牌并抽牌', exact: true }).click()
  await page.getByRole('button', { name: '全部揭晓', exact: true }).click()
  const result = page.locator('#result')
  await expect(result.locator('.spread-board__slot--card .is-revealed')).toHaveCount(12)
  await expect(result.locator('.spread-board__reading-list article')).toHaveCount(12)
  // These unscaled reading labels are the readable companion to the spatial board.
  for (const label of await result.locator('.spread-board__reading-list h3').all()) {
    await expect(label).toBeVisible()
    expect(await label.evaluate((node) => parseFloat(getComputedStyle(node).fontSize))).toBeGreaterThanOrEqual(14)
  }
  await expect(result.locator('.spread-board__cards-layer img')).toHaveCount(12)
  await capture(result.locator('.spread-board-scroll'), '03-board-detail', testInfo)
  await capture(result, '03-result', testInfo)

  await page.getByLabel('记录标题', { exact: true }).fill('十二个月的生活全景复盘：工作、家庭、关系与个人成长的长期行动记录')
  await page.getByLabel('记录标签', { exact: true }).fill('长期行动 家庭沟通 个人成长')
  await page.getByRole('button', { name: '加入收藏', exact: true }).click()
  const records = page.locator('#records')
  // Scrolling mounts RecordCenter and replaces the temporary section node.
  await expect(async () => {
    await records.scrollIntoViewIfNeeded()
    await expect(records.locator('.record-card')).toHaveCount(2)
  }).toPass({ timeout: 10_000 })
  await expect(records).toContainText(question)
  await expect(records).toContainText('已收藏')
  await capture(records, '04-records', testInfo)

  const encyclopedia = page.locator('#encyclopedia')
  await encyclopedia.scrollIntoViewIfNeeded()
  await page.getByRole('button', { name: /查看全部 78 张/ }).click()
  await encyclopedia.getByRole('button', { name: /女祭司/ }).click()
  await expect(encyclopedia.locator('.encyclopedia-chip.is-active')).toContainText('女祭司')
  await expect(encyclopedia.getByRole('heading', { name: '女祭司', exact: true })).toBeVisible()
  await capture(encyclopedia, '05-encyclopedia', testInfo)
  await capture(encyclopedia.locator('.encyclopedia-detail'), '05-selected-detail', testInfo)
})
