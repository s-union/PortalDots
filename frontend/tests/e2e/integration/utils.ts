import { readdirSync, readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { join } from 'node:path'
import { expect, request as playwrightRequest, type Page } from '@playwright/test'

export const DEMO_CIRCLE = {
  loginId: 'DEMO-CIRCLE',
  password: 'demo-circle',
  displayName: 'デモ 企画者',
  userId: 'CMg49o6YRtmKUppmRmoiY'
}
export const DEMO_CIRCLE_SUB = { loginId: 'DEMO-CIRCLE-SUB', password: 'demo-circle-sub', displayName: 'デモ 副企画者' }
export const DEMO_ADMIN = { loginId: 'DEMO-ADMIN', password: 'demo-admin', displayName: 'デモ 管理者' }
export const DEMO_STAFF = { loginId: 'DEMO-STAFF', password: 'demo-staff', displayName: 'デモ スタッフ' }
export const DEMO_STAFF_SUB = { loginId: 'DEMO-STAFF-SUB', password: 'demo-staff-sub', displayName: 'デモ 副スタッフ' }

export const CIRCLE_A = 'デモ企画A'
export const CIRCLE_B = 'デモ企画B'

const API_BASE_URL = process.env.API_BASE_URL ?? 'http://127.0.0.1:8080'

interface StaffCircle {
  id: string
  name: string
  nameYomi: string
  groupName: string
  groupNameYomi: string
  participationTypeId: string
  notes: string
  status: string
  statusReason: string
  places: string[]
}

interface MailEntry {
  subject: string
  body: string
  recipients: string[]
  createdAt: string
}

function getStringField(value: unknown, key: string, label: string): string {
  if (typeof value === 'object' && value !== null && key in value && typeof value[key] === 'string') {
    return value[key]
  }
  throw new Error(`Invalid ${label} response: missing ${key}`)
}

function getOptionalStringField(value: unknown, key: string): string | undefined {
  if (typeof value === 'object' && value !== null && key in value) {
    const field = value[key]
    return typeof field === 'string' ? field : undefined
  }
  return undefined
}

function hasSessionUser(value: unknown): boolean {
  return typeof value === 'object' && value !== null && 'user' in value && value.user !== null
}

function isStaffCircle(value: unknown): value is StaffCircle {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'string' &&
    'name' in value &&
    typeof value.name === 'string' &&
    'nameYomi' in value &&
    typeof value.nameYomi === 'string' &&
    'groupName' in value &&
    typeof value.groupName === 'string' &&
    'groupNameYomi' in value &&
    typeof value.groupNameYomi === 'string' &&
    'participationTypeId' in value &&
    typeof value.participationTypeId === 'string' &&
    'notes' in value &&
    typeof value.notes === 'string' &&
    'status' in value &&
    typeof value.status === 'string' &&
    'statusReason' in value &&
    typeof value.statusReason === 'string' &&
    'places' in value &&
    Array.isArray(value.places) &&
    value.places.every((place) => typeof place === 'string')
  )
}

function isMailEntry(value: unknown): value is MailEntry {
  return (
    typeof value === 'object' &&
    value !== null &&
    'subject' in value &&
    typeof value.subject === 'string' &&
    'body' in value &&
    typeof value.body === 'string' &&
    'recipients' in value &&
    Array.isArray(value.recipients) &&
    value.recipients.every((recipient) => typeof recipient === 'string') &&
    'createdAt' in value &&
    typeof value.createdAt === 'string'
  )
}

function parseStaffCircles(value: unknown): StaffCircle[] {
  if (!Array.isArray(value) || !value.every(isStaffCircle)) {
    throw new Error('Invalid staff circles response')
  }
  return value
}

function parseMailEntries(value: unknown): MailEntry[] {
  if (!Array.isArray(value) || !value.every(isMailEntry)) {
    throw new Error('Invalid staff mails response')
  }
  return value
}

