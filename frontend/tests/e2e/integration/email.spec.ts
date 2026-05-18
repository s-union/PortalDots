import { test, expect } from '@playwright/test'
import {
  loginFromApi,
  setCurrentCircleFromApi,
  snapshotEmailFiles,
  waitForMiniflareEmail,
  extractUrlFromBody,
  DEMO_CIRCLE,
  DEMO_ADMIN,
  CIRCLE_B
} from './utils'

const API_BASE_URL = process.env.API_BASE_URL ?? 'http://127.0.0.1:8080'

test.beforeEach(async ({ page }) => {
  await page.context().clearCookies()
})

test('new user registration sends verify email and completing verification registers the user', async ({ page }) => {
  const localPart = `e2e-reg-${Date.now()}`
  const emailsBefore = snapshotEmailFiles()

  // Submit the university email local part on the register page
  await page.goto('/register')
  await page.waitForURL('/register')
  await page.locator('input[name="univemailLocalPart"]').fill(localPart)
  await page.getByRole('button', { name: '認証URLを送信' }).click()
  await expect(page.locator('text=大学メールアドレスに認証URLを送信しました').first()).toBeVisible({
    timeout: 10000
  })

  // Wait for the verification email to appear in miniflare's output files.
  // The recipient address contains localPart but the rendered text body does not,
  // so match only on the verify URL path which is unique per request.
  const verifyContent = await waitForMiniflareEmail((c) => c.includes('/email/verify/univemail/'), {
    timeoutMs: 15000,
    before: emailsBefore
  })
  const verifyURL = extractUrlFromBody(verifyContent)
  expect(verifyURL).toContain('/email/verify/univemail/')

  // Navigate to the verify URL — browser is still unauthenticated
  await page.goto(verifyURL)
  await page.waitForURL(/\/email\/verify\/univemail\//)

  // The page confirms the university email address
  await expect(page.locator(`text=${localPart}`).first()).toBeVisible({ timeout: 10000 })

  // Complete the registration form
  await page.locator('input[name="name"]').fill('テスト 太郎')
  await page.locator('input[name="nameYomi"]').fill('てすと たろう')
  await page.locator('input[name="phoneNumber"]').fill('090-0000-9999')
  await page.locator('input[name="password"]').fill('E2etest1')
  await page.locator('input[name="passwordConfirmation"]').fill('E2etest1')
  await page.getByRole('button', { name: '本登録を完了する' }).click()

  // After completion the app redirects to the email verification status page (not the verify/type/id path)
  await page.waitForURL((url) => url.pathname === '/email/verify', { timeout: 10000 })

  // The newly registered user should be able to log in
  await page.context().clearCookies()
  const loginResp = await page.request.post(`${API_BASE_URL}/v1/auth/login`, {
    data: { loginId: localPart, password: 'E2etest1' },
    headers: { 'Content-Type': 'application/json' }
  })
  expect(loginResp.status()).toBe(204)
})

test('password reset sends email and navigating the reset link allows setting a new password', async ({ page }) => {
  const newPassword = 'Demo-new1'
  const emailsBefore = snapshotEmailFiles()

  // Request a password reset for the demo circle user
  await page.goto('/password/reset')
  await page.waitForURL('/password/reset')
  await page.locator('input[name="loginId"]').fill(DEMO_CIRCLE.loginId)
  await page.getByRole('button', { name: '再設定のためのメールを送信' }).click()
  await expect(page.locator('text=再設定URLを送信しました').first()).toBeVisible({ timeout: 10000 })

  // Wait for the password reset email in miniflare's output files
  const resetContent = await waitForMiniflareEmail((c) => c.includes('/password/reset/'), {
    timeoutMs: 15000,
    before: emailsBefore
  })
  const resetURL = extractUrlFromBody(resetContent)
  expect(resetURL).toContain('/password/reset/')

  // Navigate to the reset URL — browser is still unauthenticated
  await page.goto(resetURL)
  await page.waitForURL(/\/password\/reset\//)

  // Wait for the new password form to appear
  await expect(page.locator('input[name="password"]')).toBeVisible({ timeout: 10000 })

  // Set a new password
  await page.locator('input[name="password"]').fill(newPassword)
  await page.locator('input[name="passwordConfirmation"]').fill(newPassword)
  await page.getByRole('button', { name: '新しいパスワードを設定' }).click()

  // Confirm success
  await expect(page.locator('text=パスワードを再設定しました').first()).toBeVisible({ timeout: 10000 })

  // Restore the original password so subsequent tests are not broken
  await page.context().clearCookies()
  await loginFromApi(page, DEMO_CIRCLE.loginId, newPassword)
  const bootstrap = await page.request.get(`${API_BASE_URL}/v1/session/bootstrap`)
  const { csrfToken } = (await bootstrap.json()) as { csrfToken: string }
  await page.request.put(`${API_BASE_URL}/v1/session/password`, {
    data: {
      currentPassword: newPassword,
      newPassword: DEMO_CIRCLE.password,
      newPasswordConfirmation: DEMO_CIRCLE.password
    },
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken }
  })
})

test('submitting a contact form sends a confirmation email to the circle members', async ({ page }) => {
  test.setTimeout(120000) // normal-priority queue has 30s batch timeout
  await loginFromApi(page, DEMO_CIRCLE.loginId, DEMO_CIRCLE.password)
  await setCurrentCircleFromApi(page, CIRCLE_B)

  const emailsBefore = snapshotEmailFiles()

  await page.goto('/workspace/contact')
  await page.waitForURL('**/workspace/contact')
  await expect(page.locator('text=お問い合わせ').first()).toBeVisible({ timeout: 15000 })

  // Fill in the contact form (subject is auto-set from the category name)
  await page.getByLabel('お問い合わせ項目').selectOption({ label: '公式ウェブサイト掲載内容に関すること' })
  const uniqueBody = `メール送信E2Eテスト ${Date.now()}`
  await page.locator('textarea[name="body"]').fill(uniqueBody)

  const [contactResponse] = await Promise.all([
    page.waitForResponse((resp) => resp.url().includes('/contact') && resp.request().method() === 'POST'),
    page.getByRole('button', { name: '送信' }).click()
  ])
  expect(contactResponse.status()).toBe(201)
  await expect(page.locator('text=に問い合わせを送信しました').first()).toBeVisible({ timeout: 10000 })

  // Contact emails use normal-priority queue (max_batch_timeout: 30s) — wait up to 60s.
  // The submitter should receive a confirmation email
  const confirmContent = await waitForMiniflareEmail(
    (c) => c.includes('お問い合わせを受け付けました') && c.includes(uniqueBody),
    { timeoutMs: 60000, before: emailsBefore }
  )
  expect(confirmContent).toContain('公式ウェブサイト掲載内容に関すること')

  // The staff contact category handler also receives a notification (use same snapshot)
  const staffContent = await waitForMiniflareEmail(
    (c) =>
      c.includes('公式ウェブサイト掲載内容に関すること') &&
      c.includes(uniqueBody) &&
      !c.includes('お問い合わせを受け付けました'),
    { timeoutMs: 60000, before: emailsBefore }
  )
  expect(staffContent).toContain(uniqueBody)
})

test('admin staff mail queue records sent emails accessible via API', async ({ page }) => {
  test.setTimeout(120000) // normal-priority queue has 30s batch timeout
  await loginFromApi(page, DEMO_ADMIN.loginId, DEMO_ADMIN.password)
  const emailsBefore = snapshotEmailFiles()

  const bootstrap = await page.request.get(`${API_BASE_URL}/v1/session/bootstrap`)
  const { csrfToken } = (await bootstrap.json()) as { csrfToken: string }

  const circlesResp = await page.request.get(`${API_BASE_URL}/v1/staff/circles/all`)
  const circlesData = (await circlesResp.json()) as { id: string }[]
  const circleId = circlesData[0]?.id
  expect(circleId).toBeTruthy()

  // Enqueue a staff mail via the API
  const subject = `E2E スタッフメール ${Date.now()}`
  const mailResp = await page.request.post(`${API_BASE_URL}/v1/staff/mails`, {
    data: {
      circleId,
      subject,
      body: 'スタッフから送信したテストメールです。',
      recipients: ['e2e-test@example.com']
    },
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken }
  })
  expect(mailResp.status()).toBe(201)

  // Staff mails use normal-priority queue (max_batch_timeout: 30s) — wait up to 60s.
  const sentContent = await waitForMiniflareEmail((c) => c.includes('スタッフから送信したテストメールです'), {
    timeoutMs: 60000,
    before: emailsBefore
  })
  expect(sentContent).toContain('スタッフから送信したテストメールです')
})
