import { test, expect } from '@playwright/test'
import { loginAsStaff, DEMO_ADMIN, CIRCLE_A } from './utils'

test('admin can view all circles list with search', async ({ page }) => {
  await loginAsStaff(page, DEMO_ADMIN.loginId, DEMO_ADMIN.password)

  await page.goto('/staff/circles/all')
  await page.waitForURL('**/staff/circles/all')
  await expect(page.locator('text=デモ企画A').first()).toBeVisible({ timeout: 15000 })
  await expect(page.locator('text=デモ企画B').first()).toBeVisible({ timeout: 5000 })

  const searchInput = page.getByPlaceholder('企画ID・企画名・団体名などで絞り込み')
  await searchInput.fill(CIRCLE_A)
  await searchInput.press('Enter')
  await expect(page.locator(`text=${CIRCLE_A}`).first()).toBeVisible({ timeout: 10000 })
})

test('admin can view circle detail with edit form and member management', async ({ page }) => {
  await loginAsStaff(page, DEMO_ADMIN.loginId, DEMO_ADMIN.password)

  await page.goto('/staff/circles/all')
  await page.waitForURL('**/staff/circles/all')
  await expect(page.locator('text=デモ企画A').first()).toBeVisible({ timeout: 15000 })

  await page.getByRole('link', { name: CIRCLE_A }).first().click()
  await page.waitForURL(/\/staff\/circles\/[^/]+$/)
  await expect(page.locator('text=企画を編集').first()).toBeVisible({ timeout: 15000 })

  await expect(page.locator('input[name="name"]')).toBeVisible({ timeout: 5000 })
  await expect(page.locator('input[name="nameYomi"]')).toBeVisible({ timeout: 5000 })
  await expect(page.locator('input[name="groupName"]')).toBeVisible({ timeout: 5000 })
  await expect(page.locator('input[name="groupNameYomi"]')).toBeVisible({ timeout: 5000 })
  await expect(page.locator('textarea[name="notes"]')).toBeVisible({ timeout: 5000 })

  await expect(page.locator('input[name="status"][value="pending"]')).toBeVisible({ timeout: 5000 })
  await expect(page.locator('input[name="status"][value="approved"]')).toBeVisible({ timeout: 5000 })
  await expect(page.locator('input[name="status"][value="rejected"]')).toBeVisible({ timeout: 5000 })

  await expect(page.locator('text=企画所属者').first()).toBeVisible({ timeout: 5000 })
  await expect(page.locator('input[name="memberLoginId"]')).toBeVisible({ timeout: 5000 })
})

test('admin can view circle email page', async ({ page }) => {
  await loginAsStaff(page, DEMO_ADMIN.loginId, DEMO_ADMIN.password)

  await page.goto('/staff/circles/0195ec00-0022-7000-8000-000000000001/email')
  await page.waitForURL(/\/staff\/circles\/[^/]+\/email$/)
  await expect(page.locator('text=企画向けメール送信情報を取得できませんでした。').first()).toBeVisible({
    timeout: 15000
  })
  await expect(page.locator('text=メール送信').first()).toBeVisible({ timeout: 5000 })
})

test('admin can view participation types management page', async ({ page }) => {
  await loginAsStaff(page, DEMO_ADMIN.loginId, DEMO_ADMIN.password)

  await page.goto('/staff/circles/participation_types')
  await page.waitForURL('**/staff/circles/participation_types')
  await expect(page.locator('text=参加種別管理').first()).toBeVisible({ timeout: 15000 })
  await expect(page.locator('text=参加種別一覧').first()).toBeVisible({ timeout: 5000 })

  await expect(page.locator('text=模擬店').first()).toBeVisible({ timeout: 10000 })
  await expect(page.locator('text=展示').first()).toBeVisible({ timeout: 5000 })
})

test('admin can navigate to participation type detail and see circles list', async ({ page }) => {
  await loginAsStaff(page, DEMO_ADMIN.loginId, DEMO_ADMIN.password)

  await page.goto('/staff/circles/participation_types')
  await page.waitForURL('**/staff/circles/participation_types')
  await expect(page.locator('text=模擬店').first()).toBeVisible({ timeout: 15000 })

  await page
    .getByRole('link', { name: /模擬店/ })
    .first()
    .click()
  await page.waitForURL(/\/staff\/circles\/participation_types\/[^/]+$/)
  await expect(page.locator('text=企画一覧').first()).toBeVisible({ timeout: 15000 })

  await expect(page.locator('a:has-text("CSVで出力")').first()).toBeVisible({ timeout: 5000 })
})

test('admin can navigate to participation type edit page', async ({ page }) => {
  await loginAsStaff(page, DEMO_ADMIN.loginId, DEMO_ADMIN.password)

  await page.goto('/staff/circles/participation_types')
  await page.waitForURL('**/staff/circles/participation_types')
  await expect(page.locator('text=模擬店').first()).toBeVisible({ timeout: 15000 })

  await page
    .getByRole('link', { name: /模擬店/ })
    .first()
    .click()
  await page.waitForURL(/\/staff\/circles\/participation_types\/[^/]+$/)
  await expect(page.locator('text=企画一覧').first()).toBeVisible({ timeout: 15000 })

  const typeIdMatch = /\/staff\/circles\/participation_types\/([^/?]+)/.exec(page.url())
  const typeId = typeIdMatch ? decodeURIComponent(typeIdMatch[1]) : ''
  expect(typeId).toBeTruthy()

  await page.goto(`/staff/circles/participation_types/${typeId}/edit`)
  await page.waitForURL(/\/staff\/circles\/participation_types\/[^/]+\/edit$/)
  await expect(page.locator('text=参加種別を編集').first()).toBeVisible({ timeout: 15000 })

  await expect(page.locator('input[name="name"]')).toBeVisible({ timeout: 5000 })
  await expect(page.locator('textarea[name="description"]')).toBeVisible({ timeout: 5000 })
  await expect(page.locator('input[name="usersCountMin"]')).toBeVisible({ timeout: 5000 })
  await expect(page.locator('input[name="usersCountMax"]')).toBeVisible({ timeout: 5000 })
})

test('admin can view circle create page', async ({ page }) => {
  await loginAsStaff(page, DEMO_ADMIN.loginId, DEMO_ADMIN.password)

  await page.goto('/staff/circles/create')
  await page.waitForURL('**/staff/circles/create')
  await expect(page.locator('a:has-text("全企画一覧へ戻る")').first()).toBeVisible({ timeout: 15000 })
})

test('admin can view staff circles managed list', async ({ page }) => {
  await loginAsStaff(page, DEMO_ADMIN.loginId, DEMO_ADMIN.password)

  await page.goto('/staff/circles')
  await page.waitForURL('**/staff/circles')
  await expect(page.locator('text=参加種別').first()).toBeVisible({ timeout: 15000 })
})
