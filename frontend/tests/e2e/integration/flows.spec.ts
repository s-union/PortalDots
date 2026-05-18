import { test, expect } from '@playwright/test'
import { loginFromApi, setCurrentCircleFromApi, approveCircleFromApi, DEMO_CIRCLE, DEMO_ADMIN, CIRCLE_B } from './utils'

const API_BASE_URL = process.env.API_BASE_URL ?? 'http://127.0.0.1:8080'

test.beforeEach(async ({ page }) => {
  await page.context().clearCookies()
})

test('admin creates page and circle user reads it in workspace', async ({ page }) => {
  await loginFromApi(page, DEMO_ADMIN.loginId, DEMO_ADMIN.password)

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

  // Admin creates a form
  await loginFromApi(page, DEMO_ADMIN.loginId, DEMO_ADMIN.password)
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

  // Admin verifies the submitted answer via API
  await page.context().clearCookies()
  await loginFromApi(page, DEMO_ADMIN.loginId, DEMO_ADMIN.password)

  const staffAnswersResp = await page.request.get(`${API_BASE_URL}/v1/staff/forms/${formId}/answers`)
  expect(staffAnswersResp.status()).toBe(200)
  const staffAnswers = (await staffAnswersResp.json()) as { answers: Array<{ body: string }> }
  expect(staffAnswers.answers.some((a) => a.body === uniqueAnswer)).toBe(true)
})
