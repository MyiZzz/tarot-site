import { expect, test } from '@playwright/test'

test('user can complete a reading flow in the browser', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: '把抽到的 78 张牌，真正铺上桌面。' })).toBeVisible()
  await expect(page.getByTestId('advanced-settings-panel')).toHaveCount(0)
  await expect(page.getByTestId('advanced-settings-toggle')).toHaveCount(0)
  await expect(page.getByLabel('晨间意图')).toHaveCount(0)

  await page.getByLabel('占卜问题').fill('我接下来该怎样处理这段关系？')
  await page.getByRole('button', { name: '爱情' }).click()
  await page.getByRole('button', { name: '圣三角' }).click()
  await page.getByRole('button', { name: '现状 / 阻碍 / 建议' }).click()
  await page.getByRole('button', { name: '洗牌并抽牌' }).click()
  await expect(page.getByRole('button', { name: '分享文案' })).toBeVisible()
  await expect(page.getByRole('button', { name: '下载海报' })).toBeVisible()
  await expect(page.getByTestId('follow-up-accordion')).not.toHaveAttribute('open', /.*/)
  await page.getByRole('button', { name: '全部揭晓' }).click()

  await expect(page.getByRole('heading', { name: '封存本次指引' })).toBeVisible()
  await expect(page.getByLabel('记录标题')).toBeVisible()
})

test('mobile viewport keeps daily guidance minimal and encyclopedia detail compact', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')

  await page.getByRole('button', { name: '揭晓今日能量' }).click()
  await expect(page.getByRole('heading', { name: '核心指引' })).toBeVisible()
  await expect(page.getByLabel('晨间意图')).toHaveCount(0)
  await expect(page.getByRole('button', { name: '保存今日记录' })).toHaveCount(0)

  await page.getByLabel('占卜问题').fill('我现在最该修复的是哪一层人际张力？')
  await page.getByRole('button', { name: '人际' }).click()
  await page.getByRole('button', { name: '圣三角' }).click()
  await page.getByRole('button', { name: '过去 / 现在 / 未来' }).click()
  await page.getByRole('button', { name: '洗牌并抽牌' }).click()

  await expect(page.getByRole('heading', { name: '结果解读' })).toBeVisible()

  await page.getByRole('button', { name: '牌卡百科', exact: true }).click()
  await page.getByRole('button', { name: /查看全部 78 张/i }).click()

  const encyclopediaList = page.locator('[data-testid="encyclopedia-list"]')
  await expect(encyclopediaList).toBeVisible()
  await page.getByRole('button', { name: /愚者/i }).click()
  await expect(page.locator('.encyclopedia-detail__body')).toBeVisible()

  const encyclopediaDisplay = await encyclopediaList.evaluate(
    (element) => window.getComputedStyle(element).display,
  )
  const encyclopediaColumns = await encyclopediaList.evaluate(
    (element) => window.getComputedStyle(element).gridTemplateColumns,
  )

  expect(encyclopediaDisplay).toBe('grid')
  expect(encyclopediaColumns).not.toBe('none')
})
