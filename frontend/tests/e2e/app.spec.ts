import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  let isAuthenticated = false
  let currentRoles: string[] = []
  let currentCircle: null | { id: string; name: string } = null
  let formAnswerBody = ''
  let staffAuthorized = false
  let staffPages = [
    {
      id: 'page-circle-b-private',
      title: '非公開メモ',
      publishedAt: '2026-03-04T09:00:00Z',
      isPinned: false,
      isPublic: false
    }
  ]

  await page.route('**/v1/session/bootstrap', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        csrfToken: 'csrf-token',
        currentCircle,
        featureFlags: [],
        roles: isAuthenticated ? currentRoles : [],
        user: isAuthenticated
          ? {
              id: 'demo-user',
              displayName: 'Demo User'
            }
          : null
      })
    })
  })

  await page.route('**/v1/auth/login', async (route) => {
    const payload = parseJsonObject(route.request().postData())
    isAuthenticated = true
    staffAuthorized = false
    currentRoles = payload.loginId === 'staff@example.com' ? ['admin'] : ['participant']
    await route.fulfill({ status: 204 })
  })

  await page.route('**/v1/auth/logout', async (route) => {
    isAuthenticated = false
    currentRoles = []
    currentCircle = null
    staffAuthorized = false
    await route.fulfill({ status: 204 })
  })

  await page.route('**/v1/staff/status', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        allowed: currentRoles.includes('admin'),
        authorized: currentRoles.includes('admin') && staffAuthorized
      })
    })
  })

  await page.route('**/v1/staff/verify/request', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        deliveryMode: 'mock',
        message: 'モック中: メールは送信していません。画面に表示された認証コードを入力してください。',
        verifyCode: '123456'
      })
    })
  })

  await page.route('**/v1/staff/verify/confirm', async (route) => {
    const payload = parseJsonObject(route.request().postData())
    const verifyCode = typeof payload.verifyCode === 'string' ? payload.verifyCode.trim() : ''
    if (verifyCode !== '123456') {
      await route.fulfill({
        status: 422,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'validation_error',
          errors: {
            verifyCode: ['認証コードが間違っているか、期限切れです。再度お試しください。']
          }
        })
      })
      return
    }

    staffAuthorized = true
    await route.fulfill({ status: 204 })
  })

  await page.route('**/v1/staff/pages', async (route) => {
    const requestUrl = new URL(route.request().url())
    if (route.request().method() === 'POST') {
      const payload = parseJsonObject(route.request().postData())
      const created = {
        id: `page-generated-${staffPages.length + 1}`,
        title: typeof payload.title === 'string' ? payload.title : '',
        publishedAt: '2026-03-12T00:00:00Z',
        isPinned: false,
        isPublic: payload.isPublic === true
      }
      staffPages = [created, ...staffPages]
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(created)
      })
      return
    }

    const query = requestUrl.searchParams.get('query')?.trim() ?? ''
    const pages = query === '' ? staffPages : staffPages.filter((p) => p.title.includes(query))
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(pages)
    })
  })

  await page.route('**/v1/circles', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'circle-a',
          name: 'デモ企画A',
          groupName: 'Aブロック',
          participationTypeName: '模擬店'
        },
        {
          id: 'circle-b',
          name: 'デモ企画B',
          groupName: 'Bブロック',
          participationTypeName: '展示'
        }
      ])
    })
  })

  await page.route('**/v1/circles/current', async (route) => {
    currentCircle = {
      id: 'circle-b',
      name: 'デモ企画B'
    }
    await route.fulfill({ status: 204 })
  })

  await page.route('**/v1/pages', async (route) => {
    const requestUrl = new URL(route.request().url())
    const query = requestUrl.searchParams.get('query')?.trim() ?? ''

    const pages =
      query === '' || query === 'レイアウト'
        ? [
            {
              id: 'page-circle-b-1',
              title: '展示レイアウト更新',
              publishedAt: '2026-03-03T09:00:00Z'
            }
          ]
        : []

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(pages)
    })
  })

  await page.route('**/v1/pages/page-circle-b-1', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'page-circle-b-1',
        title: '展示レイアウト更新',
        body: 'Bブロックの展示レイアウトを更新しました。',
        publishedAt: '2026-03-03T09:00:00Z'
      })
    })
  })

  await page.route('**/v1/documents', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'document-circle-b-1',
          name: '展示ガイド',
          description: 'Bブロック向けの展示ガイドです。'
        }
      ])
    })
  })

  await page.route('**/v1/documents/document-circle-b-1', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'document-circle-b-1',
        name: '展示ガイド',
        description: 'Bブロック向けの展示ガイドです。',
        filename: 'b-exhibition-guide.txt',
        mimeType: 'text/plain; charset=utf-8',
        downloadUrl: '/v1/documents/document-circle-b-1/file'
      })
    })
  })

  await page.route('**/v1/forms', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'form-circle-b-1',
          name: '展示チェックフォーム',
          closeAt: '2026-03-22T23:59:59Z'
        }
      ])
    })
  })

  await page.route('**/v1/forms/form-circle-b-1', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'form-circle-b-1',
        name: '展示チェックフォーム',
        description: '展示レイアウトと機材使用申請を提出してください。',
        openAt: '2026-03-02T00:00:00Z',
        closeAt: '2026-03-22T23:59:59Z'
      })
    })
  })

  await page.route('**/v1/forms/form-circle-b-1/answer', async (route) => {
    if (route.request().method() === 'PUT') {
      const payload = parseJsonObject(route.request().postData())
      formAnswerBody = typeof payload.body === 'string' ? payload.body : ''
      if (formAnswerBody.trim() === '') {
        await route.fulfill({
          status: 422,
          contentType: 'application/json',
          body: JSON.stringify({
            message: 'validation_error',
            errors: {
              body: ['回答を入力してください']
            }
          })
        })
        return
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          answer: {
            id: 'answer-1',
            body: formAnswerBody,
            updatedAt: '2026-03-06T12:00:00Z'
          }
        })
      })
      return
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        answer:
          formAnswerBody === ''
            ? null
            : {
                id: 'answer-1',
                body: formAnswerBody,
                updatedAt: '2026-03-06T12:00:00Z'
              }
      })
    })
  })
})

