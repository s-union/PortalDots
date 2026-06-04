import { test, expect } from '@playwright/test'
import {
  loginFromApi,
  loginAsStaff,
  setCurrentCircleFromApi,
  DEMO_CIRCLE,
  DEMO_ADMIN,
  CIRCLE_A,
  CIRCLE_B
} from './utils'

test('authenticated user can log out via sidebar', async ({ page }) => {
  await loginFromApi(page, DEMO_CIRCLE.loginId, DEMO_CIRCLE.password)
  await setCurrentCircleFromApi(page, CIRCLE_B)

  await page.goto('/')
  await page.waitForURL('**/')
  await expect(page.locator(`text=${DEMO_CIRCLE.displayName}`).first()).toBeVisible({ timeout: 15000 })

  await page.getByRole('button', { name: 'ログアウト' }).click()
  await page.waitForURL('**/login', { timeout: 15000 })
})

test('user can switch between circles via circle selector', async ({ page }) => {
  await loginFromApi(page, DEMO_CIRCLE.loginId, DEMO_CIRCLE.password)
  await setCurrentCircleFromApi(page, CIRCLE_A)

  await page.goto('/circles/select')
  await page.waitForURL('**/circles/select')
  await expect(page.locator('text=作業対象の企画を選択します。').first()).toBeVisible({ timeout: 15000 })

  await expect(page.locator(`button:has-text("${CIRCLE_A}")`).first()).toBeVisible({ timeout: 5000 })
  await expect(page.locator(`button:has-text("${CIRCLE_B}")`).first()).toBeVisible({ timeout: 5000 })

  await page.locator(`button:has-text("${CIRCLE_B}")`).click()
  await page.waitForURL('**/', { timeout: 10000 })
})

test('unauthenticated user visiting staff page is redirected to login', async ({ page }) => {
  await page.goto('/staff')
  await page.waitForURL('**/login', { timeout: 10000 })
})

test('non-staff user visiting staff page is redirected', async ({ page }) => {
  await loginFromApi(page, DEMO_CIRCLE.loginId, DEMO_CIRCLE.password)
  await setCurrentCircleFromApi(page, CIRCLE_B)

  await page.goto('/staff')
  await page.waitForURL('**/', { timeout: 10000 })
})

test('staff user can switch to staff mode from home', async ({ page }) => {
  await loginAsStaff(page, DEMO_ADMIN.loginId, DEMO_ADMIN.password)

  await page.goto('/')
  await page.waitForURL('**/')

  const staffModeLink = page.getByRole('link', { name: /スタッフモード/ })
  await staffModeLink.first().waitFor({ state: 'visible', timeout: 10000 })
  await staffModeLink.first().click()
  await page.waitForURL('**/staff', { timeout: 10000 })
  await expect(page.locator('text=スタッフ').first()).toBeVisible({ timeout: 15000 })
})

test('staff user can switch back to normal mode', async ({ page }) => {
  await loginAsStaff(page, DEMO_ADMIN.loginId, DEMO_ADMIN.password)

  await page.goto('/staff')
  await page.waitForURL('**/staff')
  await expect(page.locator('text=スタッフ').first()).toBeVisible({ timeout: 15000 })

  const normalModeLink = page.getByRole('link', { name: /一般モード/ })
  await normalModeLink.first().waitFor({ state: 'visible', timeout: 10000 })
  await normalModeLink.first().click()
  await page.waitForURL('**/', { timeout: 10000 })
})

test('non-existent route shows 404 page', async ({ page }) => {
  await page.goto('/this-page-does-not-exist-at-all')
  await page.waitForURL('**/this-page-does-not-exist-at-all')
  await expect(page.locator('text=お探しのページは見つかりませんでした').first()).toBeVisible({ timeout: 10000 })
})

test('authenticated user can navigate workspace pages via links', async ({ page }) => {
  await loginFromApi(page, DEMO_CIRCLE.loginId, DEMO_CIRCLE.password)
  await setCurrentCircleFromApi(page, CIRCLE_B)

  await page.goto('/')
  await page.waitForURL('**/')

  await page.goto('/workspace/pages')
  await page.waitForURL('**/workspace/pages')
  await expect(page.locator('text=お知らせ').first()).toBeVisible({ timeout: 15000 })

  await page.goto('/workspace/forms?status=all')
  await page.waitForURL('**/workspace/forms**')
  await expect(page.locator('text=申請').first()).toBeVisible({ timeout: 15000 })

  await page.goto('/workspace/documents')
  await page.waitForURL('**/workspace/documents')
  await expect(page.locator('text=配布資料').first()).toBeVisible({ timeout: 15000 })

  await page.goto('/workspace/contact')
  await page.waitForURL('**/workspace/contact')
  await expect(page.locator('text=お問い合わせ').first()).toBeVisible({ timeout: 15000 })
})

test('login page shows form fields and links', async ({ page }) => {
  await page.goto('/login')
  await page.waitForURL('/login')

  await expect(page.getByLabel('学籍番号または連絡先メールアドレス')).toBeVisible({ timeout: 10000 })
  await expect(page.getByLabel('パスワード')).toBeVisible({ timeout: 5000 })
  await expect(page.getByRole('button', { name: 'ログイン' })).toBeVisible({ timeout: 5000 })
})

test('staff user can navigate between staff sections', async ({ page }) => {
  await loginAsStaff(page, DEMO_ADMIN.loginId, DEMO_ADMIN.password)

  await page.goto('/staff/pages')
  await page.waitForURL('**/staff/pages')
  await expect(page.locator('text=お知らせ').first()).toBeVisible({ timeout: 15000 })

  await page.goto('/staff/forms')
  await page.waitForURL('**/staff/forms')
  await expect(page.locator('text=申請管理').first()).toBeVisible({ timeout: 15000 })

  await page.goto('/staff/documents')
  await page.waitForURL('**/staff/documents')
  await expect(page.getByRole('link', { name: '新規配布資料' }).first()).toBeVisible({ timeout: 15000 })

  await page.goto('/staff/circles/all')
  await page.waitForURL('**/staff/circles/all')
  await expect(page.locator('text=デモ企画A').first()).toBeVisible({ timeout: 15000 })

  await page.goto('/staff/users')
  await page.waitForURL('**/staff/users')
  await expect(page.locator('text=DEMO-ADMIN').first()).toBeVisible({ timeout: 15000 })
})
