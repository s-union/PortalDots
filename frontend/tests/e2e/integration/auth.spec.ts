import { test, expect } from '@playwright/test'
import { loginFromUi, DEMO_CIRCLE } from './utils'

test('circle user can log in through the UI', async ({ page }) => {
  await loginFromUi(page, DEMO_CIRCLE.loginId, DEMO_CIRCLE.password)
  await expect(page.locator('text=お知らせ').first()).toBeVisible({ timeout: 15000 })
  await expect(page.locator(`text=${DEMO_CIRCLE.displayName}`).first()).toBeVisible({ timeout: 5000 })
})

test('wrong password shows a login error', async ({ page }) => {
  await page.goto('/login')
  await page.waitForURL('/login')
  await page.getByLabel('学籍番号または連絡先メールアドレス').fill(DEMO_CIRCLE.loginId)
  await page.getByLabel('パスワード').fill('wrong-password')
  await page.getByRole('button', { name: 'ログイン' }).click()
  await expect(page.locator('text=ログイン情報が正しくありません').first()).toBeVisible({ timeout: 10000 })
})

test('unauthenticated user visiting workspace is redirected to login', async ({ page }) => {
  await page.goto('/workspace/pages')
  await page.waitForURL('**/login')
  await expect(page.getByRole('button', { name: 'ログイン' })).toBeVisible({ timeout: 10000 })
})
