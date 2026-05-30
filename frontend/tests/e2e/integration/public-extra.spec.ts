import { test, expect } from '@playwright/test'

test('public support page shows browser information', async ({ page }) => {
  await page.goto('/support')
  await page.waitForURL('/support')
  await expect(page.locator('text=ブラウザ環境について').first()).toBeVisible({ timeout: 10000 })
  await expect(page.locator('text=Microsoft Edge').first()).toBeVisible({ timeout: 5000 })
  await expect(page.locator('text=Google Chrome').first()).toBeVisible({ timeout: 5000 })
})

test('public password reset page shows form', async ({ page }) => {
  await page.goto('/password/reset')
  await page.waitForURL('/password/reset')
  await expect(page.locator('text=パスワードの再設定').first()).toBeVisible({ timeout: 10000 })
  await expect(page.locator('input#login-id')).toBeVisible({ timeout: 5000 })
  await expect(page.getByRole('button', { name: /再設定のためのメールを送信/ })).toBeVisible({ timeout: 5000 })
})

test('public password reset shows error for empty submission', async ({ page }) => {
  await page.goto('/password/reset')
  await page.waitForURL('/password/reset')
  await expect(page.locator('text=パスワードの再設定').first()).toBeVisible({ timeout: 10000 })

  await page.getByRole('button', { name: /再設定のためのメールを送信/ }).click()
  await expect(page.locator('input#login-id')).toBeVisible({ timeout: 5000 })
})

test('public top page has navigation links', async ({ page }) => {
  await page.goto('/')
  await page.waitForURL('/')
  await expect(page.locator('a:has-text("ログイン")').first()).toBeVisible({ timeout: 10000 })
  await expect(page.locator('text=PortalDots').first()).toBeVisible({ timeout: 5000 })
})

test('public documents page shows download links', async ({ page }) => {
  await page.goto('/public/documents')
  await page.waitForURL('/public/documents')
  await expect(page.locator('text=配布資料').first()).toBeVisible({ timeout: 10000 })

  const firstDocLink = page.locator('a[href*="/documents/"]').first()
  await firstDocLink.waitFor({ state: 'visible', timeout: 10000 })
  await expect(firstDocLink).toHaveAttribute('href', /\/documents\//)
})

test('public pages list shows page links', async ({ page }) => {
  await page.goto('/public/pages')
  await page.waitForURL('/public/pages')
  await expect(page.locator('text=お知らせ').first()).toBeVisible({ timeout: 10000 })

  const firstPageLink = page.locator('a[href^="/public/pages/"]').first()
  await firstPageLink.waitFor({ state: 'visible', timeout: 10000 })
  await expect(firstPageLink).toHaveAttribute('href', /\/public\/pages\//)
})

test('login page is accessible from public top page', async ({ page }) => {
  await page.goto('/')
  await page.waitForURL('/')

  await page.locator('a:has-text("ログイン")').first().click()
  await page.waitForURL('**/login', { timeout: 10000 })
  await expect(page.getByRole('button', { name: 'ログイン' })).toBeVisible({ timeout: 10000 })
})

test('public top page shows news section', async ({ page }) => {
  await page.goto('/')
  await page.waitForURL('/')
  await expect(page.locator('text=お知らせ').first()).toBeVisible({ timeout: 10000 })
  await expect(page.locator('text=ログイン方法').first()).toBeVisible({ timeout: 5000 })
})

test('register page is accessible', async ({ page }) => {
  await page.goto('/register')
  await page.waitForURL('/register')
  await expect(page.locator('text=ユーザー登録').first()).toBeVisible({ timeout: 10000 })
  await expect(page.getByRole('button', { name: /認証URLを送信/ })).toBeVisible({ timeout: 5000 })
})
