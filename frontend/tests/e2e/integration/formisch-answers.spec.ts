import { randomUUID } from 'node:crypto'
import { expect, test, type Dialog, type Page, type Request } from '@playwright/test'
import {
  approveCircleFromApi,
  CIRCLE_B,
  DEMO_ADMIN,
  DEMO_CIRCLE,
  loginAsStaff,
  loginFromApi,
  setCurrentCircleFromApi
} from './utils'

const API_BASE_URL = process.env.API_BASE_URL ?? 'http://127.0.0.1:8080'
type QuestionType = 'text' | 'textarea' | 'markdown' | 'select' | 'radio' | 'checkbox' | 'number' | 'upload' | 'heading'

interface QuestionDefinition {
  type: QuestionType
  name: string
  description?: string
  numberMin?: number | null
  numberMax?: number | null
  options?: string[]
}

const defaultQuestions: QuestionDefinition[] = [
  { type: 'text', name: '企画の説明' },
  { type: 'number', name: '参加人数' },
  { type: 'checkbox', name: '必要な備品' },
  { type: 'upload', name: '添付資料' }
]

function stringField(value: unknown, key: string): string {
  if (typeof value === 'object' && value !== null && key in value && typeof value[key] === 'string') {
    return value[key]
  }
  throw new Error(`Expected string field: ${key}`)
}

async function openAnswerForm(page: Page, maxAnswers = 1, questions = defaultQuestions) {
  await loginAsStaff(page, DEMO_ADMIN.loginId, DEMO_ADMIN.password)
  const bootstrap = await page.request.get(`${API_BASE_URL}/v1/session/bootstrap`)
  expect(bootstrap.status()).toBe(200)
  const csrfToken = stringField(await bootstrap.json(), 'csrfToken')
  const headers = { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken }
  const name = `E2E Formisch ${randomUUID()}`
  const created = await page.request.post(`${API_BASE_URL}/v1/staff/forms`, {
    headers,
    data: {
      circleId: '',
      name,
      description: '',
      openAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      closeAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      isPublic: true,
      maxAnswers,
      answerableTags: [],
      confirmationMessage: ''
    }
  })
  expect(created.status()).toBe(201)
  const formId = stringField(await created.json(), 'id')
  const questionIds: Record<string, string> = {}

  for (const [priority, question] of questions.entries()) {
    const added = await page.request.post(`${API_BASE_URL}/v1/staff/forms/${formId}/questions`, {
      headers,
      data: { type: question.type }
    })
    expect(added.status()).toBe(201)
    const questionId = stringField(await added.json(), 'id')
    questionIds[question.type] = questionId
    const updated = await page.request.put(`${API_BASE_URL}/v1/staff/forms/${formId}/questions/${questionId}`, {
      headers,
      data: {
        description: '',
        isRequired: question.type !== 'upload' && question.type !== 'heading',
        numberMin: question.type === 'number' ? 1 : null,
        numberMax: question.type === 'number' ? 500 : null,
        allowedTypes: question.type === 'upload' ? 'txt' : '',
        options: question.type === 'checkbox' ? ['机', '椅子', '電源'] : [],
        priority,
        ...question
      }
    })
    expect(updated.status()).toBe(200)
  }

  await page.context().clearCookies()
  await loginFromApi(page, DEMO_CIRCLE.loginId, DEMO_CIRCLE.password)
  await setCurrentCircleFromApi(page, CIRCLE_B)
  await page.goto(`/workspace/forms/${formId}`)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(name)
  await expect(page.getByLabel('企画の説明', { exact: true })).toBeVisible()
  return { formId, questionIds }
}

function isAnswerSave(request: Request, formId: string) {
  const path = new URL(request.url()).pathname
  return (
    request.method() === 'PUT' &&
    (path === `/v1/forms/${formId}/answer` || path.startsWith(`/v1/forms/${formId}/answers/`))
  )
}

function submitButton(page: Page) {
  return page.locator('form button[type="submit"]')
}

async function fillValidAnswer(page: Page, text: string) {
  await page.getByLabel('企画の説明', { exact: true }).fill(text)
  await page.getByLabel('参加人数', { exact: true }).fill('12')
  await page.getByRole('checkbox', { name: '机', exact: true }).check()
}

