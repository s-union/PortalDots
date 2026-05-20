import { test, expect, type Page } from '@playwright/test'
import {
  loginFromApi,
  loginAsStaff,
  setCurrentCircleFromApi,
  approveCircleFromApi,
  updateStaffPermissionsFromApi,
  DEMO_CIRCLE,
  DEMO_CIRCLE_SUB,
  DEMO_ADMIN,
  CIRCLE_A,
  CIRCLE_B
} from './utils'

const API_BASE_URL = process.env.API_BASE_URL ?? 'http://127.0.0.1:8080'

interface StaffFormSummary {
  id: string
  name: string
}

interface StaffQuestion {
  id: string
  type: string
}

interface StaffAnswerSummary {
  id: string
  body: string
  details: Record<string, string[]>
  uploadCount: number
}

interface StaffAnswersIndex {
  answers: StaffAnswerSummary[]
}

interface CircleDetail {
  id: string
  invitationToken: string
}

interface StaffMember {
  userId: string
  displayName: string
  loginIds: string[]
  isLeader: boolean
}

function stringField(value: unknown, key: string, label: string): string {
  if (typeof value === 'object' && value !== null && key in value && typeof value[key] === 'string') {
    return value[key]
  }
  throw new Error(`Invalid ${label}: missing ${key}`)
}

function numberField(value: unknown, key: string, label: string): number {
  if (typeof value === 'object' && value !== null && key in value && typeof value[key] === 'number') {
    return value[key]
  }
  throw new Error(`Invalid ${label}: missing ${key}`)
}

function recordField(value: unknown, key: string, label: string): Record<string, unknown> {
  if (typeof value === 'object' && value !== null && key in value) {
    const field = value[key]
    if (typeof field === 'object' && field !== null && !Array.isArray(field)) {
      return field
    }
  }
  throw new Error(`Invalid ${label}: missing ${key}`)
}

function stringArrayField(value: unknown, key: string, label: string): string[] {
  if (typeof value === 'object' && value !== null && key in value) {
    const field = value[key]
    if (Array.isArray(field) && field.every((item) => typeof item === 'string')) {
      return field
    }
  }
  throw new Error(`Invalid ${label}: missing ${key}`)
}

function parseStaffFormSummary(value: unknown): StaffFormSummary {
  return {
    id: stringField(value, 'id', 'staff form summary'),
    name: stringField(value, 'name', 'staff form summary')
  }
}

function parseStaffQuestion(value: unknown): StaffQuestion {
  return {
    id: stringField(value, 'id', 'staff question'),
    type: stringField(value, 'type', 'staff question')
  }
}

function parseStaffAnswersIndex(value: unknown): StaffAnswersIndex {
  if (typeof value !== 'object' || value === null || !('answers' in value) || !Array.isArray(value.answers)) {
    throw new Error('Invalid staff answers index')
  }
  return {
    answers: value.answers.map((answer): StaffAnswerSummary => {
      const detailsRaw = recordField(answer, 'details', 'staff answer')
      const details: Record<string, string[]> = {}
      for (const [key, rawValue] of Object.entries(detailsRaw)) {
        if (!Array.isArray(rawValue) || !rawValue.every((item) => typeof item === 'string')) {
          throw new Error('Invalid staff answer details')
        }
        details[key] = rawValue
      }
      return {
        id: stringField(answer, 'id', 'staff answer'),
        body: stringField(answer, 'body', 'staff answer'),
        details,
        uploadCount: numberField(answer, 'uploadCount', 'staff answer')
      }
    })
  }
}

function parseCircleDetail(value: unknown): CircleDetail {
  return {
    id: stringField(value, 'id', 'circle detail'),
    invitationToken: stringField(value, 'invitationToken', 'circle detail')
  }
}