test('login to workspace pages flow renders', async ({ page }) => {
  await page.goto('/login')

  await page.getByLabel('学籍番号または連絡先メールアドレス').fill('demo@example.com')
  await page.getByLabel('パスワード').fill('password')
  await page.getByRole('button', { name: 'ログイン' }).click()

  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByText('Demo User としてログイン中です')).toBeVisible()

  await page.getByRole('button', { name: 'デモ企画B' }).click()
  await expect(page.getByText('Current circle: デモ企画B')).toBeVisible()

  await page.goto('/workspace')
  await page.getByRole('link', { name: 'お知らせを見る' }).click()
  await expect(page).toHaveURL(/\/workspace\/pages$/)
  await expect(page.getByText('展示レイアウト更新')).toBeVisible()

  await page.getByRole('link', { name: '展示レイアウト更新' }).click()
  await expect(page).toHaveURL(/\/workspace\/pages\/page-circle-b-1$/)
  await expect(page.getByText('Bブロックの展示レイアウトを更新しました。')).toBeVisible()
})

test('pages flow supports searching and empty results', async ({ page }) => {
  await page.goto('/login')

  await page.getByLabel('学籍番号または連絡先メールアドレス').fill('demo@example.com')
  await page.getByLabel('パスワード').fill('password')
  await page.getByRole('button', { name: 'ログイン' }).click()
  await page.getByRole('button', { name: 'デモ企画B' }).click()

  await page.goto('/workspace/pages')

  await page.locator('input[name="query"]').fill('存在しない語')
  await page.getByRole('button', { name: '検索' }).click()
  await expect(page).toHaveURL(/query=/)
  await expect(page.getByText('検索結果が見つかりません。')).toBeVisible()

  await page.getByRole('button', { name: 'リセット' }).click()
  await expect(page).toHaveURL(/\/workspace\/pages$/)
  await expect(page.getByText('展示レイアウト更新')).toBeVisible()
})