async function saveAnswer(page: Page, formId: string): Promise<unknown> {
  const responsePromise = page.waitForResponse((response) => isAnswerSave(response.request(), formId))
  await submitButton(page).click()
  const response = await responsePromise
  expect(response.status()).toBe(200)
  await expect(submitButton(page)).toBeEnabled()
  await expect(page).toHaveURL(new RegExp(`/workspace/forms/${formId}\\?answer=`))
  return response.json()
}

async function uploadAttachment(page: Page, filename: string) {
  await page.getByLabel('添付資料のアップロード', { exact: true }).setInputFiles({
    name: filename,
    mimeType: 'text/plain',
    buffer: Buffer.from('Formisch browser regression test\n')
  })
  const responsePromise = page.waitForResponse(
    (response) => response.request().method() === 'POST' && response.url().endsWith('/uploads')
  )
  await page.getByRole('button', { name: 'ファイルを追加', exact: true }).click()
  expect((await responsePromise).status()).toBe(201)
  // The uploaded list is rendered from the refetched answer, not the selected file.
  await expect(page.locator('li').filter({ hasText: filename })).toBeVisible()
  await expect(page.getByRole('button', { name: 'ファイルを追加', exact: true })).toBeEnabled()
}

test.beforeAll(async () => {
  await approveCircleFromApi(CIRCLE_B)
})

test.beforeEach(() => {
  test.setTimeout(60000)
})

test('required and numeric validation prevents saves and clears errors as the user corrects input', async ({
  page
}) => {
  const { formId } = await openAnswerForm(page)
  const saves: Request[] = []
  page.on('request', (request) => {
    if (isAnswerSave(request, formId)) saves.push(request)
  })

  await submitButton(page).click()
  await expect(page.getByText('企画の説明を入力してください', { exact: true })).toBeVisible()
  await expect(page.getByText('参加人数を入力してください', { exact: true })).toBeVisible()
  await expect(page.getByText('必要な備品を選択してください', { exact: true })).toBeVisible()
  expect(saves).toHaveLength(0)

  await fillValidAnswer(page, '必須項目を入力した回答')
  await expect(page.getByText('企画の説明を入力してください', { exact: true })).toHaveCount(0)
  await expect(page.getByText('必要な備品を選択してください', { exact: true })).toHaveCount(0)
  const number = page.getByLabel('参加人数', { exact: true })
  for (const [value, message] of [
    ['0', '1以上の値を入力してください'],
    ['501', '500以下の値を入力してください'],
    ['1.5', '整数を入力してください']
  ]) {
    await number.fill(value)
    await number.press('Tab')
    await expect(page.getByText(message, { exact: true })).toBeVisible()
    await submitButton(page).click()
    expect(saves).toHaveLength(0)
  }

  await number.fill('12')
  await expect(page.getByText('整数を入力してください', { exact: true })).toHaveCount(0)
  await saveAnswer(page, formId)
  expect(saves).toHaveLength(1)
})

test('checkbox additions and removals survive a real save and page reload', async ({ page }) => {
  const { formId, questionIds } = await openAnswerForm(page)
  await fillValidAnswer(page, '備品を複数選択した回答')
  await page.getByRole('checkbox', { name: '椅子', exact: true }).check()
  await page.getByRole('checkbox', { name: '電源', exact: true }).check()
  await page.getByRole('checkbox', { name: '椅子', exact: true }).uncheck()

  expect(await saveAnswer(page, formId)).toMatchObject({
    answer: { details: { [questionIds.checkbox]: ['机', '電源'] } }
  })
  await page.reload()
  await expect(page.getByRole('checkbox', { name: '机', exact: true })).toBeChecked()
  await expect(page.getByRole('checkbox', { name: '電源', exact: true })).toBeChecked()
  await expect(page.getByRole('checkbox', { name: '椅子', exact: true })).not.toBeChecked()

  await page.getByRole('checkbox', { name: '机', exact: true }).uncheck()
  expect(await saveAnswer(page, formId)).toMatchObject({
    answer: { details: { [questionIds.checkbox]: ['電源'] } }
  })
  await page.reload()
  await expect(page.getByRole('checkbox', { name: '机', exact: true })).not.toBeChecked()
  await expect(page.getByRole('checkbox', { name: '電源', exact: true })).toBeChecked()
})

