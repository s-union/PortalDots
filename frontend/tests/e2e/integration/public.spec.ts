import { test, expect } from '@playwright/test'
import { loginFromApi, setCurrentCircleFromApi, DEMO_CIRCLE, CIRCLE_B } from './utils'

const API_BASE_URL = process.env.API_BASE_URL ?? 'http://127.0.0.1:8080'

test.beforeEach(async ({ page }) => {
  await page.context().clearCookies()
})

test('public top page shows demo content', async ({ page }) => {
  await page.goto('/')
  await page.waitForURL('/')
  await expect(page.locator('a:has-text("ログイン")').first()).toBeVisible({ timeout: 10000 })
  await expect(page.locator('text=PortalDots').first()).toBeVisible({ timeout: 5000 })
  await expect(page.locator('text=お知らせ').first()).toBeVisible({ timeout: 5000 })
  await expect(page.locator('text=ログイン方法').first()).toBeVisible({ timeout: 5000 })
  await expect(page.locator('text=PortalDots デモサイトへようこそ！').first()).toBeVisible({ timeout: 5000 })
})

test('public pages list is reachable', async ({ page }) => {
  await page.goto('/public/pages')
  await page.waitForURL('/public/pages')
  await expect(page.locator('text=お知らせ').first()).toBeVisible({ timeout: 10000 })
  // リストにアイテムが表示されていることを確認（ページタイトルは蓄積された E2E テストデータで変動するため検索で絞り込む）
  await expect(page.getByRole('link', { name: /PortalDots/ }).first()).toBeVisible({ timeout: 10000 })
})

test('clicking a page in the public list navigates to detail and shows body content', async ({ page }) => {
  // 公開ページ一覧の最初のリスト項目リンクをクリックして詳細ページへのナビゲーションを確認
  await page.goto('/public/pages')
  await page.waitForURL('/public/pages')
  const firstLink = page.locator('a[href^="/public/pages/"]').first()
  await firstLink.waitFor({ state: 'visible', timeout: 15000 })
  await firstLink.click()
  await page.waitForURL(/\/public\/pages\//)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10000 })

  // APIでシードデータのページIDを取得して詳細ページのコンテンツを確認
  const apiResponse = await page.request.get(
    `${API_BASE_URL}/v1/public/pages?query=${encodeURIComponent('お知らせサンプル')}&page=1&pageSize=5`
  )
  const data = await apiResponse.json()
  const targetPage = (data.items ?? []).find((item: { title: string }) => item.title === 'お知らせサンプル')
  expect(targetPage).toBeTruthy()

  await page.goto(`/public/pages/${encodeURIComponent(targetPage.id)}`)
  await page.waitForURL(/\/public\/pages\//)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('お知らせサンプル', { timeout: 10000 })
  await expect(page.locator('text=このような形でお知らせを掲載できます。').first()).toBeVisible({ timeout: 5000 })
  // 関連する配布資料セクションにドキュメントリンクが表示される
  await expect(page.locator('text=サンプル配布資料').first()).toBeVisible({ timeout: 5000 })
})

test('public documents list is reachable', async ({ page }) => {
  await page.goto('/public/documents')
  await page.waitForURL('/public/documents')
  await expect(page.locator('text=配布資料').first()).toBeVisible({ timeout: 10000 })
  await expect(page.locator('text=デモサイトへのログイン方法').first()).toBeVisible({ timeout: 5000 })
  await expect(page.locator('text=サンプル配布資料').first()).toBeVisible({ timeout: 5000 })
})

test('authenticated user visiting /public/pages is redirected to workspace pages', async ({ page }) => {
  await loginFromApi(page, DEMO_CIRCLE.loginId, DEMO_CIRCLE.password)
  await setCurrentCircleFromApi(page, CIRCLE_B)
  await page.goto('/public/pages')
  await page.waitForURL('**/workspace/pages', { timeout: 10000 })
})
