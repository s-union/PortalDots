import { expect, test, type Page } from '@playwright/test'

interface StaffPageMock {
  id: string
  title: string
  body: string
  notes: string
  createdAt: string
  updatedAt: string
  publishedAt: string
  isPinned: boolean
  isPublic: boolean
  viewableTags: string[]
  documentIds: string[]
  documents: []
}

test.beforeEach(async ({ page }) => {
  let isAuthenticated = false
  let currentRoles: string[] = []
  let currentCircle: null | { id: string; name: string } = null
  let formAnswerBody = ''
  let staffAuthorized = false
  let staffPages: StaffPageMock[] = [
    {
      id: '0195ec00-0035-7000-8000-000000000001',
      title: '非公開メモ',
      body: 'スタッフ向けの非公開メモです。',
      notes: '',
      createdAt: '2026-03-04T09:00:00Z',
      updatedAt: '2026-03-04T09:00:00Z',
      publishedAt: '2026-03-04T09:00:00Z',
      isPinned: false,
      isPublic: false,
      viewableTags: [],
      documentIds: [],
      documents: []
    }
  ]

  await page.route('**/v1/public/config', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        isDemo: true,
        appName: 'PortalDots',
        portalStudentIdName: '学籍番号',
        portalUnivemailName: '大学メールアドレス',
        portalUnivemailDomainPart: 'example.ac.jp'
      })
    })
  })

  await page.route('**/v1/public/home', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        appName: 'PortalDots',
        portalDescription: 'PortalDots デモサイトです。',
        portalAdminName: 'PortalDots 実行委員会',
        portalContactEmail: 'contact@example.com',
        loginMethods: [],
        pinnedPages: [],
        participationTypes: [],
        pages: [],
        documents: []
      })
    })
  })

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
        message: '認証コードを送信しました。'
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

  await page.route('**/v1/staff/pages**', async (route) => {
    const requestUrl = new URL(route.request().url())
    if (route.request().method() === 'POST' && requestUrl.pathname.endsWith('/v1/staff/pages')) {
      const payload = parseJsonObject(route.request().postData())
      const created = {
        id: `0195ec00-00a4-7000-8000-00000000000${staffPages.length + 1}`,
        title: typeof payload.title === 'string' ? payload.title : '',
        body: typeof payload.body === 'string' ? payload.body : '',
        notes: typeof payload.notes === 'string' ? payload.notes : '',
        createdAt: '2026-03-12T00:00:00Z',
        updatedAt: '2026-03-12T00:00:00Z',
        publishedAt: '2026-03-12T00:00:00Z',
        isPinned: payload.isPinned === true,
        isPublic: payload.isPublic === true,
        viewableTags: Array.isArray(payload.viewableTags)
          ? payload.viewableTags.filter((v): v is string => typeof v === 'string')
          : [],
        documentIds: Array.isArray(payload.documentIds)
          ? payload.documentIds.filter((v): v is string => typeof v === 'string')
          : [],
        documents: []
      }
      staffPages = [created, ...staffPages]
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(created)
      })
      return
    }

    const detail = staffPages.find((p) => requestUrl.pathname.endsWith(`/${p.id}`))
    if (detail) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(detail)
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

  await page.route('**/v1/staff/tags', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([])
    })
  })

  await page.route('**/v1/staff/documents', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([])
    })
  })

  await page.route('**/v1/circles', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: '0195ec00-0021-7000-8000-000000000001',
          name: 'デモ企画A',
          groupName: 'Aブロック',
          participationTypeName: '模擬店'
        },
        {
          id: '0195ec00-0022-7000-8000-000000000001',
          name: 'デモ企画B',
          groupName: 'Bブロック',
          participationTypeName: '展示'
        }
      ])
    })
  })

  await page.route('**/v1/circles/current', async (route) => {
    currentCircle = {
      id: '0195ec00-0022-7000-8000-000000000001',
      name: 'デモ企画B'
    }
    await route.fulfill({ status: 204 })
  })

  await page.route('**/v1/circles/current/detail', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: '0195ec00-0022-7000-8000-000000000001',
        name: 'デモ企画B',
        nameYomi: 'でもきかくびー',
        groupName: 'Bブロック',
        groupNameYomi: 'びーぶろっく',
        participationTypeId: '0195ec00-0002-7000-8000-000000000001',
        participationTypeName: '展示',
        formId: '0195ec00-0014-7000-8000-000000000001',
        notes: '',
        leaderDisplayName: 'Demo User',
        canChangeGroupName: true,
        isLeader: true,
        lastUpdatedAt: '2026-03-01T00:00:00Z',
        usersCountMin: 1,
        usersCountMax: 3,
        memberCount: 1,
        canSubmit: true,
        formDescription: '',
        confirmationMessage: '',
        questions: [],
        answer: null,
        invitationToken: 'invite-token',
        submittedAt: null,
        status: 'approved',
        formCloseAt: '2026-03-22T23:59:59Z',
        places: []
      })
    })
  })

  await page.route('**/v1/participation-types', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: '0195ec00-0002-7000-8000-000000000001',
          name: '展示',
          description: '展示企画の参加登録です。',
          usersCountMin: 1,
          usersCountMax: 3
        }
      ])
    })
  })

  await page.route('**/v1/pages**', async (route) => {
    const requestUrl = new URL(route.request().url())
    if (requestUrl.pathname.endsWith('/0195ec00-0034-7000-8000-000000000001')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: '0195ec00-0034-7000-8000-000000000001',
          title: '展示レイアウト更新',
          body: 'Bブロックの展示レイアウトを更新しました。',
          isLimited: false,
          createdAt: '2026-03-03T09:00:00Z',
          updatedAt: '2026-03-03T09:00:00Z',
          documents: []
        })
      })
      return
    }

    const query = requestUrl.searchParams.get('query')?.trim() ?? ''

    const pages =
      query === '' || query === 'レイアウト'
        ? [
            {
              id: '0195ec00-0034-7000-8000-000000000001',
              title: '展示レイアウト更新',
              summary: 'Bブロックの展示レイアウトを更新しました。',
              isLimited: false,
              isNew: true,
              isUnread: false,
              createdAt: '2026-03-03T09:00:00Z',
              updatedAt: '2026-03-03T09:00:00Z'
            }
          ]
        : []

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: pages,
        page: 1,
        pageSize: 10,
        total: pages.length
      })
    })
  })

  await page.route('**/v1/documents**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: [
          {
            id: '0195ec00-0042-7000-8000-000000000001',
            name: '展示ガイド',
            description: 'Bブロック向けの展示ガイドです。',
            isImportant: false,
            isNew: true,
            extension: 'TXT',
            sizeBytes: 1024,
            updatedAt: '2026-03-05T09:00:00Z',
            downloadUrl: '/v1/documents/0195ec00-0042-7000-8000-000000000001/file'
          }
        ],
        page: 1,
        pageSize: 10,
        total: 1
      })
    })
  })

  await page.route('**/v1/forms/0195ec00-0014-7000-8000-000000000001/answer', async (route) => {
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
            updatedAt: '2026-03-06T12:00:00Z',
            details: {},
            uploads: []
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
                updatedAt: '2026-03-06T12:00:00Z',
                details: {},
                uploads: []
              }
      })
    })
  })

  await page.route('**/v1/forms**', async (route) => {
    const requestUrl = new URL(route.request().url())
    if (requestUrl.pathname.endsWith('/0195ec00-0014-7000-8000-000000000001/answer')) {
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
              updatedAt: '2026-03-06T12:00:00Z',
              details: {},
              uploads: []
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
                  updatedAt: '2026-03-06T12:00:00Z',
                  details: {},
                  uploads: []
                }
        })
      })
      return
    }

    if (requestUrl.pathname.endsWith('/0195ec00-0014-7000-8000-000000000001/answers')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          answers: []
        })
      })
      return
    }

    if (requestUrl.pathname.endsWith('/0195ec00-0014-7000-8000-000000000001')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: '0195ec00-0014-7000-8000-000000000001',
          name: '展示チェックフォーム',
          description: '展示レイアウトと機材使用申請を提出してください。',
          openAt: '2026-03-02T00:00:00Z',
          closeAt: '2026-03-22T23:59:59Z',
          maxAnswers: 1,
          answerableTags: [],
          confirmationMessage: '',
          isPublic: true,
          isOpen: true,
          currentCircleStatus: 'approved',
          questions: []
        })
      })
      return
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: '0195ec00-0014-7000-8000-000000000001',
          name: '展示チェックフォーム',
          description: '展示レイアウトと機材使用申請を提出してください。',
          openAt: '2026-03-02T00:00:00Z',
          closeAt: '2026-03-22T23:59:59Z',
          maxAnswers: 1,
          answerableTags: [],
          confirmationMessage: '',
          isPublic: true,
          isOpen: true,
          hasAnswer: false
        }
      ])
    })
  })
})

