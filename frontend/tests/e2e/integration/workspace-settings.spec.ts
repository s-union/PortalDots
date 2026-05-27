import { test, expect } from '@playwright/test'
import { loginFromApi, setCurrentCircleFromApi, DEMO_CIRCLE, CIRCLE_B } from './utils'

test('circle user can view general settings with profile fields', async ({ page }) => {
  await loginFromApi(page, DEMO_CIRCLE.loginId, DEMO_CIRCLE.password)
  await setCurrentCircleFromApi(page, CIRCLE_B)

  await page.goto('/workspace/settings')
  await page.waitForURL('**/workspace/settings')
  await expect(page.locator('text=ユーザー設定').first()).toBeVisible({ timeout: 15000 })
  await expect(page.locator('text=一般設定').first()).toBeVisible({ timeout: 5000 })

  await expect(page.locator('input[name="studentId"]')).toBeVisible({ timeout: 5000 })
  await expect(page.locator('input[name="univemail"]')).toBeVisible({ timeout: 5000 })
  await expect(page.locator('input[name="name"]')).toBeVisible({ timeout: 5000 })
  await expect(page.locator('input[name="nameYomi"]')).toBeVisible({ timeout: 5000 })
  await expect(page.locator('input[name="contactEmail"]')).toBeVisible({ timeout: 5000 })
  await expect(page.locator('input[name="phoneNumber"]')).toBeVisible({ timeout: 5000 })
})

test('circle user can navigate settings tabs via URL', async ({ page }) => {
  await loginFromApi(page, DEMO_CIRCLE.loginId, DEMO_CIRCLE.password)
  await setCurrentCircleFromApi(page, CIRCLE_B)

  await page.goto('/workspace/settings')
  await page.waitForURL('**/workspace/settings')
  await expect(page.locator('text=一般設定').first()).toBeVisible({ timeout: 15000 })

  await page.goto('/workspace/settings/appearance')
  await page.waitForURL('**/workspace/settings/appearance')
  await expect(page.locator('text=外観').first()).toBeVisible({ timeout: 10000 })

  await page.goto('/workspace/settings/password')
  await page.waitForURL('**/workspace/settings/password')
  await expect(page.locator('text=パスワード変更').first()).toBeVisible({ timeout: 10000 })

  await page.goto('/workspace/settings/delete')
  await page.waitForURL('**/workspace/settings/delete')
  await expect(page.locator('text=アカウント削除').first()).toBeVisible({ timeout: 10000 })
})

test('circle user can change appearance theme', async ({ page }) => {
  await loginFromApi(page, DEMO_CIRCLE.loginId, DEMO_CIRCLE.password)
  await setCurrentCircleFromApi(page, CIRCLE_B)

  await page.goto('/workspace/settings/appearance')
  await page.waitForURL('**/workspace/settings/appearance')
  await expect(page.locator('text=外観').first()).toBeVisible({ timeout: 15000 })

  await expect(page.locator('input[type="radio"][name="theme"][value="system"]')).toBeVisible({ timeout: 5000 })
  await expect(page.locator('input[type="radio"][name="theme"][value="light"]')).toBeVisible({ timeout: 5000 })
  await expect(page.locator('input[type="radio"][name="theme"][value="dark"]')).toBeVisible({ timeout: 5000 })

  await page.locator('input[type="radio"][name="theme"][value="dark"]').check()
  await expect(page.locator('input[type="radio"][name="theme"][value="dark"]')).toBeChecked()

  await page.getByRole('button', { name: '保存' }).click()
  await expect(page.locator('input[type="radio"][name="theme"][value="dark"]')).toBeChecked({ timeout: 5000 })

  await page.locator('input[type="radio"][name="theme"][value="system"]').check()
  await page.getByRole('button', { name: '保存' }).click()
})

test('circle user sees password change form', async ({ page }) => {
  await loginFromApi(page, DEMO_CIRCLE.loginId, DEMO_CIRCLE.password)
  await setCurrentCircleFromApi(page, CIRCLE_B)

  await page.goto('/workspace/settings/password')
  await page.waitForURL('**/workspace/settings/password')
  await expect(page.locator('text=パスワード変更').first()).toBeVisible({ timeout: 15000 })

  await expect(page.locator('input[name="currentPassword"]')).toBeVisible({ timeout: 5000 })
  await expect(page.locator('input[name="newPassword"]')).toBeVisible({ timeout: 5000 })
  await expect(page.locator('input[name="confirmPassword"]')).toBeVisible({ timeout: 5000 })
  await expect(page.locator('a:has-text("パスワードをお忘れの場合はこちら")')).toBeVisible({ timeout: 5000 })
})

test('circle user sees account delete page with appropriate state', async ({ page }) => {
  await loginFromApi(page, DEMO_CIRCLE.loginId, DEMO_CIRCLE.password)
  await setCurrentCircleFromApi(page, CIRCLE_B)

  await page.goto('/workspace/settings/delete')
  await page.waitForURL('**/workspace/settings/delete')
  await expect(page.locator('text=アカウント削除').first()).toBeVisible({ timeout: 15000 })
})

test('circle user can view circle detail page', async ({ page }) => {
  await loginFromApi(page, DEMO_CIRCLE.loginId, DEMO_CIRCLE.password)
  await setCurrentCircleFromApi(page, CIRCLE_B)

  await page.goto('/workspace/circles/detail')
  await page.waitForURL('**/workspace/circles/detail')
  await expect(page.locator('text=参加登録').first()).toBeVisible({ timeout: 15000 })
  await expect(page.locator('input[name="name"]')).toBeVisible({ timeout: 10000 })
  await expect(page.locator('input[name="nameYomi"]')).toBeVisible({ timeout: 5000 })
  await expect(page.locator('input[name="groupName"]')).toBeVisible({ timeout: 5000 })
  await expect(page.locator('input[name="groupNameYomi"]')).toBeVisible({ timeout: 5000 })
})

test('circle user can view circle members page with invitation link', async ({ page }) => {
  await loginFromApi(page, DEMO_CIRCLE.loginId, DEMO_CIRCLE.password)
  await setCurrentCircleFromApi(page, CIRCLE_B)

  await page.goto('/workspace/circles/members')
  await page.waitForURL('**/workspace/circles/members')
  await expect(page.locator('text=招待リンク').first()).toBeVisible({ timeout: 15000 })
  await expect(page.locator('text=メンバー一覧').first()).toBeVisible({ timeout: 5000 })

  await expect(page.locator('input[aria-label="招待URL"]')).toBeVisible({ timeout: 5000 })
  await expect(page.locator(`text=${DEMO_CIRCLE.displayName}`).first()).toBeVisible({ timeout: 5000 })
})

test('sub circle member sees circle detail as non-leader', async ({ page }) => {
  await loginFromApi(page, DEMO_CIRCLE.loginId, DEMO_CIRCLE.password)
  await setCurrentCircleFromApi(page, CIRCLE_B)

  await page.goto('/workspace/circles/detail')
  await page.waitForURL('**/workspace/circles/detail')
  await expect(page.locator('text=参加登録').first()).toBeVisible({ timeout: 15000 })
  await expect(page.locator('input[name="name"]')).toBeVisible({ timeout: 10000 })
})

test('circle user can view workspace index redirects to home', async ({ page }) => {
  await loginFromApi(page, DEMO_CIRCLE.loginId, DEMO_CIRCLE.password)
  await setCurrentCircleFromApi(page, CIRCLE_B)

  await page.goto('/workspace')
  await page.waitForURL('**/', { timeout: 10000 })
})