function parseStaffMembers(value: unknown): StaffMember[] {
  if (!Array.isArray(value)) {
    throw new Error('Invalid staff members')
  }
  return value.map((member) => ({
    userId: stringField(member, 'userId', 'staff member'),
    displayName: stringField(member, 'displayName', 'staff member'),
    loginIds: stringArrayField(member, 'loginIds', 'staff member'),
    isLeader:
      typeof member === 'object' && member !== null && 'isLeader' in member && typeof member.isLeader === 'boolean'
        ? member.isLeader
        : false
  }))
}

function toRFC3339(offsetMs: number): string {
  return new Date(Date.now() + offsetMs).toISOString()
}

async function csrfToken(page: Page): Promise<string> {
  const resp = await page.request.get(`${API_BASE_URL}/v1/session/bootstrap`)
  expect(resp.status()).toBe(200)
  return stringField(await resp.json(), 'csrfToken', 'session bootstrap')
}

async function createStaffForm(
  page: Page,
  payload: {
    name: string
    isPublic?: boolean
    maxAnswers?: number
    openAt?: string
    closeAt?: string
    answerableTags?: string[]
  }
): Promise<StaffFormSummary> {
  const token = await csrfToken(page)
  const resp = await page.request.post(`${API_BASE_URL}/v1/staff/forms`, {
    data: {
      circleId: '',
      name: payload.name,
      description: `${payload.name} description`,
      openAt: payload.openAt ?? toRFC3339(-60 * 60 * 1000),
      closeAt: payload.closeAt ?? toRFC3339(24 * 60 * 60 * 1000),
      isPublic: payload.isPublic ?? true,
      maxAnswers: payload.maxAnswers ?? 1,
      answerableTags: payload.answerableTags ?? [],
      confirmationMessage: `${payload.name} confirmation`
    },
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token }
  })
  expect(resp.status()).toBe(201)
  return parseStaffFormSummary(await resp.json())
}

async function createQuestion(page: Page, formId: string, type: string): Promise<StaffQuestion> {
  const token = await csrfToken(page)
  const resp = await page.request.post(`${API_BASE_URL}/v1/staff/forms/${formId}/questions`, {
    data: { type },
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token }
  })
  expect(resp.status()).toBe(201)
  return parseStaffQuestion(await resp.json())
}

async function updateQuestion(
  page: Page,
  formId: string,
  question: StaffQuestion,
  payload: {
    name: string
    isRequired?: boolean
    numberMin?: number | null
    numberMax?: number | null
    allowedTypes?: string
    options?: string[]
    priority: number
  }
): Promise<void> {
  const token = await csrfToken(page)
  const resp = await page.request.put(`${API_BASE_URL}/v1/staff/forms/${formId}/questions/${question.id}`, {
    data: {
      name: payload.name,
      description: `${payload.name} description`,
      type: question.type,
      isRequired: payload.isRequired ?? false,
      numberMin: payload.numberMin ?? null,
      numberMax: payload.numberMax ?? null,
      allowedTypes: payload.allowedTypes ?? '',
      options: payload.options ?? [],
      priority: payload.priority
    },
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token }
  })
  expect(resp.status()).toBe(200)
}

test.beforeEach(async ({ page }) => {
  await page.context().clearCookies()
})

test.afterEach(async () => {
  await updateStaffPermissionsFromApi(DEMO_CIRCLE.userId, [])
})

