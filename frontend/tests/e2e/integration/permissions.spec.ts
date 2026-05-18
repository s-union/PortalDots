import { test, expect } from '@playwright/test'
import { loginFromApi, verifyStaffFromUi, updateStaffPermissionsFromApi, DEMO_ADMIN, DEMO_CIRCLE } from './utils'

test.beforeEach(async ({ page }) => {
  await page.context().clearCookies()
  await updateStaffPermissionsFromApi(DEMO_CIRCLE.userId, [])
})

test.afterEach(async () => {
  await updateStaffPermissionsFromApi(DEMO_CIRCLE.userId, [])
})

test('user without staff permissions cannot access staff pages', async ({ page }) => {
  await loginFromApi(page, DEMO_CIRCLE.loginId, DEMO_CIRCLE.password)

  await page.goto('/staff')
  await expect(page).not.toHaveURL(/\/staff$/, { timeout: 5000 })

  await expect(page.locator('a:has-text("スタッフモードへ")').first()).not.toBeVisible({ timeout: 5000 })
})

test('admin can grant staff.pages.read permission via UI and user gains access to staff pages', async ({ page }) => {
  await updateStaffPermissionsFromApi(DEMO_CIRCLE.userId, ['staff.documents.read'])

  await loginFromApi(page, DEMO_ADMIN.loginId, DEMO_ADMIN.password)
  await verifyStaffFromUi(page)

  await page.goto('/staff/permissions')
  await page.waitForURL('**/staff/permissions')

  await page.locator('input[name="query"], input[type="search"]').first().fill(DEMO_CIRCLE.displayName)
  await page.getByRole('button', { name: '絞り込み' }).click()

  await expect(page.locator(`text=${DEMO_CIRCLE.displayName}`).first()).toBeVisible({ timeout: 15000 })
  await page.getByTitle('編集').first().click()
  await page.waitForURL(`**/staff/permissions/${DEMO_CIRCLE.userId}`)

  const pagesReadCheckbox = page
    .locator('label')
    .filter({ hasText: 'お知らせ(閲覧)' })
    .locator('input[type="checkbox"]')
  await pagesReadCheckbox.waitFor({ state: 'visible', timeout: 10000 })
  if (!(await pagesReadCheckbox.isChecked())) {
    await pagesReadCheckbox.check()
  }

  const [saveResp] = await Promise.all([
    page.waitForResponse(
      (resp) => resp.url().includes(`/staff/permissions/${DEMO_CIRCLE.userId}`) && resp.request().method() === 'PUT',
      { timeout: 15000 }
    ),
    page.getByRole('button', { name: '保存' }).click()
  ])
  expect(saveResp.status()).toBe(200)
  await expect(page.locator('text=スタッフ権限を更新しました。').first()).toBeVisible({ timeout: 10000 })

  await page.context().clearCookies()
  await loginFromApi(page, DEMO_CIRCLE.loginId, DEMO_CIRCLE.password)

  await expect(page.locator('a:has-text("スタッフモードへ")').first()).toBeVisible({ timeout: 15000 })

  await verifyStaffFromUi(page)

  await page.goto('/staff/pages')
  await page.waitForURL('**/staff/pages')
  await expect(page.locator('text=お知らせ').first()).toBeVisible({ timeout: 15000 })
})

test('admin can grant permissions via API and user accesses staff pages through UI', async ({ page }) => {
  await updateStaffPermissionsFromApi(DEMO_CIRCLE.userId, ['staff.pages.read'])

  await loginFromApi(page, DEMO_CIRCLE.loginId, DEMO_CIRCLE.password)

  await expect(page.locator('a:has-text("スタッフモードへ")').first()).toBeVisible({ timeout: 15000 })

  await verifyStaffFromUi(page)

  await page.goto('/staff/pages')
  await page.waitForURL('**/staff/pages')
  await expect(page.locator('text=お知らせ').first()).toBeVisible({ timeout: 15000 })

  const searchInput = page.locator('input[type="search"]')
  await searchInput.fill('お知らせサンプル')
  await searchInput.press('Enter')
  await expect(page.locator('text=お知らせサンプル').first()).toBeVisible({ timeout: 10000 })
})

test('revoking staff permissions removes access to staff pages', async ({ page }) => {
  await updateStaffPermissionsFromApi(DEMO_CIRCLE.userId, ['staff.pages.read'])

  await loginFromApi(page, DEMO_CIRCLE.loginId, DEMO_CIRCLE.password)
  await expect(page.locator('a:has-text("スタッフモードへ")').first()).toBeVisible({ timeout: 15000 })

  await updateStaffPermissionsFromApi(DEMO_CIRCLE.userId, [])

  await page.reload()
  await page.waitForLoadState('networkidle')

  await expect(page.locator('a:has-text("スタッフモードへ")').first()).not.toBeVisible({ timeout: 10000 })

  await page.goto('/staff')
  await expect(page).not.toHaveURL(/\/staff$/, { timeout: 5000 })
})
