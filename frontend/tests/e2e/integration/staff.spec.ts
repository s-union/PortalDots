import { test, expect } from '@playwright/test'
import { loginFromApi, DEMO_ADMIN, DEMO_STAFF } from './utils'

test('admin can access staff dashboard', async ({ page }) => {
  await loginFromApi(page, DEMO_ADMIN.loginId, DEMO_ADMIN.password)
  await page.goto('/staff')
  await page.waitForURL('**/staff')
  await expect(page.locator('text=スタッフ').first()).toBeVisible({ timeout: 15000 })
})

test('staff user with content manager role can access staff dashboard', async ({ page }) => {
  await loginFromApi(page, DEMO_STAFF.loginId, DEMO_STAFF.password)
  await page.goto('/staff')
  await page.waitForURL('**/staff')
  await expect(page.locator('text=スタッフ').first()).toBeVisible({ timeout: 15000 })
})

test('admin can create a public page', async ({ page }) => {
  await loginFromApi(page, DEMO_ADMIN.loginId, DEMO_ADMIN.password)
  await page.goto('/staff/pages')
  await page.waitForURL('**/staff/pages')

  const createLink = page.locator('a:has-text("新規お知らせ")')
  await createLink.waitFor({ state: 'visible', timeout: 15000 })
  await createLink.click()
  await page.waitForURL('/staff/pages/create')

  const pageTitle = `E2E Test Page ${Date.now()}`
  await page.fill('input[name="title"]', pageTitle)
  await page.fill('textarea[name="body"]', 'This is an E2E test page body.')

  const isPublicCheckbox = page.locator('input[name="isPublic"]')
  if (!(await isPublicCheckbox.isChecked())) {
    await isPublicCheckbox.check()
  }

  await page.locator('button:has-text("作成")').click()
  await page.waitForURL(/\/staff\/pages\//)
  await expect(page.locator('input[name="title"]')).toHaveValue(pageTitle, { timeout: 10000 })
})

test('admin can view staff pages list', async ({ page }) => {
  await loginFromApi(page, DEMO_ADMIN.loginId, DEMO_ADMIN.password)
  await page.goto('/staff/pages')
  await page.waitForURL('**/staff/pages')

  await expect(page.locator('a:has-text("新規お知らせ")').first()).toBeVisible({ timeout: 15000 })
  await expect(page.locator('a:has-text("CSVで出力")').first()).toBeVisible({ timeout: 5000 })

  // 検索でシードデータのページを確実に絞り込んでから確認（Enterで送信してボタンの曖昧性を回避）
  await page.locator('input[type="search"]').fill('お知らせサンプル')
  await page.locator('input[type="search"]').press('Enter')
  await expect(page.locator('text=お知らせサンプル').first()).toBeVisible({ timeout: 10000 })
})

test('admin can view staff circles list and navigate to circle edit', async ({ page }) => {
  await loginFromApi(page, DEMO_ADMIN.loginId, DEMO_ADMIN.password)
  await page.goto('/staff/circles/all')
  await page.waitForURL('**/staff/circles/all')

  await expect(page.locator('text=デモ企画A').first()).toBeVisible({ timeout: 15000 })
  await expect(page.locator('text=デモ企画B').first()).toBeVisible({ timeout: 5000 })
  await expect(page.locator('text=Aブロック').first()).toBeVisible({ timeout: 5000 })

  // 編集ボタンをクリックして企画編集ページに遷移し、フォームが表示されることを確認
  await page.getByTitle('編集').first().click()
  await page.waitForURL(/\/staff\/circles\/[^/]+$/)
  await expect(page.locator('input[name="name"]')).toBeVisible({ timeout: 10000 })
  await expect(page.locator('input[name="nameYomi"]')).toBeVisible({ timeout: 5000 })
})

test('admin can view staff tags', async ({ page }) => {
  await loginFromApi(page, DEMO_ADMIN.loginId, DEMO_ADMIN.password)
  await page.goto('/staff/tags')
  await page.waitForURL('**/staff/tags')
  await expect(page.locator('text=模擬店').first()).toBeVisible({ timeout: 15000 })
  await expect(page.locator('text=展示').first()).toBeVisible({ timeout: 5000 })
})

test('admin can view staff places', async ({ page }) => {
  await loginFromApi(page, DEMO_ADMIN.loginId, DEMO_ADMIN.password)
  await page.goto('/staff/places')
  await page.waitForURL('**/staff/places')
  await expect(page.locator('text=1号館 101').first()).toBeVisible({ timeout: 15000 })
  await expect(page.locator('text=中庭').first()).toBeVisible({ timeout: 5000 })
})

test('admin can view staff contact categories', async ({ page }) => {
  await loginFromApi(page, DEMO_ADMIN.loginId, DEMO_ADMIN.password)
  await page.goto('/staff/contact-categories')
  await page.waitForURL('**/staff/contact-categories')
  await expect(page.locator('text=公式ウェブサイト掲載内容に関すること').first()).toBeVisible({ timeout: 15000 })
  await expect(page.locator('text=オンライン開催に関すること').first()).toBeVisible({ timeout: 5000 })
})

test('admin can view staff forms list', async ({ page }) => {
  await loginFromApi(page, DEMO_ADMIN.loginId, DEMO_ADMIN.password)
  await page.goto('/staff/forms')
  await page.waitForURL('**/staff/forms')
  await expect(page.locator('text=申請管理').first()).toBeVisible({ timeout: 15000 })
  await expect(page.locator('text=展示チェックフォーム').first()).toBeVisible({ timeout: 15000 })
  await expect(page.locator('text=搬入確認フォーム').first()).toBeVisible({ timeout: 15000 })
  await expect(page.locator('text=非公開フォーム').first()).toBeVisible({ timeout: 15000 })
})

test('admin can view staff users list', async ({ page }) => {
  await loginFromApi(page, DEMO_ADMIN.loginId, DEMO_ADMIN.password)
  await page.goto('/staff/users')
  await page.waitForURL('**/staff/users')
  // ユーザーの表示名は姓・名が別セルのため学籍番号で確認する
  await expect(page.locator('text=DEMO-ADMIN').first()).toBeVisible({ timeout: 15000 })
  await expect(page.locator('text=DEMO-STAFF').first()).toBeVisible({ timeout: 15000 })
  await expect(page.locator('text=DEMO-CIRCLE').first()).toBeVisible({ timeout: 15000 })
})

test('admin can view staff participation types', async ({ page }) => {
  await loginFromApi(page, DEMO_ADMIN.loginId, DEMO_ADMIN.password)
  await page.goto('/staff/participation-types')
  await page.waitForURL('**/staff/participation-types')
  await expect(page.locator('text=模擬店').first()).toBeVisible({ timeout: 15000 })
  await expect(page.locator('text=展示').first()).toBeVisible({ timeout: 5000 })
})

test('admin can view staff activity logs', async ({ page }) => {
  await loginFromApi(page, DEMO_ADMIN.loginId, DEMO_ADMIN.password)
  await page.goto('/staff/activity-logs')
  await page.waitForURL('**/staff/activity-logs')
  await expect(page.locator('text=アクティビティログ').first()).toBeVisible({ timeout: 15000 })
})

test('admin can view staff exports page', async ({ page }) => {
  await loginFromApi(page, DEMO_ADMIN.loginId, DEMO_ADMIN.password)
  await page.goto('/staff/exports')
  await page.waitForURL('**/staff/exports')
  await expect(page.locator('text=CSV / ZIP 出力').first()).toBeVisible({ timeout: 15000 })
})
