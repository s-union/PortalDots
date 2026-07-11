import { test, expect } from '@playwright/test'
import {
  loginFromApi,
  setCurrentCircleFromApi,
  snapshotEmailFiles,
  waitForMiniflareEmail,
  extractUrlFromBody,
  DEMO_CIRCLE,
  CIRCLE_B
} from './utils'

const API_BASE_URL = process.env.API_BASE_URL ?? 'http://127.0.0.1:8080'

const pdfBytes = Buffer.from('%PDF-1.7\n')

test('circle user sees client-side validation for disallowed contact attachments', async ({ page }) => {
  await loginFromApi(page, DEMO_CIRCLE.loginId, DEMO_CIRCLE.password)
  await setCurrentCircleFromApi(page, CIRCLE_B)

  await page.goto('/workspace/contact')
  await page.waitForURL('**/workspace/contact')
  await expect(page.locator('text=お問い合わせ').first()).toBeVisible({ timeout: 15000 })
  await expect(page.locator('text=添付ファイル（任意）').first()).toBeVisible()

  await page.locator('input[name="file"]').setInputFiles({
    name: 'notes.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('not a proposal')
  })

  await expect(
    page.locator('text=PDF、Word、Excel、PowerPoint、PNG、JPEG ファイルを選択してください').first()
  ).toBeVisible({ timeout: 5000 })
  await expect(page.locator('input[name="file"]')).toHaveAttribute('aria-invalid', 'true')

  await page.getByLabel('お問い合わせ項目').selectOption({ label: '公式ウェブサイト掲載内容に関すること' })
  await page.locator('textarea[name="body"]').fill('不正な添付のまま送信しようとした内容')
  await page.getByRole('button', { name: '送信' }).click()
  await expect(page.locator('text=に問い合わせを送信しました')).toHaveCount(0)
  await expect(
    page.locator('text=PDF、Word、Excel、PowerPoint、PNG、JPEG ファイルを選択してください').first()
  ).toBeVisible()

  await page.getByRole('button', { name: '選択を解除' }).click()
  await expect(page.locator('text=notes.txt')).toHaveCount(0)
  await expect(page.locator('input[name="file"]')).not.toHaveAttribute('aria-invalid', 'true')
})

test('circle user can submit a contact with a PDF attachment and staff can download it', async ({ page }) => {
  test.setTimeout(120000)
  await loginFromApi(page, DEMO_CIRCLE.loginId, DEMO_CIRCLE.password)
  await setCurrentCircleFromApi(page, CIRCLE_B)

  const emailsBefore = snapshotEmailFiles()
  const uniqueBody = `添付E2E ${Date.now()}`
  const filename = `proposal-${Date.now()}.pdf`

  await page.goto('/workspace/contact')
  await page.waitForURL('**/workspace/contact')
  await expect(page.locator('text=お問い合わせ').first()).toBeVisible({ timeout: 15000 })

  await page.getByLabel('お問い合わせ項目').selectOption({ label: '公式ウェブサイト掲載内容に関すること' })
  await page.locator('textarea[name="body"]').fill(uniqueBody)
  await page.locator('input[name="file"]').setInputFiles({
    name: filename,
    mimeType: 'application/pdf',
    buffer: pdfBytes
  })
  await expect(page.locator(`text=${filename}`).first()).toBeVisible()

  const [contactResponse] = await Promise.all([
    page.waitForResponse((resp) => resp.url().includes('/contact') && resp.request().method() === 'POST'),
    page.getByRole('button', { name: '送信' }).click()
  ])
  expect(contactResponse.status()).toBe(201)
  const created: unknown = await contactResponse.json()
  expect(created).toMatchObject({
    attachment: {
      filename,
      mimeType: 'application/pdf',
      sizeBytes: pdfBytes.length
    }
  })
  await expect(page.locator('text=に問い合わせを送信しました').first()).toBeVisible({ timeout: 10000 })
  await expect(page.locator(`text=${filename}`)).toHaveCount(0)

  const historyResponse = await page.request.get(`${API_BASE_URL}/v1/contact`)
  expect(historyResponse.status()).toBe(200)
  const history: unknown = await historyResponse.json()
  if (!Array.isArray(history)) {
    throw new Error('Invalid contact history response')
  }
  const matching = history.find(
    (item): item is { attachment: { filename: string } } =>
      typeof item === 'object' &&
      item !== null &&
      'attachment' in item &&
      typeof item.attachment === 'object' &&
      item.attachment !== null &&
      'filename' in item.attachment &&
      item.attachment.filename === filename
  )
  expect(matching?.attachment.filename).toBe(filename)

  const staffContent = await waitForMiniflareEmail(
    (c) =>
      c.includes(uniqueBody) &&
      c.includes(filename) &&
      c.includes('/v1/contact/attachments/') &&
      !c.includes('お問い合わせを受け付けました'),
    { timeoutMs: 60000, before: emailsBefore }
  )
  const downloadURL = extractUrlFromBody(staffContent)
  expect(downloadURL).toContain('/v1/contact/attachments/')

  const confirmContent = await waitForMiniflareEmail(
    (c) => c.includes('お問い合わせを受け付けました') && c.includes(uniqueBody) && c.includes(filename),
    { timeoutMs: 60000, before: emailsBefore }
  )
  expect(confirmContent).not.toContain('/v1/contact/attachments/')

  const downloadResponse = await page.request.get(downloadURL)
  expect(downloadResponse.status()).toBe(200)
  expect(downloadResponse.headers()['content-type']).toContain('application/pdf')
  expect(Buffer.from(await downloadResponse.body()).equals(pdfBytes)).toBe(true)
  const disposition = downloadResponse.headers()['content-disposition'] ?? ''
  expect(disposition).toMatch(/attachment/i)
})
