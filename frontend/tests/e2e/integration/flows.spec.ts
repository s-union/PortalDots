import { test, expect, type Page } from '@playwright/test'
import {
  loginFromApi,
  loginAsStaff,
  setCurrentCircleFromApi,
  approveCircleFromApi,
  DEMO_CIRCLE,
  DEMO_ADMIN,
  CIRCLE_B
} from './utils'

const API_BASE_URL = process.env.API_BASE_URL ?? 'http://127.0.0.1:8080'

test.beforeEach(async ({ page }) => {
  await page.context().clearCookies()
})

function toDatetimeLocalValue(date: Date): string {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16)
}

function formIdFromEditorUrl(url: string): string {
  const match = /\/staff\/forms\/([^/]+)\/editor$/.exec(new URL(url).pathname)
  if (!match) {
    throw new Error(`Could not parse form id from URL: ${url}`)
  }
  return decodeURIComponent(match[1])
}

async function createOpenPublicFormFromStaffUi(page: Page, formName: string): Promise<string> {
  await page.goto('/staff/forms/create')
  await page.waitForURL('**/staff/forms/create')

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
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(formName, { timeout: 15000 })
  return formIdFromEditorUrl(page.url())
}

async function updateCircleStatusFromStaffUi(
  page: Page,
  circleName: string,
  status: 'pending' | 'approved'
): Promise<void> {
  await page.goto('/staff/circles/all')
  await page.waitForURL('**/staff/circles/all')
  const searchInput = page.getByPlaceholder('企画ID・企画名・団体名などで絞り込み')
  await searchInput.fill(circleName)
  await searchInput.press('Enter')
  await expect(page.getByRole('link', { name: circleName }).first()).toBeVisible({ timeout: 15000 })
  await page.getByRole('link', { name: circleName }).first().click()
  await page.waitForURL(/\/staff\/circles\/[^/]+$/)

  await page.locator(`input[name="status"][value="${status}"]`).check()
  const [saveResp] = await Promise.all([
    page.waitForResponse((resp) => resp.url().includes('/staff/circles/') && resp.request().method() === 'PUT', {
      timeout: 15000
    }),
    page.getByRole('button', { name: '保存' }).click()
  ])
  expect(saveResp.status()).toBe(200)
  await expect(page.locator('text=企画を更新しました。').first()).toBeVisible({ timeout: 10000 })
}

test('admin creates page and circle user reads it in workspace', async ({ page }) => {
  await loginAsStaff(page, DEMO_ADMIN.loginId, DEMO_ADMIN.password)

  const bootstrap = await page.request.get(`${API_BASE_URL}/v1/session/bootstrap`)
  const { csrfToken } = (await bootstrap.json()) as { csrfToken: string }

  const pageTitle = `E2E お知らせ ${Date.now()}`
  const pageBody = 'これはE2Eテスト用のお知らせです。'

  const createResp = await page.request.post(`${API_BASE_URL}/v1/staff/pages`, {
    data: {
      title: pageTitle,
      body: pageBody,
      notes: '',
      isPinned: false,
      isPublic: true,
      viewableTags: [],
      documentIds: [],
      sendEmails: false
    },
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken }
  })
  expect(createResp.status()).toBe(201)

  // Circle user reads the page in workspace
  await page.context().clearCookies()
  await loginFromApi(page, DEMO_CIRCLE.loginId, DEMO_CIRCLE.password)
  await setCurrentCircleFromApi(page, CIRCLE_B)

  await page.goto('/workspace/pages')
  await page.waitForURL('**/workspace/pages')
  await expect(page.locator('text=お知らせ').first()).toBeVisible({ timeout: 15000 })

  await page.locator('input[name="query"]').fill(pageTitle)
  await page.getByRole('button', { name: '検索', exact: true }).click()
  await expect(page.getByRole('link', { name: pageTitle })).toBeVisible({ timeout: 10000 })

  await page.getByRole('link', { name: pageTitle }).click()
  await page.waitForURL(/\/workspace\/pages\//)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(pageTitle, { timeout: 10000 })
  await expect(page.locator(`text=${pageBody}`).first()).toBeVisible({ timeout: 5000 })
})

test('admin approves circle and creates form, circle submits answer, admin verifies answer', async ({ page }) => {
  // Approve CIRCLE_B using an independent context (does not affect browser cookies)
  await approveCircleFromApi(CIRCLE_B)

  // Admin creates a form (requires staff verification)
  await loginAsStaff(page, DEMO_ADMIN.loginId, DEMO_ADMIN.password)
  const bootstrap = await page.request.get(`${API_BASE_URL}/v1/session/bootstrap`)
  const { csrfToken } = (await bootstrap.json()) as { csrfToken: string }

  const formName = `E2E テストフォーム ${Date.now()}`
  const now = new Date()
  const openAt = new Date(now.getTime() - 60 * 60 * 1000).toISOString()
  const closeAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString()

  const formResp = await page.request.post(`${API_BASE_URL}/v1/staff/forms`, {
    data: {
      circleId: '',
      name: formName,
      description: '',
      openAt,
      closeAt,
      isPublic: true,
      maxAnswers: 1,
      answerableTags: [],
      confirmationMessage: ''
    },
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken }
  })
  expect(formResp.status()).toBe(201)
  const createdForm = (await formResp.json()) as { id: string }
  const formId = createdForm.id

  // Circle user navigates to the form and submits an answer
  await page.context().clearCookies()
  await loginFromApi(page, DEMO_CIRCLE.loginId, DEMO_CIRCLE.password)
  await setCurrentCircleFromApi(page, CIRCLE_B)

  await page.goto(`/workspace/forms/${formId}`)
  await page.waitForURL(/\/workspace\/forms\//)
  await expect(page.locator(`text=${formName}`).first()).toBeVisible({ timeout: 15000 })

  const uniqueAnswer = `E2Eテスト回答 ${Date.now()}`
  await page.locator('textarea[name="answer-body"]').fill(uniqueAnswer)

  const [answerResp] = await Promise.all([
    page.waitForResponse((resp) => /\/forms\/[^/]+\/answer$/.test(resp.url()) && resp.request().method() === 'PUT', {
      timeout: 15000
    }),
    page.getByRole('button', { name: '送信' }).click()
  ])
  expect(answerResp.status()).toBe(200)

  // Admin verifies the submitted answer via API (requires staff verification)
  await page.context().clearCookies()
  await loginAsStaff(page, DEMO_ADMIN.loginId, DEMO_ADMIN.password)

  const staffAnswersResp = await page.request.get(`${API_BASE_URL}/v1/staff/forms/${formId}/answers`)
  expect(staffAnswersResp.status()).toBe(200)
  const staffAnswers = (await staffAnswersResp.json()) as { answers: { body: string }[] }
  expect(staffAnswers.answers.some((a) => a.body === uniqueAnswer)).toBe(true)
})