test('workspace form covers question types, uploads, staff answer verification, and answer limit', async ({ page }) => {
  test.setTimeout(90000)
  await approveCircleFromApi(CIRCLE_B)
  await loginAsStaff(page, DEMO_ADMIN.loginId, DEMO_ADMIN.password)

  const form = await createStaffForm(page, { name: `E2E 設問網羅フォーム ${Date.now()}`, maxAnswers: 1 })
  const text = await createQuestion(page, form.id, 'text')
  const textarea = await createQuestion(page, form.id, 'textarea')
  const number = await createQuestion(page, form.id, 'number')
  const radio = await createQuestion(page, form.id, 'radio')
  const select = await createQuestion(page, form.id, 'select')
  const checkbox = await createQuestion(page, form.id, 'checkbox')
  const upload = await createQuestion(page, form.id, 'upload')

  await updateQuestion(page, form.id, text, { name: 'E2E テキスト', isRequired: true, priority: 10 })
  await updateQuestion(page, form.id, textarea, { name: 'E2E 長文', isRequired: true, priority: 20 })
  await updateQuestion(page, form.id, number, {
    name: 'E2E 数値',
    isRequired: true,
    numberMin: 1,
    numberMax: 10,
    priority: 30
  })
  await updateQuestion(page, form.id, radio, {
    name: 'E2E ラジオ',
    isRequired: true,
    options: ['ラジオA', 'ラジオB'],
    priority: 40
  })
  await updateQuestion(page, form.id, select, {
    name: 'E2E セレクト',
    isRequired: true,
    options: ['セレクトA', 'セレクトB'],
    priority: 50
  })
  await updateQuestion(page, form.id, checkbox, {
    name: 'E2E チェック',
    isRequired: true,
    options: ['チェックA', 'チェックB'],
    priority: 60
  })
  await updateQuestion(page, form.id, upload, {
    name: 'E2E 添付',
    allowedTypes: 'txt',
    priority: 70
  })

  await page.context().clearCookies()
  await loginFromApi(page, DEMO_CIRCLE.loginId, DEMO_CIRCLE.password)
  await setCurrentCircleFromApi(page, CIRCLE_B)
  await page.goto(`/workspace/forms/${form.id}`)
  await page.waitForURL(/\/workspace\/forms\//)

  await page.getByLabel('E2E テキスト').fill('テキスト回答')
  await page.getByLabel('E2E 長文').fill('長文回答')
  await page.getByLabel('E2E 数値').selectOption('7')
  await page.getByLabel('E2E セレクト').selectOption('セレクトB')
  await page.getByLabel('ラジオA').check()
  await page.getByLabel('チェックA').check()
  await page.getByLabel('チェックB').check()

  const [saveResp] = await Promise.all([
    page.waitForResponse((resp) => /\/forms\/[^/]+\/answer$/.test(resp.url()) && resp.request().method() === 'PUT'),
    page.getByRole('button', { name: '送信' }).click()
  ])
  expect(saveResp.status()).toBe(200)

  await page.locator(`input[name="answer-file-${upload.id}"]`).setInputFiles({
    name: 'e2e-answer.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('E2E upload content')
  })
  const [uploadResp] = await Promise.all([
    page.waitForResponse((resp) => resp.url().includes('/uploads') && resp.request().method() === 'POST'),
    page.getByRole('button', { name: 'ファイルを追加' }).click()
  ])
  expect(uploadResp.status()).toBe(201)
  await expect(page.locator('text=e2e-answer.txt').first()).toBeVisible({ timeout: 10000 })

  const secondCreate = await page.request.post(`${API_BASE_URL}/v1/forms/${form.id}/answers`, {
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': await csrfToken(page) }
  })
  expect(secondCreate.status()).toBe(422)

  await page.context().clearCookies()
  await loginAsStaff(page, DEMO_ADMIN.loginId, DEMO_ADMIN.password)
  const answersResp = await page.request.get(`${API_BASE_URL}/v1/staff/forms/${form.id}/answers`)
  expect(answersResp.status()).toBe(200)
  const answers = parseStaffAnswersIndex(await answersResp.json())
  const answer = answers.answers.find((item) => item.details[text.id]?.includes('テキスト回答'))
  expect(answer).toBeTruthy()
  expect(answer?.details[textarea.id]).toEqual(['長文回答'])
  expect(answer?.details[number.id]).toEqual(['7'])
  expect(answer?.details[radio.id]).toEqual(['ラジオA'])
  expect(answer?.details[select.id]).toEqual(['セレクトB'])
  expect(answer?.details[checkbox.id]).toEqual(['チェックA', 'チェックB'])
  expect(answer?.uploadCount).toBe(1)
})

test('form visibility and writable state distinguish private, closed, and tag-limited forms', async ({ page }) => {
  await approveCircleFromApi(CIRCLE_B)
  await loginAsStaff(page, DEMO_ADMIN.loginId, DEMO_ADMIN.password)

  const privateForm = await createStaffForm(page, { name: `E2E 非公開 ${Date.now()}`, isPublic: false })
  const closedForm = await createStaffForm(page, {
    name: `E2E 締切済み ${Date.now()}`,
    openAt: toRFC3339(-48 * 60 * 60 * 1000),
    closeAt: toRFC3339(-24 * 60 * 60 * 1000)
  })
  const tagLimitedForm = await createStaffForm(page, {
    name: `E2E 展示限定 ${Date.now()}`,
    answerableTags: ['展示']
  })

  await page.context().clearCookies()
  await loginFromApi(page, DEMO_CIRCLE.loginId, DEMO_CIRCLE.password)
  await setCurrentCircleFromApi(page, CIRCLE_B)

  await page.goto('/workspace/forms?status=all')
  await page.waitForURL('**/workspace/forms**')
  await expect(page.locator(`text=${privateForm.name}`).first()).not.toBeVisible({ timeout: 5000 })
  await expect(page.locator(`text=${closedForm.name}`).first()).toBeVisible({ timeout: 10000 })

  await page.goto(`/workspace/forms/${tagLimitedForm.id}`)
  await page.waitForURL(/\/workspace\/forms\//)
  await expect(page.locator(`text=${tagLimitedForm.name}`).first()).toBeVisible({ timeout: 10000 })

  const privateResp = await page.request.get(`${API_BASE_URL}/v1/forms/${privateForm.id}`)
  expect(privateResp.status()).toBe(404)
  const tagLimitedResp = await page.request.get(`${API_BASE_URL}/v1/forms/${tagLimitedForm.id}`)
  expect(tagLimitedResp.status()).toBe(200)
  const closedSaveResp = await page.request.put(`${API_BASE_URL}/v1/forms/${closedForm.id}/answer`, {
    data: { body: '締切後回答', details: {} },
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': await csrfToken(page) }
  })
  expect(closedSaveResp.status()).toBe(404)
})

test('staff permissions distinguish read access from edit access across major resources', async ({ page }) => {
  await updateStaffPermissionsFromApi(DEMO_CIRCLE.userId, [
    'staff.forms.read',
    'staff.pages.read',
    'staff.documents.read'
  ])
  await loginAsStaff(page, DEMO_CIRCLE.loginId, DEMO_CIRCLE.password)
  const token = await csrfToken(page)

  for (const path of ['/v1/staff/forms', '/v1/staff/pages', '/v1/staff/documents']) {
    const readResp = await page.request.get(`${API_BASE_URL}${path}`)
    expect(readResp.status(), path).toBe(200)
  }

  const deniedFormCreate = await page.request.post(`${API_BASE_URL}/v1/staff/forms`, {
    data: {
      circleId: '',
      name: '権限不足フォーム',
      description: '',
      openAt: toRFC3339(-60 * 60 * 1000),
      closeAt: toRFC3339(60 * 60 * 1000),
      isPublic: true,
      maxAnswers: 1,
      answerableTags: [],
      confirmationMessage: ''
    },
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token }
  })
  expect(deniedFormCreate.status()).toBe(403)

  const deniedPageCreate = await page.request.post(`${API_BASE_URL}/v1/staff/pages`, {
    data: {
      title: '権限不足お知らせ',
      body: '権限不足',
      notes: '',
      isPinned: false,
      isPublic: true,
      viewableTags: [],
      documentIds: [],
      sendEmails: false
    },
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token }
  })
  expect(deniedPageCreate.status()).toBe(403)

  const deniedAnswers = await page.request.get(`${API_BASE_URL}/v1/staff/forms/CMg49npfwtPb2J1pbzdcU/answers`)
  expect(deniedAnswers.status()).toBe(403)
})

