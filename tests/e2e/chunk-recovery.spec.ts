import { expect, test } from '@playwright/test'

test('contains a failed records chunk and recovers with a document reload', async ({ page }) => {
  const chunk = /\/assets\/RecordCenter-[^/]+\.js$/
  await page.route(chunk, (route) => route.abort())
  await page.goto('/')
  await page.getByRole('button', { name: '顶部导航：记录中心', exact: true }).click()
  const records = page.locator('#records')
  await expect(records.getByRole('alert')).toContainText('此区域加载失败')
  await expect(page.getByLabel('占卜问题', { exact: true })).toBeAttached()
  await page.getByRole('button', { name: '顶部导航：每日一张', exact: true }).click()
  await page.getByRole('button', { name: '揭晓今日能量', exact: true }).click()
  await expect(page.getByRole('heading', { name: '核心指引', exact: true })).toBeVisible()

  await page.unroute(chunk)
  await records.getByRole('button', { name: '重新加载页面' }).click()
  await page.getByRole('button', { name: '顶部导航：记录中心', exact: true }).click()
  await expect(records.getByRole('heading', { name: '记录中心', exact: true })).toBeVisible()
  await expect(records.getByRole('button', { name: '重新加载页面' })).toHaveCount(0)
})