async function selectDemoCircle(page: Page) {
  await page.goto('/circles/select')
  await page.getByRole('button', { name: 'デモ企画B Bブロック / 展示' }).click()
  await expect(page).toHaveURL(/\/$/)
}

test('login to workspace pages flow renders', async ({ page }) => {
  await page.goto('/login')

  await page.getByLabel('学籍番号または連絡先メールアドレス').fill('demo@example.com')
  await page.getByLabel('パスワード').fill('password')
  await page.getByRole('button', { name: 'ログイン' }).click()

  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByText('Demo Userとしてログイン中')).toBeVisible()
  await selectDemoCircle(page)

  await page.goto('/workspace')
  await page.getByRole('link', { name: 'お知らせを見る' }).click()
  await expect(page).toHaveURL(/\/workspace\/pages$/)
  await expect(page.getByText('展示レイアウト更新')).toBeVisible()

  await page.getByRole('link', { name: '展示レイアウト更新' }).click()
  await expect(page).toHaveURL(/\/workspace\/pages\/0195ec00-0034-7000-8000-000000000001$/)
  await expect(page.getByText('Bブロックの展示レイアウトを更新しました。')).toBeVisible()
})

test('pages flow supports searching and empty results', async ({ page }) => {
  await page.goto('/login')

  await page.getByLabel('学籍番号または連絡先メールアドレス').fill('demo@example.com')
  await page.getByLabel('パスワード').fill('password')
  await page.getByRole('button', { name: 'ログイン' }).click()
  await selectDemoCircle(page)

  await page.goto('/workspace/pages')

  await page.locator('input[name="query"]').fill('存在しない語')
  await page.getByRole('button', { name: '検索' }).click()
  await expect(page).toHaveURL(/query=/)
  await expect(page.getByText('検索結果が見つかりませんでした')).toBeVisible()

  await page.getByRole('button', { name: 'リセット' }).click()
  await expect(page).toHaveURL(/\/workspace\/pages$/)
  await expect(page.getByText('展示レイアウト更新')).toBeVisible()
})