export async function loginFromApi(page: Page, loginId: string, password: string) {
  const response = await page.request.post(`${API_BASE_URL}/v1/auth/login`, {
    data: { loginId, password },
    headers: { 'Content-Type': 'application/json' }
  })
  if (response.status() !== 204) {
    throw new Error(`Login failed: ${response.status()} ${await response.text()}`)
  }
  const bootstrapResponse = await page.request.get(`${API_BASE_URL}/v1/session/bootstrap`)
  if (bootstrapResponse.status() !== 200) {
    throw new Error(`Fetch session failed: ${bootstrapResponse.status()} ${await bootstrapResponse.text()}`)
  }
  const bootstrap: unknown = await bootstrapResponse.json()
  if (!hasSessionUser(bootstrap)) {
    throw new Error(`Login failed: session user is empty for ${loginId}`)
  }
  await page.goto('/')
  await page.waitForLoadState('networkidle')
}

export async function selectCircle(page: Page, circleName: string) {
  await page.goto('/circles/select')
  await page.waitForURL('/circles/select')
  await page.waitForLoadState('networkidle')
  const btn = page.locator(`button:has-text("${circleName}")`)
  await btn.waitFor({ state: 'visible', timeout: 15000 })
  await btn.click()
  await page.waitForURL('/')
}

export async function setCurrentCircleFromApi(page: Page, circleName: string) {
  const circlesResponse = await page.request.get(`${API_BASE_URL}/v1/circles`)
  if (circlesResponse.status() !== 200) {
    throw new Error(`Fetch circles failed: ${circlesResponse.status()} ${await circlesResponse.text()}`)
  }
  const circles: unknown = await circlesResponse.json()
  if (!Array.isArray(circles)) {
    throw new Error('Fetch circles failed: invalid response')
  }
  const circle = circles.find(
    (item): item is { id: string; name: string } =>
      typeof item === 'object' &&
      item !== null &&
      'id' in item &&
      'name' in item &&
      typeof item.id === 'string' &&
      typeof item.name === 'string' &&
      item.name === circleName
  )
  if (!circle) {
    throw new Error(`Circle not found: ${circleName}`)
  }

  const bootstrapResponse = await page.request.get(`${API_BASE_URL}/v1/session/bootstrap`)
  if (bootstrapResponse.status() !== 200) {
    throw new Error(`Fetch session failed: ${bootstrapResponse.status()} ${await bootstrapResponse.text()}`)
  }
  const bootstrap: unknown = await bootstrapResponse.json()
  const csrfToken =
    typeof bootstrap === 'object' &&
    bootstrap !== null &&
    'csrfToken' in bootstrap &&
    typeof bootstrap.csrfToken === 'string'
      ? bootstrap.csrfToken
      : ''

  const response = await page.request.put(`${API_BASE_URL}/v1/circles/current`, {
    data: { circleId: circle.id },
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken
    }
  })
  if (response.status() !== 204) {
    throw new Error(`Set current circle failed: ${response.status()} ${await response.text()}`)
  }
}

/**
 * Performs the staff two-factor verification flow via the UI.
 * Requires allowDangerously mode: the verify/request response must include verifyCode.
 */
export async function verifyStaffFromUi(page: Page): Promise<void> {
  await page.goto('/staff/verify')
  await page.waitForURL('**/staff/verify')
  await page.getByRole('button', { name: '認証コードを再送する' }).waitFor({ state: 'visible', timeout: 10000 })

  const [requestResp] = await Promise.all([
    page.waitForResponse((resp) => resp.url().includes('/staff/verify/request') && resp.request().method() === 'POST', {
      timeout: 15000
    }),
    page.getByRole('button', { name: '認証コードを再送する' }).click()
  ])
  const body: unknown = await requestResp.json()
  const verifyCode = getOptionalStringField(body, 'verifyCode')
  if (!verifyCode) {
    throw new Error('verifyCode not found in response. Is allowDangerously mode enabled?')
  }

  await page.locator('input[name="verifyCode"]').fill(verifyCode)
  await page.getByRole('button', { name: 'ログイン' }).click()
  await page.waitForURL('**/staff')
}

/**
 * Updates a user's staff permissions using an independent API context
 * so the browser session is not affected.
 */
