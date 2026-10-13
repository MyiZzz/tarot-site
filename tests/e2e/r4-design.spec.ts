import { expect, test } from '@playwright/test'

for (const width of [390, 1440]) {
  test(`reading shortcuts and encyclopedia round trip at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    const nav = page.getByRole('navigation', { name: width < 900 ? '移动端导航' : '主导航' })
    await nav.getByRole('button', { name: /牌卡百科/ }).click()
    await page.getByRole('button', { name: /查看全部 78 张/ }).click()
    const card = page.getByTestId('encyclopedia-list').getByRole('button', { name: /女祭司/ })
    const before = await page.evaluate(() => scrollY)
    await card.click()
    await expect(page.getByRole('article', { name: '女祭司 · 牌卡详情' })).toBeFocused()
    if (width < 900) {
      await expect(page.getByRole('heading', { name: '正位', exact: true })).toBeInViewport()
      await page.getByRole('button', { name: '返回牌卡列表' }).click()
      await expect(card).toBeFocused()
      await expect(card).toBeInViewport()
    } else {
      expect(await page.evaluate(() => scrollY)).toBe(before)
    }
    await nav.getByRole('button', { name: /开始占卜/ }).click()
    await page.getByLabel('占卜问题', { exact: true }).fill('如何推进下一步？')
    await page.getByRole('button', { name: '事业', exact: true }).click()
    await page.getByRole('button', { name: '黄道十二宫', exact: true }).click()
    await page.getByRole('button', { name: '洗牌并抽牌', exact: true }).click()
    await page.getByRole('button', { name: '全部揭晓', exact: true }).click()
    await expect(page.locator('.reading-details')).not.toHaveAttribute('open')
    await page.getByRole('link', { name: '核心结论', exact: true }).click()
    await expect(page.getByRole('heading', { name: '核心结论', exact: true })).toBeInViewport()
    await page.locator('.reading-details summary').click()
    await expect(page.getByRole('heading', { name: '当前状态', exact: true })).toBeVisible()
    await page.getByRole('link', { name: '保存', exact: true }).click()
    await expect(page.getByLabel('记录标题', { exact: true })).toBeInViewport()
    await nav.getByRole('button', { name: /记录中心/ }).click()
    const record = page.locator('.record-card').first()
    await expect(record.locator('.record-details')).not.toHaveAttribute('open')
    await expect(record.getByText('如何推进下一步？', { exact: true })).toHaveCount(1)
    await expect(record.locator('.record-card__question')).toHaveCount(0)
    await record.locator('summary').click()
    await expect(record.getByRole('heading', { name: '风险提醒', exact: true })).toBeVisible()
  })
}