test('staff creates a public form in UI, circle submits it, staff verifies the answer in UI', async ({ page }) => {
  test.setTimeout(60000)
  await approveCircleFromApi(CIRCLE_B)

  await loginAsStaff(page, DEMO_ADMIN.loginId, DEMO_ADMIN.password)
  const formName = `E2E UI作成フォーム ${Date.now()}`
  const formId = await createOpenPublicFormFromStaffUi(page, formName)

  await page.context().clearCookies()
  await loginFromApi(page, DEMO_CIRCLE.loginId, DEMO_CIRCLE.password)
  await setCurrentCircleFromApi(page, CIRCLE_B)

  await page.goto(`/workspace/forms/${formId}`)
  await page.waitForURL(/\/workspace\/forms\//)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(formName, { timeout: 15000 })

  const uniqueAnswer = `UI作成フォームへの回答 ${Date.now()}`
  await page.locator('textarea[name="answer-body"]').fill(uniqueAnswer)
  const [answerResp] = await Promise.all([
    page.waitForResponse((resp) => /\/forms\/[^/]+\/answer$/.test(resp.url()) && resp.request().method() === 'PUT', {
      timeout: 15000
    }),
    page.getByRole('button', { name: '送信' }).click()
  ])
  expect(answerResp.status()).toBe(200)

  await page.context().clearCookies()
  await loginAsStaff(page, DEMO_ADMIN.loginId, DEMO_ADMIN.password)
  await page.goto(`/staff/forms/${formId}/answers`)
  await page.waitForURL(/\/staff\/forms\/[^/]+\/answers$/)
  await expect(page.locator(`text=${formName}`).first()).toBeVisible({ timeout: 15000 })

  const searchInput = page.getByPlaceholder('企画名で絞り込み')
  await searchInput.fill(CIRCLE_B)
  await searchInput.press('Enter')
  await expect(page.locator(`text=${CIRCLE_B}`).first()).toBeVisible({ timeout: 15000 })
  await page.getByRole('link', { name: '回答', exact: true }).first().click()
  await page.waitForURL(/\/staff\/forms\/[^/]+\/answers\/[^/]+\/edit$/)
  await expect(page.locator('textarea[name="answer-body"]')).toHaveValue(uniqueAnswer, { timeout: 15000 })
})

test('staff changing circle approval status controls whether the circle can submit forms', async ({ page }) => {
  test.setTimeout(60000)
  await approveCircleFromApi(CIRCLE_B)

  await loginAsStaff(page, DEMO_ADMIN.loginId, DEMO_ADMIN.password)
  const formName = `E2E 受理状況フォーム ${Date.now()}`
  const formId = await createOpenPublicFormFromStaffUi(page, formName)
  await updateCircleStatusFromStaffUi(page, CIRCLE_B, 'pending')

  await page.context().clearCookies()
  await loginFromApi(page, DEMO_CIRCLE.loginId, DEMO_CIRCLE.password)
  await setCurrentCircleFromApi(page, CIRCLE_B)

  await page.goto(`/workspace/forms/${formId}`)
  await page.waitForURL(/\/workspace\/forms\//)
  await expect(page.locator('text=企画が受理されていないため申請できません。').first()).toBeVisible({
    timeout: 15000
  })
  await expect(page.getByRole('button', { name: '送信' })).toBeDisabled()

  await page.context().clearCookies()
  await loginAsStaff(page, DEMO_ADMIN.loginId, DEMO_ADMIN.password)
  await updateCircleStatusFromStaffUi(page, CIRCLE_B, 'approved')

  await page.context().clearCookies()
  await loginFromApi(page, DEMO_CIRCLE.loginId, DEMO_CIRCLE.password)
  await setCurrentCircleFromApi(page, CIRCLE_B)

  await page.goto(`/workspace/forms/${formId}`)
  await page.waitForURL(/\/workspace\/forms\//)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(formName, { timeout: 15000 })

  const uniqueAnswer = `受理後に提出できる回答 ${Date.now()}`
  await page.locator('textarea[name="answer-body"]').fill(uniqueAnswer)
  const [answerResp] = await Promise.all([
    page.waitForResponse((resp) => /\/forms\/[^/]+\/answer$/.test(resp.url()) && resp.request().method() === 'PUT', {
      timeout: 15000
    }),
    page.getByRole('button', { name: '送信' }).click()
  ])
  expect(answerResp.status()).toBe(200)
})