export async function updateStaffPermissionsFromApi(targetUserId: string, permissions: string[]): Promise<void> {
  const ctx = await playwrightRequest.newContext({ baseURL: API_BASE_URL })
  try {
    await ctx.post('/v1/auth/login', {
      data: { loginId: DEMO_ADMIN.loginId, password: DEMO_ADMIN.password },
      headers: { 'Content-Type': 'application/json' }
    })
    await verifyStaffInApiContext(ctx)

    const bootstrapResp = await ctx.get('/v1/session/bootstrap')
    const bootstrap: unknown = await bootstrapResp.json()
    const csrfToken = getStringField(bootstrap, 'csrfToken', 'session bootstrap')

    const resp = await ctx.put(`/v1/staff/permissions/${targetUserId}`, {
      data: { permissions },
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken }
    })
    if (resp.status() !== 200) {
      throw new Error(`Failed to update staff permissions: ${resp.status()} ${await resp.text()}`)
    }
  } finally {
    await ctx.dispose()
  }
}

/** Logs in as a staff user and completes the two-factor verification flow. */
export async function loginAsStaff(page: Page, loginId: string, password: string): Promise<void> {
  await loginFromApi(page, loginId, password)
  await verifyStaffFromUi(page)
}

export async function loginFromUi(page: Page, loginId: string, password: string) {
  await page.goto('/login')
  await page.waitForURL('/login')
  await page.getByLabel('学籍番号または連絡先メールアドレス').fill(loginId)
  await page.getByLabel('パスワード').fill(password)
  await page.getByRole('button', { name: 'ログイン' }).click()
  await expect(page.locator('button:has-text("ログアウト")')).toBeVisible({ timeout: 15000 })
}

/**
 * Performs staff two-factor verification using an existing API context.
 * Requires allowDangerously mode: the verify/request response must include verifyCode.
 */
async function verifyStaffInApiContext(ctx: Awaited<ReturnType<typeof playwrightRequest.newContext>>): Promise<void> {
  const bootstrapResp = await ctx.get('/v1/session/bootstrap')
  if (bootstrapResp.status() !== 200) {
    throw new Error(`Fetch session failed: ${bootstrapResp.status()} ${await bootstrapResp.text()}`)
  }
  const bootstrap: unknown = await bootstrapResp.json()
  const csrfToken = getStringField(bootstrap, 'csrfToken', 'session bootstrap')

  const verifyRequestResp = await ctx.post('/v1/staff/verify/request', {
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken }
  })
  if (verifyRequestResp.status() !== 200) {
    throw new Error(
      `Staff verification request failed: ${verifyRequestResp.status()} ${await verifyRequestResp.text()}`
    )
  }
  const verifyBody: unknown = await verifyRequestResp.json()
  const verifyCode = getOptionalStringField(verifyBody, 'verifyCode')
  if (!verifyCode) {
    throw new Error('verifyCode not found in response. Is allowDangerously mode enabled?')
  }

  await ctx.post('/v1/staff/verify/confirm', {
    data: { verifyCode },
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken }
  })
}

/**
 * Approves a circle by name as admin using an independent API context
 * that does not affect the browser's session cookies.
 */
export async function approveCircleFromApi(circleName: string): Promise<void> {
  const ctx = await playwrightRequest.newContext({ baseURL: API_BASE_URL })
  try {
    await ctx.post('/v1/auth/login', {
      data: { loginId: DEMO_ADMIN.loginId, password: DEMO_ADMIN.password },
      headers: { 'Content-Type': 'application/json' }
    })
    await verifyStaffInApiContext(ctx)

    const circlesResp = await ctx.get('/v1/staff/circles/all')
    if (circlesResp.status() !== 200) {
      throw new Error(`Fetch staff circles failed: ${circlesResp.status()} ${await circlesResp.text()}`)
    }
    const circles = parseStaffCircles(await circlesResp.json())
    const circle = circles.find((c) => c.name === circleName)
    if (!circle) {
      throw new Error(`Circle not found: ${circleName}`)
    }

    const bootstrapResp = await ctx.get('/v1/session/bootstrap')
    const bootstrap: unknown = await bootstrapResp.json()
    const csrfToken = getStringField(bootstrap, 'csrfToken', 'session bootstrap')

    const resp = await ctx.put(`/v1/staff/circles/${circle.id}`, {
      data: {
        name: circle.name,
        nameYomi: circle.nameYomi,
        groupName: circle.groupName,
        groupNameYomi: circle.groupNameYomi,
        participationTypeId: circle.participationTypeId,
        notes: circle.notes,
        status: 'approved',
        statusReason: '',
        placeIds: []
      },
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken }
    })
    if (resp.status() !== 200) {
      throw new Error(`Approve circle failed: ${resp.status()} ${await resp.text()}`)
    }
  } finally {
    await ctx.dispose()
  }
}