test('documents flow renders download metadata', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('学籍番号または連絡先メールアドレス').fill('demo@example.com')
  await page.getByLabel('パスワード').fill('password')
  await page.getByRole('button', { name: 'ログイン' }).click()

  await selectDemoCircle(page)

  await page.goto('/workspace/documents')
  const documentLink = page.getByRole('link', { name: /展示ガイド/ })
  await expect(documentLink).toBeVisible()
  await expect(documentLink).toHaveAttribute('href', /\/v1\/documents\/0195ec00-0042-7000-8000-000000000001\/file$/)
})

test('forms flow renders open forms', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('学籍番号または連絡先メールアドレス').fill('demo@example.com')
  await page.getByLabel('パスワード').fill('password')
  await page.getByRole('button', { name: 'ログイン' }).click()

  await selectDemoCircle(page)
  await page.goto('/workspace/forms')

  await expect(page.getByText('展示チェックフォーム')).toBeVisible()
  await page.getByRole('link', { name: /展示チェックフォーム/ }).click()
  await expect(page).toHaveURL(/\/workspace\/forms\/0195ec00-0014-7000-8000-000000000001$/)
  await expect(page.getByText('展示レイアウトと機材使用申請を提出してください。')).toBeVisible()
  await page.locator('textarea[name="answer-body"]').fill('電源は 2 口必要です。')
  await page.getByRole('button', { name: '送信' }).click()
  await expect(page.getByText(/回答の最終更新日時/)).toBeVisible()
})

test('forms flow renders validation errors when answer is blank', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('学籍番号または連絡先メールアドレス').fill('demo@example.com')
  await page.getByLabel('パスワード').fill('password')
  await page.getByRole('button', { name: 'ログイン' }).click()

  await selectDemoCircle(page)
  await page.goto('/workspace/forms/0195ec00-0014-7000-8000-000000000001')

  await page.getByRole('button', { name: '送信' }).click()
  await expect(page.getByText('回答を入力してください')).toBeVisible()
})

test('staff verification flow authorizes admin user', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('学籍番号または連絡先メールアドレス').fill('staff@example.com')
  await page.getByLabel('パスワード').fill('password')
  await page.getByRole('button', { name: 'ログイン' }).click()

  await expect(page.getByRole('link', { name: 'スタッフモードへ' })).toBeVisible()
  await page.goto('/staff')
  await expect(page).toHaveURL(/\/staff\/verify$/)

  await page.getByRole('button', { name: '認証コードを再送する' }).click()
  await expect(page.getByText('認証コードを送信しました。')).toBeVisible()

  await page.locator('input[name="verifyCode"]').fill('123456')
  await page.getByRole('button', { name: 'ログイン' }).click()
  await expect(page).toHaveURL(/\/staff$/)
  await expect(page.getByRole('link', { name: 'お知らせ管理', exact: true })).toBeVisible()
})

test('staff pages flow lists and creates pages', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('学籍番号または連絡先メールアドレス').fill('staff@example.com')
  await page.getByLabel('パスワード').fill('password')
  await page.getByRole('button', { name: 'ログイン' }).click()

  await page.goto('/staff/verify')
  await page.getByRole('button', { name: '認証コードを再送する' }).click()
  await page.locator('input[name="verifyCode"]').fill('123456')
  await page.getByRole('button', { name: 'ログイン' }).click()

  await page.getByRole('link', { name: 'お知らせ管理', exact: true }).click()
  await expect(page).toHaveURL(/\/staff\/pages$/)
  await expect(page.getByRole('link', { name: '非公開メモ' })).toBeVisible()

  await page.getByRole('link', { name: '新規お知らせ' }).click()
  await expect(page).toHaveURL(/\/staff\/pages\/create$/)
  await page.locator('input[name="title"]').fill('新着スタッフ連絡')
  await page.locator('textarea[name="body"]').fill('設営順を更新しました。')
  await page.getByRole('button', { name: '作成' }).click()
  await expect(page).toHaveURL(/\/staff\/pages\/0195ec00-00a4-7000-8000-000000000002$/)
  await expect(page.locator('input[name="title"]')).toHaveValue('新着スタッフ連絡')
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
