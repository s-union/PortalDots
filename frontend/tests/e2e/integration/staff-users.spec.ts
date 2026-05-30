import { test, expect } from '@playwright/test'
import { loginAsStaff, DEMO_ADMIN } from './utils'

test('admin can view user detail page', async ({ page }) => {
  await loginAsStaff(page, DEMO_ADMIN.loginId, DEMO_ADMIN.password)

  await page.goto('/staff/users')
  await page.waitForURL('**/staff/users')
  await expect(page.locator('text=DEMO-CIRCLE').first()).toBeVisible({ timeout: 15000 })

  const searchInput = page.getByPlaceholder('名前・学生番号・メールアドレスで絞り込み')
  await searchInput.fill('DEMO-CIRCLE')
  await searchInput.press('Enter')
  await expect(page.locator('text=DEMO-CIRCLE').first()).toBeVisible({ timeout: 10000 })

  await page.getByTitle('編集').first().click()
  await expect(page.locator('text=ユーザーを編集').first()).toBeVisible({ timeout: 15000 })
})

test('admin can view staff permissions list', async ({ page }) => {
  await loginAsStaff(page, DEMO_ADMIN.loginId, DEMO_ADMIN.password)

  await page.goto('/staff/permissions')
  await page.waitForURL('**/staff/permissions')
  await expect(page.locator('text=スタッフの権限設定').first()).toBeVisible({ timeout: 15000 })

  await expect(page.getByPlaceholder('名前・権限・学生番号で絞り込み')).toBeVisible({ timeout: 5000 })
})

test('admin can navigate to user permission editor', async ({ page }) => {
  await loginAsStaff(page, DEMO_ADMIN.loginId, DEMO_ADMIN.password)

  await page.goto('/staff/permissions')
  await page.waitForURL('**/staff/permissions')
  await expect(page.locator('text=スタッフの権限設定').first()).toBeVisible({ timeout: 15000 })

  const searchInput = page.getByPlaceholder('名前・権限・学生番号で絞り込み')
  await searchInput.fill('DEMO-STAFF')
  await searchInput.press('Enter')
  await expect(page.locator('text=DEMO-STAFF').first()).toBeVisible({ timeout: 10000 })

  await page.getByTitle('編集').first().click()
  await page.waitForURL(/\/staff\/permissions\/[^/]+$/)
  await expect(page.locator('text=スタッフ権限を編集').first()).toBeVisible({ timeout: 15000 })

  await expect(page.locator('text=DEMO-STAFF').first()).toBeVisible({ timeout: 5000 })
})

test('admin can view staff settings page with navigation links', async ({ page }) => {
  await loginAsStaff(page, DEMO_ADMIN.loginId, DEMO_ADMIN.password)

  await page.goto('/staff/settings')
  await page.waitForURL('**/staff/settings')
  await expect(page.locator('text=PortalDots の設定').first()).toBeVisible({ timeout: 15000 })

  await expect(page.getByRole('link', { name: /お問い合わせ受付設定/ }).first()).toBeVisible({ timeout: 5000 })
  await expect(page.getByRole('link', { name: /企画タグ管理/ }).first()).toBeVisible({ timeout: 5000 })
  await expect(page.getByRole('link', { name: /場所情報管理/ }).first()).toBeVisible({ timeout: 5000 })
  await expect(page.getByRole('link', { name: /CSV \/ ZIP 出力/ }).first()).toBeVisible({ timeout: 5000 })
  await expect(page.getByRole('link', { name: /Markdown ガイド/ }).first()).toBeVisible({ timeout: 5000 })
})

test('admin can view markdown guide page', async ({ page }) => {
  await loginAsStaff(page, DEMO_ADMIN.loginId, DEMO_ADMIN.password)

  await page.goto('/staff/markdown-guide')
  await page.waitForURL('**/staff/markdown-guide')
  await expect(page.locator('text=Markdown ガイド').first()).toBeVisible({ timeout: 15000 })

  await expect(page.locator('text=見出し').first()).toBeVisible({ timeout: 5000 })
  await expect(page.locator('text=箇条書き').first()).toBeVisible({ timeout: 5000 })
  await expect(page.locator('text=強調').first()).toBeVisible({ timeout: 5000 })
})

test('admin can view staff mails page', async ({ page }) => {
  await loginAsStaff(page, DEMO_ADMIN.loginId, DEMO_ADMIN.password)

  await page.goto('/staff/mails')
  await page.waitForURL('**/staff/mails')
  await expect(page.locator('text=メール配信設定').first()).toBeVisible({ timeout: 15000 })
  await expect(page.locator('text=配信履歴').first()).toBeVisible({ timeout: 5000 })
})

test('admin can view users list with CSV export', async ({ page }) => {
  await loginAsStaff(page, DEMO_ADMIN.loginId, DEMO_ADMIN.password)

  await page.goto('/staff/users')
  await page.waitForURL('**/staff/users')
  await expect(page.locator('text=DEMO-ADMIN').first()).toBeVisible({ timeout: 15000 })

  await expect(page.locator('a:has-text("CSVで出力")').first()).toBeVisible({ timeout: 5000 })
  await expect(page.getByPlaceholder('名前・学生番号・メールアドレスで絞り込み')).toBeVisible({ timeout: 5000 })
})
