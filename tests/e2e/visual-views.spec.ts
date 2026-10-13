import { expect, test, type Page } from '@playwright/test'

async function capture(page: Page, name: string) {
  // Decode only visible artwork: scrolling individual images would change the viewport under test.
  await page.evaluate(async () => {
    await document.fonts.ready
    await Promise.all(Array.from(document.images).filter(image => {
      const box = image.getBoundingClientRect()
      return box.bottom > 0 && box.top < innerHeight && box.width > 0
    }).map(image => image.decode().catch(() => undefined)))
  })
  await expect(page).toHaveScreenshot(`${name}.png`, { animations: 'disabled', scale: 'css' })
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width)
}

async function navigate(page: Page, label: string) {
  const nav = page.getByRole('navigation', { name: page.viewportSize()!.width < 900 ? '移动端导航' : '主导航' })
  await nav.getByRole('button', { name: new RegExp(label) }).click()
  await expect(nav).toBeInViewport()
}

test('populated viewport baselines retain navigation and the actual home hero', async ({ page }) => {
  test.setTimeout(90_000)
  await page.clock.setFixedTime(new Date('2026-03-08T04:00:00Z'))
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.addInitScript(() => {
    let state = 20260308
    Math.random = () => {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0
      return state / 0x100000000
    }
  })
  await page.goto('/')
  await page.addStyleTag({ content: '*, *::before, *::after { animation: none !important; transition: none !important; scroll-behavior: auto !important; }' })
  await expect(page.getByRole('region', { name: '首页引导' })).toBeInViewport()
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0)
  await capture(page, '01-home')

  await navigate(page, '开始占卜')
  const question = '当工作安排、家庭责任和个人成长同时需要我的注意时，我应该如何明确优先顺序、与重要的人沟通边界，并为未来十二个月制定可以持续执行的行动计划？'
  await page.getByLabel('占卜问题', { exact: true }).fill(question)
  await page.getByRole('button', { name: '事业', exact: true }).click()
  await page.getByRole('button', { name: '黄道十二宫', exact: true }).click()
  await capture(page, '02-draw')
  await page.getByRole('button', { name: '洗牌并抽牌', exact: true }).click()
  await expect(page.locator('.spread-board__cards-layer button')).toHaveCount(12)
  await capture(page, '03-result')
  await page.getByRole('button', { name: '全部揭晓', exact: true }).click()
  await expect(page.locator('.spread-board__cards-layer .is-revealed')).toHaveCount(12)
  await page.getByLabel('记录标题', { exact: true }).fill('十二个月的生活全景复盘：工作、家庭、关系与个人成长的长期行动记录')
  await page.getByLabel('记录标签', { exact: true }).fill('长期行动 家庭沟通 个人成长')
  await page.getByRole('button', { name: '加入收藏', exact: true }).click()
  await navigate(page, '记录中心')
  await expect(page.locator('#records .record-card')).toHaveCount(1)
  await capture(page, '04-records')

  await navigate(page, '牌卡百科')
  await page.getByRole('button', { name: /查看全部 78 张/ }).click()
  await expect(page.locator('.encyclopedia-chip')).toHaveCount(78)
  await capture(page, '05-encyclopedia')
})
