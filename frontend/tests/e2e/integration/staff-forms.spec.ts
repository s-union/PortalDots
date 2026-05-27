import { test, expect, type Page } from '@playwright/test'
import { loginAsStaff, DEMO_ADMIN } from './utils'

function toDatetimeLocalValue(date: Date): string {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16)
}

async function createFormViaUi(page: Page, formName: string): Promise<string> {
  await page.goto('/staff/forms/create')
  await page.waitForURL('**/staff/forms/create')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('フォームを新規作成', { timeout: 15000 })

  await page.locator('input[name="name"]').fill(formName)
  await page.locator('input[name="maxAnswers"]').fill('1')
  await page.locator('input[name="openAt"]').fill(toDatetimeLocalValue(new Date(Date.now() - 60 * 60 * 1000)))
  await page.locator('input[name="closeAt"]').fill(toDatetimeLocalValue(new Date(Date.now() + 24 * 60 * 60 * 1000)))

  const isPublicCheckbox = page.locator('input[name="isPublic"]')
  if (!(await isPublicCheckbox.isChecked())) {
    await isPublicCheckbox.check()
  }

  await page.getByRole('button', { name: '保存' }).click()
  await page.waitForURL(/\/staff\/forms\/[^/]+\/editor$/)
  return page.url()
}

test('admin can view form create page with all fields', async ({ page }) => {
  await loginAsStaff(page, DEMO_ADMIN.loginId, DEMO_ADMIN.password)

  await page.goto('/staff/forms/create')
  await page.waitForURL('**/staff/forms/create')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('フォームを新規作成', { timeout: 15000 })

  await expect(page.locator('input[name="name"]')).toBeVisible({ timeout: 5000 })
  await expect(page.locator('input[name="maxAnswers"]')).toBeVisible({ timeout: 5000 })
  await expect(page.locator('input[name="openAt"]')).toBeVisible({ timeout: 5000 })
  await expect(page.locator('input[name="closeAt"]')).toBeVisible({ timeout: 5000 })
  await expect(page.locator('input[name="isPublic"]')).toBeVisible({ timeout: 5000 })
})

test('admin can create form and navigate to editor', async ({ page }) => {
  await loginAsStaff(page, DEMO_ADMIN.loginId, DEMO_ADMIN.password)

  const formName = `E2E フォーム作成テスト ${Date.now()}`
  await createFormViaUi(page, formName)

  await expect(page.getByRole('heading', { level: 1 })).toHaveText(formName, { timeout: 15000 })
  await page.waitForURL(/\/staff\/forms\/[^/]+\/editor$/)
})

test('admin can access form editor after creating form', async ({ page }) => {
  await loginAsStaff(page, DEMO_ADMIN.loginId, DEMO_ADMIN.password)

  const formName = `E2E エディタテスト ${Date.now()}`
  const editorUrl = await createFormViaUi(page, formName)

  await expect(page.getByRole('heading', { level: 1 })).toHaveText(formName, { timeout: 15000 })
  expect(editorUrl).toMatch(/\/staff\/forms\/[^/]+\/editor$/)
})

test('admin can navigate form tabs between answers, editor, and settings', async ({ page }) => {
  await loginAsStaff(page, DEMO_ADMIN.loginId, DEMO_ADMIN.password)

  const formName = `E2E タブテスト ${Date.now()}`
  await createFormViaUi(page, formName)

  const formIdMatch = /\/staff\/forms\/([^/]+)\/editor$/.exec(new URL(page.url()).pathname)
  const formId = formIdMatch ? decodeURIComponent(formIdMatch[1]) : ''
  expect(formId).toBeTruthy()

  await page.goto(`/staff/forms/${formId}/edit`)
  await page.waitForURL(/\/staff\/forms\/[^/]+\/edit$/)
  await expect(page.locator('text=設定').first()).toBeVisible({ timeout: 15000 })

  await expect(page.locator('input[name="name"]')).toBeVisible({ timeout: 5000 })
  await expect(page.locator('input[name="openAt"]')).toBeVisible({ timeout: 5000 })
  await expect(page.locator('input[name="closeAt"]')).toBeVisible({ timeout: 5000 })
  await expect(page.locator('input[name="maxAnswers"]')).toBeVisible({ timeout: 5000 })

  await page.goto(`/staff/forms/${formId}/answers`)
  await page.waitForURL(/\/staff\/forms\/[^/]+\/answers$/)
  await expect(page.locator(`text=${formName}`).first()).toBeVisible({ timeout: 15000 })
})

