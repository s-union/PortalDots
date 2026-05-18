import { readdirSync, readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { join } from 'node:path'
import { expect, request as playwrightRequest, type Page } from '@playwright/test'

export const DEMO_CIRCLE = { loginId: 'DEMO-CIRCLE', password: 'demo-circle', displayName: 'デモ 企画者' }
export const DEMO_CIRCLE_SUB = { loginId: 'DEMO-CIRCLE-SUB', password: 'demo-circle-sub', displayName: 'デモ 副企画者' }
export const DEMO_ADMIN = { loginId: 'DEMO-ADMIN', password: 'demo-admin', displayName: 'デモ 管理者' }
export const DEMO_STAFF = { loginId: 'DEMO-STAFF', password: 'demo-staff', displayName: 'デモ スタッフ' }
export const DEMO_STAFF_SUB = { loginId: 'DEMO-STAFF-SUB', password: 'demo-staff-sub', displayName: 'デモ 副スタッフ' }

export const CIRCLE_A = 'デモ企画A'
export const CIRCLE_B = 'デモ企画B'

const API_BASE_URL = process.env.API_BASE_URL ?? 'http://127.0.0.1:8080'

export async function loginFromApi(page: Page, loginId: string, password: string) {
  const response = await page.request.post(`${API_BASE_URL}/v1/auth/login`, {
    data: { loginId, password },
    headers: { 'Content-Type': 'application/json' }
  })
  if (response.status() !== 204) {
    throw new Error(`Login failed: ${response.status()} ${await response.text()}`)
  }
  await page.goto('/')
  await expect(page.locator('button:has-text("ログアウト")')).toBeVisible({ timeout: 15000 })
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

export async function loginFromUi(page: Page, loginId: string, password: string) {
  await page.goto('/login')
  await page.waitForURL('/login')
  await page.getByLabel('学籍番号または連絡先メールアドレス').fill(loginId)
  await page.getByLabel('パスワード').fill(password)
  await page.getByRole('button', { name: 'ログイン' }).click()
  await expect(page.locator('button:has-text("ログアウト")')).toBeVisible({ timeout: 15000 })
}

type StaffCircle = {
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

    const circlesResp = await ctx.get('/v1/staff/circles/all')
    if (circlesResp.status() !== 200) {
      throw new Error(`Fetch staff circles failed: ${circlesResp.status()} ${await circlesResp.text()}`)
    }
    const circles = (await circlesResp.json()) as StaffCircle[]
    const circle = circles.find((c) => c.name === circleName)
    if (!circle) {
      throw new Error(`Circle not found: ${circleName}`)
    }

    const bootstrapResp = await ctx.get('/v1/session/bootstrap')
    const bootstrap = (await bootstrapResp.json()) as { csrfToken: string }

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
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': bootstrap.csrfToken }
    })
    if (resp.status() !== 200) {
      throw new Error(`Approve circle failed: ${resp.status()} ${await resp.text()}`)
    }
  } finally {
    await ctx.dispose()
  }
}

type MailEntry = { subject: string; body: string; recipients: string[]; createdAt: string }

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
    return (await resp.json()) as MailEntry[]
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
    if (found) return found
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }
  throw new Error('Timed out waiting for matching mail in history')
}

/** Extracts the first http(s) URL found in a mail body. */
export function extractUrlFromBody(body: string): string {
  const match = body.match(/https?:\/\/\S+/)
  if (!match) throw new Error(`No URL found in mail body:\n${body}`)
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
    // find exits non-zero when it hits permission-denied dirs, but still writes matches to stdout
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
      // ignore — directory may not exist yet
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
      if (before.has(filePath)) continue
      try {
        const content = readFileSync(filePath, 'utf8')
        if (predicate(content)) return content
      } catch {
        // file may have been deleted between listing and reading
      }
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }
  throw new Error('Timed out waiting for matching miniflare email file')
}
