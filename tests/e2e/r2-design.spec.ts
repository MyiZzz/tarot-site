import { expect, test } from '@playwright/test'

test.use({ deviceScaleFactor: 2, reducedMotion: 'reduce' })

for (const width of [390, 768, 1440]) {
  test(`design interactions at ${width}px and DPR 2`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 })
    await page.goto('/')
    const nav = page.getByRole('navigation', { name: width < 900 ? '移动端导航' : '主导航' })
    const navItem = (label: string) => nav.getByRole('button', { name: new RegExp(label) })
    await navItem('记录中心').click()
    await expect(page.locator('#records-content')).toBeVisible()
    await expect(navItem('记录中心')).toHaveAttribute('aria-current', 'page')
    await navItem('牌卡百科').click()
    await page.getByRole('button', { name: /查看全部 78 张/ }).click()
    await page.getByLabel('搜索牌名').fill('圣杯王牌')
    await expect(page.locator('.encyclopedia-chip[aria-pressed="true"]')).toHaveText('圣杯王牌Ace of Cups')
    await expect(page.getByRole('heading', { name: '圣杯王牌', exact: true })).toBeVisible()
    await page.getByLabel('搜索牌名').fill('不存在的牌卡')
    await expect(page.locator('.encyclopedia-detail--empty')).toContainText('暂无可显示的牌卡')
    await expect(page.locator('.encyclopedia-detail__card')).toHaveCount(0)
    await page.locator('#records').evaluate(node => node.scrollIntoView({ behavior: 'instant' }))
    await expect(navItem('记录中心')).toHaveAttribute('aria-current', 'page')
    await page.locator('#reading').evaluate(node => node.scrollIntoView({ behavior: 'instant' }))
    await expect(navItem('开始占卜')).toHaveAttribute('aria-current', 'page')
    await page.getByLabel('占卜问题', { exact: true }).fill('面对不断变化的环境，我应该如何安排下一阶段的工作、关系与个人成长，并把计划落实为可以持续的小步骤？')
    await page.getByRole('button', { name: '事业', exact: true }).click()
    await page.getByRole('button', { name: '黄道十二宫', exact: true }).click()
    const draw = page.getByRole('button', { name: '洗牌并抽牌', exact: true })
    if (width === 390) {
      const drawBox = (await draw.boundingBox())!
      const navBox = (await nav.boundingBox())!
      expect(drawBox.y).toBeGreaterThan(64)
      expect(drawBox.y + drawBox.height).toBeLessThan(navBox.y)
    }
    await page.getByText('查看提问与牌阵指南', { exact: true }).click()
    await expect(page.getByTestId('studio-guide-panel')).toHaveAttribute('open', '')
    await draw.click()
    await page.getByRole('button', { name: '全部揭晓', exact: true }).click()
    const board = page.locator('.spread-board__cards-layer')
    await expect(board.locator('.is-revealed')).toHaveCount(12)
    for (const card of await board.locator('.spread-board__slot--card').all()) await card.scrollIntoViewIfNeeded()
    await expect.poll(() => board.locator('img').evaluateAll(images => images.every(image => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0))).toBe(true)
    const geometry = await board.locator('.spread-board__slot--card').evaluateAll(nodes => nodes.map(node => {
      const rect = node.getBoundingClientRect()
      return { left: rect.left, right: rect.right, fontSize: parseFloat(getComputedStyle(node.querySelector('.tarot-card-figure__footer strong')!).fontSize) }
    }))
    for (const box of geometry) {
      expect(box.left).toBeGreaterThanOrEqual(0)
      expect(box.right).toBeLessThanOrEqual(width)
      expect(box.fontSize).toBeGreaterThanOrEqual(16)
    }
    if (width > 640) {
      await page.getByRole('button', { name: '牌阵布局', exact: true }).click()
      await expect(page.locator('.spread-board-shell')).toHaveAttribute('data-view', 'layout')
      await expect.poll(() => page.locator('.spread-board-scroll').evaluate(node => node.scrollWidth - node.clientWidth)).toBeLessThanOrEqual(1)
      await page.getByRole('button', { name: '清晰牌面', exact: true }).click()
    }
    await page.getByLabel('占卜问题', { exact: true }).fill('一个新的问题')
    await expect(page.locator('.reading-progress [aria-current="step"]')).toContainText('洗牌抽牌')
    await expect(board.locator('.is-revealed')).toHaveCount(12)
    await page.locator('#records').evaluate(node => node.scrollIntoView({ behavior: 'instant' }))
    await expect(navItem('记录中心')).toHaveAttribute('aria-current', 'page')
    await expect(page.locator('#records').getByRole('button', { name: '加入对比', exact: true })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width)
  })
}
