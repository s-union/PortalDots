import { test, expect } from '@playwright/test'
import { loginAsStaff, DEMO_ADMIN } from './utils'

test('admin can view staff documents list with search and export', async ({ page }) => {
  await loginAsStaff(page, DEMO_ADMIN.loginId, DEMO_ADMIN.password)

  await page.goto('/staff/documents')
  await page.waitForURL('**/staff/documents')
  await expect(page.getByRole('link', { name: '新規配布資料' }).first()).toBeVisible({ timeout: 15000 })
  await expect(page.locator('a:has-text("CSVで出力")').first()).toBeVisible({ timeout: 5000 })

  await expect(page.getByPlaceholder('資料ID・資料名・説明・ファイル形式で絞り込み')).toBeVisible({ timeout: 5000 })
})

test('admin can search documents by keyword', async ({ page }) => {
  await loginAsStaff(page, DEMO_ADMIN.loginId, DEMO_ADMIN.password)

  await page.goto('/staff/documents')
  await page.waitForURL('**/staff/documents')
  await expect(page.getByRole('link', { name: '新規配布資料' }).first()).toBeVisible({ timeout: 15000 })

  const searchInput = page.getByPlaceholder('資料ID・資料名・説明・ファイル形式で絞り込み')
  await searchInput.fill('デモサイトへのログイン方法')
  await searchInput.press('Enter')
  await expect(page.locator('text=デモサイトへのログイン方法').first()).toBeVisible({ timeout: 10000 })
})

test('admin can view document create page with all fields', async ({ page }) => {
  await loginAsStaff(page, DEMO_ADMIN.loginId, DEMO_ADMIN.password)

  await page.goto('/staff/documents/create')
  await page.waitForURL('**/staff/documents/create')
  await expect(page.locator('text=配布資料を新規作成').first()).toBeVisible({ timeout: 15000 })

  await expect(page.locator('input[name="name"]')).toBeVisible({ timeout: 5000 })
  await expect(page.locator('textarea[name="description"]')).toBeVisible({ timeout: 5000 })
  await expect(page.locator('textarea[name="notes"]')).toBeVisible({ timeout: 5000 })
  await expect(page.locator('input[name="file"]')).toBeVisible({ timeout: 5000 })
  await expect(page.locator('input[name="isImportant"]')).toBeVisible({ timeout: 5000 })
  await expect(page.locator('input[name="isPublic"]')).toBeVisible({ timeout: 5000 })
})

test('admin can navigate from documents list to edit page', async ({ page }) => {
  await loginAsStaff(page, DEMO_ADMIN.loginId, DEMO_ADMIN.password)

  await page.goto('/staff/documents')
  await page.waitForURL('**/staff/documents')
  await expect(page.getByRole('link', { name: '新規配布資料' }).first()).toBeVisible({ timeout: 15000 })

  const editButton = page.getByTitle('編集').first()
  await editButton.waitFor({ state: 'visible', timeout: 10000 })
  await editButton.click()
  await page.waitForURL(/\/staff\/documents\/[^/]+\/edit$/)
  await expect(page.locator('text=配布資料を編集').first()).toBeVisible({ timeout: 15000 })

  await expect(page.locator('input[name="name"]')).toBeVisible({ timeout: 5000 })
  await expect(page.locator('textarea[name="description"]')).toBeVisible({ timeout: 5000 })
  await expect(page.locator('textarea[name="notes"]')).toBeVisible({ timeout: 5000 })
  await expect(page.locator('input[name="isImportant"]')).toBeVisible({ timeout: 5000 })
  await expect(page.locator('input[name="isPublic"]')).toBeVisible({ timeout: 5000 })
})