/**
 * Fetches recorded mail history as admin using an independent API context
 * that does not affect the browser's session cookies.
 */
export async function fetchMailsAsAdmin(): Promise<MailEntry[]> {
  const ctx = await playwrightRequest.newContext({ baseURL: API_BASE_URL })
  try {
    await ctx.post('/v1/auth/login', {
      data: { loginId: DEMO_ADMIN.loginId, password: DEMO_ADMIN.password },
      headers: { 'Content-Type': 'application/json' }
    })
    const resp = await ctx.get('/v1/staff/mails')
    if (resp.status() !== 200) {
      throw new Error(`Failed to fetch mails: ${resp.status()} ${await resp.text()}`)
    }
    return parseMailEntries(await resp.json())
  } finally {
    await ctx.dispose()
  }
}

/**
 * Polls GET /v1/staff/mails until an email matching the predicate appears,
 * or throws after the timeout.
 */
export async function waitForMail(
  predicate: (mail: MailEntry) => boolean,
  { timeoutMs = 10000, intervalMs = 500 }: { timeoutMs?: number; intervalMs?: number } = {}
): Promise<MailEntry> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const mails = await fetchMailsAsAdmin()
    const found = mails.find(predicate)
    if (found) {
      return found
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }
  throw new Error('Timed out waiting for matching mail in history')
}

/** Extracts the first http(s) URL found in a mail body. */
export function extractUrlFromBody(body: string): string {
  const match = /https?:\/\/\S+/.exec(body)
  if (!match) {
    throw new Error(`No URL found in mail body:\n${body}`)
  }
  return match[0]
}

function findMiniflareEmailTextDirs(): string[] {
  try {
    const result = execSync('find /tmp -maxdepth 4 -name email-text -type d 2>/dev/null', {
      encoding: 'utf8',
      timeout: 3000
    })
    return result.trim().split('\n').filter(Boolean)
  } catch (err: unknown) {
    // Find exits non-zero when it hits permission-denied dirs, but still writes matches to stdout.
    if (err && typeof err === 'object' && 'stdout' in err && typeof err.stdout === 'string') {
      return err.stdout.trim().split('\n').filter(Boolean)
    }
    return []
  }
}

function listEmailFiles(dirs: string[]): Set<string> {
  const files = new Set<string>()
  for (const dir of dirs) {
    try {
      for (const name of readdirSync(dir)) {
        files.add(join(dir, name))
      }
    } catch {
      // Ignore missing directories created after the snapshot.
    }
  }
  return files
}

/** Snapshot all miniflare email-text file paths currently on disk. Pass the result as `before` to `waitForMiniflareEmail` to skip already-existing files. */
export function snapshotEmailFiles(): Set<string> {
  return listEmailFiles(findMiniflareEmailTextDirs())
}

/** Polls miniflare email-text directories until a new file (not in `before`) matches the predicate. Returns the file content. */
export async function waitForMiniflareEmail(
  predicate: (content: string) => boolean,
  {
    timeoutMs = 15000,
    intervalMs = 500,
    before = new Set<string>()
  }: { timeoutMs?: number; intervalMs?: number; before?: Set<string> } = {}
): Promise<string> {
  const dirs = findMiniflareEmailTextDirs()
  if (dirs.length === 0) {
    throw new Error('miniflare email-text directory not found. Run `mise run dev:worker` to start the email worker.')
  }
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    for (const filePath of listEmailFiles(dirs)) {
      if (before.has(filePath)) {
        continue
      }
      try {
        const content = readFileSync(filePath, 'utf8')
        if (predicate(content)) {
          return content
        }
      } catch {
        // The file may have been deleted between listing and reading.
      }
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }
  throw new Error('Timed out waiting for matching miniflare email file')
}
