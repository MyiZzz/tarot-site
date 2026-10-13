import { expect, test } from '@playwright/test'

test('mobile ritual supports keyboard selection, progress and contained cards', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  const progress = page.getByRole('list', { name: '占卜步骤' })
  await expect(progress.locator('[aria-current="step"]')).toContainText('提出问题')
  await page.getByRole('button', { name: '开始仪式占卜' }).click()
  await page.getByLabel('占卜问题').fill('我该如何推进下一步？')
  const topic = page.getByRole('button', { name: '爱情', exact: true })
  await topic.focus()
  await page.keyboard.press('Enter')
  await expect(topic).toHaveAttribute('aria-pressed', 'true')
  const spread = page.getByRole('button', { name: '圣三角', exact: true })
  await spread.focus()
  await page.keyboard.press('Space')
  await expect(spread).toHaveAttribute('aria-pressed', 'true')
  await expect(progress.locator('[aria-current="step"]')).toContainText('洗牌抽牌')
  await page.getByRole('button', { name: '洗牌并抽牌', exact: true }).click()
  await expect(page.getByRole('heading', { name: '结果解读', exact: true })).toBeVisible()
  await expect(progress.locator('[aria-current="step"]')).toContainText('阅读指引')
  const board = page.locator('.spread-board__cards-layer')
  const card = board.getByRole('button').first()
  await card.focus()
  await page.keyboard.press('Enter')
  await expect(board.locator('.is-revealed')).toHaveCount(1)
  await expect(board.locator('.spread-board__mobile-label').first()).toBeVisible()
  await page.getByRole('button', { name: '全部揭晓' }).click()
  await expect(board.locator('.is-revealed')).toHaveCount(3)
  const geometry = await page.evaluate(() => ({
    width: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    cards: Array.from(document.querySelectorAll('.spread-board__slot--card')).map((node) => {
      const { left, right } = node.getBoundingClientRect()
      return { left, right }
    }),
  }))
  expect(geometry.documentWidth).toBe(geometry.width)
  for (const cardBox of geometry.cards) {
    expect(cardBox.left).toBeGreaterThanOrEqual(0)
    expect(cardBox.right).toBeLessThanOrEqual(geometry.width)
  }
  const navButtons = page.getByRole('navigation', { name: '移动端导航' }).getByRole('button')
  for (const button of await navButtons.all()) {
    const box = await button.boundingBox()
    expect(box!.height).toBeGreaterThanOrEqual(44)
    expect(box!.width).toBeGreaterThanOrEqual(44)
  }
  const inner = board.locator('.tarot-card-figure__inner').first()
  expect(await inner.evaluate((node) => parseFloat(getComputedStyle(node).animationDuration))).toBeLessThan(0.01)
})

test('desktop spread fits its panel and reveals with a 3D animation', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await page.getByLabel('占卜问题').fill('我该如何把计划落到行动？')
  await page.getByRole('button', { name: '事业', exact: true }).click()
  await page.getByRole('button', { name: '圣三角', exact: true }).click()
  const draw = page.getByRole('button', { name: '洗牌并抽牌', exact: true })
  await draw.click()
  await expect(draw).toBeDisabled()
  await expect(page.locator('#draw-guidance')).toContainText('正在洗牌')
  const board = page.locator('.spread-board-stage')
  await expect(board).toBeVisible()
  await board.getByRole('button').first().click()
  const revealed = board.locator('.is-revealed .tarot-card-figure__inner')
  await expect(revealed).toHaveCSS('animation-name', 'card-turn')
  await expect.poll(() => page.locator('.spread-board-scroll').evaluate((node) => node.scrollWidth - node.clientWidth)).toBeLessThanOrEqual(1)
})