test('uploading a file preserves unsaved text while the answer is refetched', async ({ page }) => {
  const { formId, questionIds } = await openAnswerForm(page)
  await fillValidAnswer(page, '保存済みの回答')
  await saveAnswer(page, formId)
  const text = page.getByLabel('企画の説明', { exact: true })
  await text.fill('アップロード前に入力した未保存の回答')
  const filename = `draft-${randomUUID()}.txt`
  await uploadAttachment(page, filename)
  await expect(text).toHaveValue('アップロード前に入力した未保存の回答')

  const persisted = await page.request.get(`${API_BASE_URL}/v1/forms/${formId}/answer`)
  expect(persisted.status()).toBe(200)
  expect(await persisted.json()).toMatchObject({
    answer: { details: { [questionIds.text]: ['保存済みの回答'] }, uploads: [{ filename }] }
  })
  expect(await saveAnswer(page, formId)).toMatchObject({
    answer: { details: { [questionIds.text]: ['アップロード前に入力した未保存の回答'] } }
  })
  await page.reload()
  await expect(text).toHaveValue('アップロード前に入力した未保存の回答')
  await expect(page.locator('li').filter({ hasText: filename })).toBeVisible()
})

test('an upload during a delayed save keeps submission disabled and preserves later typing', async ({ page }) => {
  const { formId, questionIds } = await openAnswerForm(page)
  await fillValidAnswer(page, '最初の保存済み回答')
  await saveAnswer(page, formId)
  const text = page.getByLabel('企画の説明', { exact: true })
  await text.fill('送信を開始した時点の回答')

  const savedOnServer = Promise.withResolvers<void>()
  const releaseResponse = Promise.withResolvers<void>()
  let saveRequests = 0
  await page.route(`**/v1/forms/${formId}/answers/*`, async (route) => {
    if (!isAnswerSave(route.request(), formId)) {
      await route.continue()
      return
    }
    saveRequests += 1
    const response = await route.fetch()
    savedOnServer.resolve()
    await releaseResponse.promise
    await route.fulfill({ response })
  })

  try {
    const responsePromise = page.waitForResponse((response) => isAnswerSave(response.request(), formId))
    await submitButton(page).click()
    await savedOnServer.promise
    await expect(submitButton(page)).toBeDisabled()
    await text.fill('送信中に追記した未保存の回答')
    await uploadAttachment(page, `in-flight-${randomUUID()}.txt`)
    await expect(text).toHaveValue('送信中に追記した未保存の回答')
    await expect(submitButton(page)).toBeDisabled()
    await text.press('Enter')
    expect(saveRequests).toBe(1)

    releaseResponse.resolve()
    expect((await responsePromise).status()).toBe(200)
    await expect(submitButton(page)).toBeEnabled()
    await expect(text).toHaveValue('送信中に追記した未保存の回答')
    expect(saveRequests).toBe(1)
  } finally {
    releaseResponse.resolve()
    await page.unrouteAll({ behavior: 'wait' })
  }

  expect(await saveAnswer(page, formId)).toMatchObject({
    answer: { details: { [questionIds.text]: ['送信中に追記した未保存の回答'] } }
  })
  await page.reload()
  await expect(text).toHaveValue('送信中に追記した未保存の回答')
})