test('documents flow renders download metadata', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('学籍番号または連絡先メールアドレス').fill('demo@example.com')
  await page.getByLabel('パスワード').fill('password')
  await page.getByRole('button', { name: 'ログイン' }).click()

  await page.goto('/circles/select')
  await page.getByRole('button', { name: 'デモ企画B Bブロック / 展示' }).click()

  await page.goto('/workspace/documents')
  await expect(page.getByRole('link', { name: '展示ガイド Bブロック向けの展示ガイドです。' })).toBeVisible()

  await page.getByRole('link', { name: '展示ガイド Bブロック向けの展示ガイドです。' }).click()
  await expect(page).toHaveURL(/\/workspace\/documents\/document-circle-b-1$/)
  await expect(page.getByText('b-exhibition-guide.txt')).toBeVisible()
  await expect(page.getByRole('link', { name: 'ダウンロード' })).toHaveAttribute(
    'href',
    /\/v1\/documents\/document-circle-b-1\/file$/
  )
})

test('forms flow renders open forms', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('学籍番号または連絡先メールアドレス').fill('demo@example.com')
  await page.getByLabel('パスワード').fill('password')
  await page.getByRole('button', { name: 'ログイン' }).click()

  await page.getByRole('button', { name: 'デモ企画B' }).click()
  await page.goto('/workspace/forms')

  await expect(page.getByText('展示チェックフォーム')).toBeVisible()
  await page.getByRole('link', { name: /展示チェックフォーム/ }).click()
  await expect(page).toHaveURL(/\/workspace\/forms\/form-circle-b-1$/)
  await expect(page.getByText('展示レイアウトと機材使用申請を提出してください。')).toBeVisible()
  await page.locator('textarea[name="answer-body"]').fill('電源は 2 口必要です。')
  await page.getByRole('button', { name: '回答を保存' }).click()
  await expect(page.getByText('last updated: 2026-03-06T12:00:00Z')).toBeVisible()
})

test('forms flow renders validation errors when answer is blank', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('学籍番号または連絡先メールアドレス').fill('demo@example.com')
  await page.getByLabel('パスワード').fill('password')
  await page.getByRole('button', { name: 'ログイン' }).click()

  await page.getByRole('button', { name: 'デモ企画B' }).click()
  await page.goto('/workspace/forms/form-circle-b-1')

  await page.getByRole('button', { name: '回答を保存' }).click()
  await expect(page.getByText('回答を入力してください')).toBeVisible()
})

test('staff verification flow authorizes admin user', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('学籍番号または連絡先メールアドレス').fill('staff@example.com')
  await page.getByLabel('パスワード').fill('password')
  await page.getByRole('button', { name: 'ログイン' }).click()

  await expect(page.getByRole('link', { name: 'Staff' })).toBeVisible()
  await page.goto('/staff')
  await expect(page).toHaveURL(/\/staff\/verify$/)

  await page.getByRole('button', { name: '認証コードを送信' }).click()
  await expect(page.getByText(/モック中: メールは送信していません。/)).toBeVisible()

  await page.locator('input[name="verifyCode"]').fill('123456')
  await page.getByRole('button', { name: 'スタッフ認証を完了' }).click()
  await expect(page).toHaveURL(/\/staff$/)
  await expect(page.getByText('スタッフ作業エリア')).toBeVisible()
})

test('staff pages flow lists and creates pages', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('学籍番号または連絡先メールアドレス').fill('staff@example.com')
  await page.getByLabel('パスワード').fill('password')
  await page.getByRole('button', { name: 'ログイン' }).click()

  await page.getByRole('button', { name: 'デモ企画B' }).click()
  await page.goto('/staff/verify')
  await page.getByRole('button', { name: '認証コードを送信' }).click()
  await page.locator('input[name="verifyCode"]').fill('123456')
  await page.getByRole('button', { name: 'スタッフ認証を完了' }).click()

  await page.getByRole('link', { name: 'お知らせ管理へ' }).click()
  await expect(page).toHaveURL(/\/staff\/pages$/)
  await expect(page.getByText('非公開メモ')).toBeVisible()

  await page.locator('input[name="title"]').fill('新着スタッフ連絡')
  await page.locator('textarea[name="body"]').fill('設営順を更新しました。')
  await page.getByRole('button', { name: 'お知らせを作成' }).click()
  await expect(page.getByText('新着スタッフ連絡')).toBeVisible()
})

function parseJsonObject(raw: null | string): Record<string, unknown> {
  if (!raw) {
    return {}
  }

  const parsed = JSON.parse(raw) as unknown
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {}
  }

  return parsed
}