test('staff CRUD, exports, and document downloads cover master data and files', async ({ page }) => {
  await loginAsStaff(page, DEMO_ADMIN.loginId, DEMO_ADMIN.password)
  const token = await csrfToken(page)
  const stamp = Date.now()

  const tagCreate = await page.request.post(`${API_BASE_URL}/v1/staff/tags`, {
    data: { name: `E2Eタグ${stamp}` },
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token }
  })
  expect(tagCreate.status()).toBe(201)
  const tagId = stringField(await tagCreate.json(), 'id', 'tag')
  const tagUpdate = await page.request.put(`${API_BASE_URL}/v1/staff/tags/${tagId}`, {
    data: { name: `E2Eタグ更新${stamp}` },
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token }
  })
  expect(tagUpdate.status()).toBe(200)
  const tagDelete = await page.request.delete(`${API_BASE_URL}/v1/staff/tags/${tagId}`, {
    headers: { 'X-CSRF-Token': token }
  })
  expect(tagDelete.status()).toBe(204)

  const placeCreate = await page.request.post(`${API_BASE_URL}/v1/staff/places`, {
    data: { name: `E2E場所${stamp}`, type: 1, notes: 'E2E notes' },
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token }
  })
  expect(placeCreate.status()).toBe(201)
  const placeId = stringField(await placeCreate.json(), 'id', 'place')
  const placeDelete = await page.request.delete(`${API_BASE_URL}/v1/staff/places/${placeId}`, {
    headers: { 'X-CSRF-Token': token }
  })
  expect(placeDelete.status()).toBe(204)

  const categoryCreate = await page.request.post(`${API_BASE_URL}/v1/staff/contact-categories`, {
    data: { name: `E2E問い合わせ${stamp}`, email: `e2e-${stamp}@example.com` },
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token }
  })
  expect(categoryCreate.status()).toBe(201)
  const categoryId = stringField(await categoryCreate.json(), 'id', 'contact category')
  const categoryDelete = await page.request.delete(`${API_BASE_URL}/v1/staff/contact-categories/${categoryId}`, {
    headers: { 'X-CSRF-Token': token }
  })
  expect(categoryDelete.status()).toBe(204)

  const exportsResp = await page.request.get(`${API_BASE_URL}/v1/staff/exports/summary.csv`)
  expect(exportsResp.status()).toBe(200)
  expect(exportsResp.headers()['content-disposition']).toContain('staff-summary')

  await page.context().clearCookies()
  await loginFromApi(page, DEMO_CIRCLE.loginId, DEMO_CIRCLE.password)
  await setCurrentCircleFromApi(page, CIRCLE_B)
  await page.goto('/workspace/documents')
  const docLink = page.getByRole('link', { name: /サンプル配布資料/ })
  await expect(docLink).toBeVisible({ timeout: 10000 })
  const href = await docLink.getAttribute('href')
  expect(href).toBeTruthy()
  const downloadResp = await page.request.get(href ?? '')
  expect(downloadResp.status()).toBe(200)
  expect(downloadResp.headers()['content-type']).toContain('application/pdf')
})