test('switching answers preserves dirty input when dismissed and loads the selected answer when accepted', async ({
  page
}) => {
  const { formId } = await openAnswerForm(page, 2)
  await fillValidAnswer(page, '一つ目の保存済み回答')
  await saveAnswer(page, formId)
  const text = page.getByLabel('企画の説明', { exact: true })
  await expect(text).toHaveValue('一つ目の保存済み回答')
  await expect(page.getByLabel('参加人数', { exact: true })).toHaveValue('12')
  await expect(page.getByRole('checkbox', { name: '机', exact: true })).toBeChecked()
  const firstAnswerUrl = page.url()
  const firstAnswerId = new URL(firstAnswerUrl).searchParams.get('answer')
  if (!firstAnswerId) throw new Error('The first answer was not selected after saving')

  const unexpectedDialog = Promise.withResolvers<string>()
  const dismissUnexpectedDialog = async (dialog: Dialog) => {
    unexpectedDialog.resolve(dialog.message())
    await dialog.dismiss()
  }
  page.on('dialog', dismissUnexpectedDialog)
  try {
    const createdPromise = page.waitForResponse(
      (response) => response.request().method() === 'POST' && response.url().endsWith(`/forms/${formId}/answers`)
    )
    await page.getByRole('button', { name: '新しい回答を作成', exact: true }).click()
    const creationResult = await Promise.race([
      createdPromise.then((response) => response.status()),
      unexpectedDialog.promise
    ])
    expect(creationResult, 'Creating another answer immediately after saving must not ask to discard changes').toBe(201)
  } finally {
    page.off('dialog', dismissUnexpectedDialog)
  }
  await expect(page).not.toHaveURL(firstAnswerUrl)
  await expect(text).toHaveValue('')
  await fillValidAnswer(page, '二つ目の保存済み回答')
  await saveAnswer(page, formId)
  const secondAnswerUrl = page.url()
  await text.fill('二つ目の未保存の追記')

  const firstAnswer = page.getByRole('button', { name: new RegExp(`回答ID : ${firstAnswerId}$`) })
  const dismissDialogPromise = page.waitForEvent('dialog')
  const dismissedSwitch = firstAnswer.click()
  const dismissedDialog = await dismissDialogPromise
  expect(dismissedDialog.type()).toBe('confirm')
  expect(dismissedDialog.message()).toBe('入力内容が保存されていません。このページを離れますか？')
  await dismissedDialog.dismiss()
  await dismissedSwitch
  await expect(page).toHaveURL(secondAnswerUrl)
  await expect(text).toHaveValue('二つ目の未保存の追記')

  const acceptDialogPromise = page.waitForEvent('dialog')
  const acceptedSwitch = firstAnswer.click()
  const acceptedDialog = await acceptDialogPromise
  expect(acceptedDialog.type()).toBe('confirm')
  await acceptedDialog.accept()
  await acceptedSwitch
  await expect(page).toHaveURL(firstAnswerUrl)
  await expect(text).toHaveValue('一つ目の保存済み回答')
  await page.reload()
  await expect(page).toHaveURL(firstAnswerUrl)
  await expect(text).toHaveValue('一つ目の保存済み回答')
})

test('a failed save preserves input and allows a retry that persists to the real API', async ({ page }) => {
  const { formId, questionIds } = await openAnswerForm(page)
  const draft = '一時的な保存エラー後に再送する回答'
  await fillValidAnswer(page, draft)
  const saveUrl = `**/v1/forms/${formId}/answer`
  let failedRequests = 0
  await page.route(saveUrl, async (route) => {
    if (!isAnswerSave(route.request(), formId)) {
      await route.continue()
      return
    }
    failedRequests += 1
    await route.fulfill({ status: 503, contentType: 'application/json', body: '{"message":"Temporarily unavailable"}' })
  })

  const failedResponsePromise = page.waitForResponse((response) => isAnswerSave(response.request(), formId))
  await submitButton(page).click()
  expect((await failedResponsePromise).status()).toBe(503)
  await expect(page.getByRole('alert')).toHaveText('回答の保存に失敗しました。')
  await expect(page.getByLabel('企画の説明', { exact: true })).toHaveValue(draft)
  await expect(page.getByLabel('参加人数', { exact: true })).toHaveValue('12')
  await expect(page.getByRole('checkbox', { name: '机', exact: true })).toBeChecked()
  await expect(submitButton(page)).toBeEnabled()
  expect(failedRequests).toBe(1)

  await page.unroute(saveUrl)
  expect(await saveAnswer(page, formId)).toMatchObject({
    answer: { details: { [questionIds.text]: [draft], [questionIds.number]: ['12'], [questionIds.checkbox]: ['机'] } }
  })
  await expect(page.getByText('回答の保存に失敗しました。', { exact: true })).toHaveCount(0)
  await page.reload()
  await expect(page.getByLabel('企画の説明', { exact: true })).toHaveValue(draft)
  await expect(page.getByLabel('参加人数', { exact: true })).toHaveValue('12')
  await expect(page.getByRole('checkbox', { name: '机', exact: true })).toBeChecked()
})