test('admin can view form preview page', async ({ page }) => {
  await loginAsStaff(page, DEMO_ADMIN.loginId, DEMO_ADMIN.password)

  const formName = `E2E プレビューテスト ${Date.now()}`
  await createFormViaUi(page, formName)

  const formIdMatch = /\/staff\/forms\/([^/]+)\/editor$/.exec(new URL(page.url()).pathname)
  const formId = formIdMatch ? decodeURIComponent(formIdMatch[1]) : ''
  expect(formId).toBeTruthy()

  await page.goto(`/staff/forms/${formId}/preview`)
  await page.waitForURL(/\/staff\/forms\/[^/]+\/preview$/)
  await expect(page.locator('text=プレビュー').first()).toBeVisible({ timeout: 15000 })
  await expect(page.locator(`text=${formName}`).first()).toBeVisible({ timeout: 5000 })
  await expect(page.locator('text=このフォームから実際に送信することはできません。').first()).toBeVisible({
    timeout: 5000
  })
})

test('admin can view not answered circles for form', async ({ page }) => {
  await loginAsStaff(page, DEMO_ADMIN.loginId, DEMO_ADMIN.password)

  const formName = `E2E 未回答テスト ${Date.now()}`
  await createFormViaUi(page, formName)

  const formIdMatch = /\/staff\/forms\/([^/]+)\/editor$/.exec(new URL(page.url()).pathname)
  const formId = formIdMatch ? decodeURIComponent(formIdMatch[1]) : ''
  expect(formId).toBeTruthy()

  await page.goto(`/staff/forms/${formId}/not_answered`)
  await page.waitForURL(/\/staff\/forms\/[^/]+\/not_answered$/)
  await expect(page.locator('text=未回答企画一覧').first()).toBeVisible({ timeout: 15000 })
})

test('admin can view form answers page with export links', async ({ page }) => {
  await loginAsStaff(page, DEMO_ADMIN.loginId, DEMO_ADMIN.password)

  const formName = `E2E 回答管理テスト ${Date.now()}`
  await createFormViaUi(page, formName)

  const formIdMatch = /\/staff\/forms\/([^/]+)\/editor$/.exec(new URL(page.url()).pathname)
  const formId = formIdMatch ? decodeURIComponent(formIdMatch[1]) : ''
  expect(formId).toBeTruthy()

  await page.goto(`/staff/forms/${formId}/answers`)
  await page.waitForURL(/\/staff\/forms\/[^/]+\/answers$/)
  await expect(page.locator(`text=${formName}`).first()).toBeVisible({ timeout: 15000 })

  await expect(page.locator('a:has-text("CSV 出力")').first()).toBeVisible({ timeout: 5000 })
  await expect(page.getByRole('link', { name: 'ファイルを一括ダウンロード' }).first()).toBeVisible({ timeout: 5000 })
})

test('admin can view form answer uploads page', async ({ page }) => {
  await loginAsStaff(page, DEMO_ADMIN.loginId, DEMO_ADMIN.password)

  const formName = `E2E アップロードテスト ${Date.now()}`
  await createFormViaUi(page, formName)

  const formIdMatch = /\/staff\/forms\/([^/]+)\/editor$/.exec(new URL(page.url()).pathname)
  const formId = formIdMatch ? decodeURIComponent(formIdMatch[1]) : ''
  expect(formId).toBeTruthy()

  await page.goto(`/staff/forms/${formId}/answers/uploads`)
  await page.waitForURL(/\/staff\/forms\/[^/]+\/answers\/uploads$/)
  await expect(page.locator('text=アップロードファイルの一括ダウンロード').first()).toBeVisible({ timeout: 15000 })
  await expect(page.locator(`text=${formName}`).first()).toBeVisible({ timeout: 5000 })
})

test('admin can view form answer create page', async ({ page }) => {
  await loginAsStaff(page, DEMO_ADMIN.loginId, DEMO_ADMIN.password)

  const formName = `E2E 回答作成テスト ${Date.now()}`
  await createFormViaUi(page, formName)

  const formIdMatch = /\/staff\/forms\/([^/]+)\/editor$/.exec(new URL(page.url()).pathname)
  const formId = formIdMatch ? decodeURIComponent(formIdMatch[1]) : ''
  expect(formId).toBeTruthy()

  await page.goto(`/staff/forms/${formId}/answers/create`)
  await page.waitForURL(/\/staff\/forms\/[^/]+\/answers\/create$/)
  await expect(page.locator(`text=${formName}`).first()).toBeVisible({ timeout: 15000 })
  await expect(page.locator('text=回答対象の企画を選んで新規回答を作成します。').first()).toBeVisible({
    timeout: 5000
  })
})