test('circle member management and invitation token are enforced through workspace and staff APIs', async ({
  page
}) => {
  await approveCircleFromApi(CIRCLE_A)
  await loginFromApi(page, DEMO_CIRCLE.loginId, DEMO_CIRCLE.password)
  await setCurrentCircleFromApi(page, CIRCLE_A)

  const detailResp = await page.request.get(`${API_BASE_URL}/v1/circles/current/detail`)
  expect(detailResp.status()).toBe(200)
  let detail = parseCircleDetail(await detailResp.json())
  if (detail.invitationToken === '') {
    const regenerateResp = await page.request.post(`${API_BASE_URL}/v1/circles/current/invitation-token/regenerate`, {
      headers: { 'X-CSRF-Token': await csrfToken(page) }
    })
    expect(regenerateResp.status()).toBe(200)
    const refreshedResp = await page.request.get(`${API_BASE_URL}/v1/circles/current/detail`)
    expect(refreshedResp.status()).toBe(200)
    detail = parseCircleDetail(await refreshedResp.json())
  }
  expect(detail.invitationToken).not.toBe('')
  await page.goto('/workspace/circles/members')
  await page.waitForURL('**/workspace/circles/members')
  await expect(page.locator('text=招待URL').first()).toBeVisible({ timeout: 15000 })

  await page.context().clearCookies()
  await loginAsStaff(page, DEMO_ADMIN.loginId, DEMO_ADMIN.password)
  let membersBeforeResp = await page.request.get(`${API_BASE_URL}/v1/staff/circles/${detail.id}/members`)
  expect(membersBeforeResp.status()).toBe(200)
  let membersBefore = parseStaffMembers(await membersBeforeResp.json())
  const existingSubMember = membersBefore.find((member) => member.loginIds.includes(DEMO_CIRCLE_SUB.loginId))
  if (existingSubMember) {
    const cleanupResp = await page.request.delete(
      `${API_BASE_URL}/v1/staff/circles/${detail.id}/members/${existingSubMember.userId}`,
      {
        headers: { 'X-CSRF-Token': await csrfToken(page) }
      }
    )
    expect(cleanupResp.status()).toBe(204)
    membersBeforeResp = await page.request.get(`${API_BASE_URL}/v1/staff/circles/${detail.id}/members`)
    expect(membersBeforeResp.status()).toBe(200)
    membersBefore = parseStaffMembers(await membersBeforeResp.json())
  }

  const addResp = await page.request.post(`${API_BASE_URL}/v1/staff/circles/${detail.id}/members`, {
    data: { loginId: DEMO_CIRCLE_SUB.loginId },
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': await csrfToken(page) }
  })
  expect(addResp.status()).toBe(201)

  const membersAfterAddResp = await page.request.get(`${API_BASE_URL}/v1/staff/circles/${detail.id}/members`)
  const membersAfterAdd = parseStaffMembers(await membersAfterAddResp.json())
  const added = membersAfterAdd.find((member) => member.loginIds.includes(DEMO_CIRCLE_SUB.loginId))
  expect(added).toBeTruthy()

  const deleteResp = await page.request.delete(
    `${API_BASE_URL}/v1/staff/circles/${detail.id}/members/${added?.userId}`,
    {
      headers: { 'X-CSRF-Token': await csrfToken(page) }
    }
  )
  expect(deleteResp.status()).toBe(204)

  const membersAfterDeleteResp = await page.request.get(`${API_BASE_URL}/v1/staff/circles/${detail.id}/members`)
  const membersAfterDelete = parseStaffMembers(await membersAfterDeleteResp.json())
  expect(membersAfterDelete.length).toBe(membersBefore.length)
  expect(membersAfterDelete.some((member) => member.loginIds.includes(DEMO_CIRCLE_SUB.loginId))).toBe(false)
})

test('session protections reject missing CSRF and remove workspace access after logout', async ({ page }) => {
  await loginFromApi(page, DEMO_CIRCLE.loginId, DEMO_CIRCLE.password)
  await setCurrentCircleFromApi(page, CIRCLE_B)

  const csrfDenied = await page.request.put(`${API_BASE_URL}/v1/session/password`, {
    data: {
      currentPassword: DEMO_CIRCLE.password,
      newPassword: 'Demo-new1',
      newPasswordConfirmation: 'Demo-new1'
    },
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': 'invalid-token' }
  })
  expect(csrfDenied.status()).toBe(403)

  const logoutResp = await page.request.post(`${API_BASE_URL}/v1/auth/logout`, {
    headers: { 'X-CSRF-Token': await csrfToken(page) }
  })
  expect(logoutResp.status()).toBe(204)

  await page.goto('/workspace/pages')
  await page.waitForURL(/\/login/)
})