test('schema-generated controls preserve question order and all answer types through a save and reload', async ({
  page
}) => {
  const questions: QuestionDefinition[] = [
    { type: 'text', name: '企画の説明' },
    { type: 'heading', name: '追加の申請情報', description: '以下の項目を順番に入力してください。' },
    { type: 'textarea', name: '詳しい説明' },
    { type: 'markdown', name: '装飾付き説明' },
    { type: 'select', name: '展示方法', options: ['パネル展示', '映像展示'] },
    { type: 'radio', name: '会場区分', options: ['屋内', '屋外'] },
    { type: 'checkbox', name: '必要な備品' },
    { type: 'number', name: '参加人数', numberMin: 2, numberMax: 4 }
  ]
  const { formId, questionIds } = await openAnswerForm(page, 1, questions)
  const orderedLabels = page.locator('form h2, form label[for]')
  await expect(orderedLabels).toHaveText(questions.map((question) => new RegExp(question.name)))
  await expect(page.getByRole('heading', { name: '追加の申請情報', level: 2 })).toBeVisible()
  await expect(page.getByText('以下の項目を順番に入力してください。', { exact: true })).toBeVisible()
  const number = page.getByRole('combobox', { name: '参加人数', exact: true })
  await expect(number.locator('option')).toHaveText(['選択してください', '2', '3', '4'])

  await page.getByLabel('企画の説明', { exact: true }).fill('スキーマから生成した回答')
  await page.getByLabel('詳しい説明', { exact: true }).fill('一行目\n二行目')
  const markdown = page.locator(`textarea[name="${questionIds.markdown}"]`)
  await markdown.fill('**強調した説明**')
  await page.getByRole('button', { name: 'プレビュー', exact: true }).click()
  await expect(page.locator('strong').filter({ hasText: '強調した説明' })).toBeVisible()
  await page.getByRole('button', { name: '閉じる', exact: true }).click()
  await page.getByRole('combobox', { name: '展示方法', exact: true }).selectOption('映像展示')
  await page.getByRole('radio', { name: '屋外', exact: true }).check()
  await page.getByRole('checkbox', { name: '机', exact: true }).check()
  await page.getByRole('checkbox', { name: '電源', exact: true }).check()
  await number.selectOption('3')

  expect(await saveAnswer(page, formId)).toMatchObject({
    answer: {
      details: {
        [questionIds.text]: ['スキーマから生成した回答'],
        [questionIds.textarea]: ['一行目\n二行目'],
        [questionIds.markdown]: ['**強調した説明**'],
        [questionIds.select]: ['映像展示'],
        [questionIds.radio]: ['屋外'],
        [questionIds.checkbox]: ['机', '電源'],
        [questionIds.number]: ['3']
      }
    }
  })
  await page.reload()
  await expect(orderedLabels).toHaveText(questions.map((question) => new RegExp(question.name)))
  await expect(page.getByLabel('企画の説明', { exact: true })).toHaveValue('スキーマから生成した回答')
  await expect(page.getByLabel('詳しい説明', { exact: true })).toHaveValue('一行目\n二行目')
  await expect(markdown).toHaveValue('**強調した説明**')
  await expect(page.getByRole('combobox', { name: '展示方法', exact: true })).toHaveValue('映像展示')
  await expect(page.getByRole('radio', { name: '屋外', exact: true })).toBeChecked()
  await expect(page.getByRole('radio', { name: '屋内', exact: true })).not.toBeChecked()
  await expect(page.getByRole('checkbox', { name: '机', exact: true })).toBeChecked()
  await expect(page.getByRole('checkbox', { name: '電源', exact: true })).toBeChecked()
  await expect(number).toHaveValue('3')
})
