import { test, expect } from '@playwright/test'
import { loginFromApi, setCurrentCircleFromApi, DEMO_CIRCLE, CIRCLE_B } from './utils'

test('circle user can browse workspace pages and navigate to page detail', async ({ page }) => {
  await loginFromApi(page, DEMO_CIRCLE.loginId, DEMO_CIRCLE.password)
  await setCurrentCircleFromApi(page, CIRCLE_B)

  await page.goto('/workspace/pages')
  await page.waitForURL('**/workspace/pages')
  await expect(page.locator('text=お知らせ').first()).toBeVisible({ timeout: 15000 })

  // 検索でシードデータのページを確実に絞り込んでからクリック
  await page.locator('input[name="query"]').fill('お知らせサンプル')
  await page.getByRole('button', { name: '検索', exact: true }).click()
  await expect(page.getByRole('link', { name: 'お知らせサンプル' }).first()).toBeVisible({ timeout: 15000 })

  await page.getByRole('link', { name: 'お知らせサンプル' }).first().click()
  await page.waitForURL(/\/workspace\/pages\//)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('お知らせサンプル', { timeout: 10000 })
  await expect(page.locator('text=このような形でお知らせを掲載できます。').first()).toBeVisible({ timeout: 5000 })
  // 関連する配布資料セクションにドキュメントリンクが表示される
  await expect(page.locator('text=サンプル配布資料').first()).toBeVisible({ timeout: 5000 })
})

test('circle user can search workspace pages by keyword', async ({ page }) => {
  await loginFromApi(page, DEMO_CIRCLE.loginId, DEMO_CIRCLE.password)
  await setCurrentCircleFromApi(page, CIRCLE_B)

  await page.goto('/workspace/pages')
  await page.waitForURL('**/workspace/pages')
  await expect(page.locator('text=お知らせ').first()).toBeVisible({ timeout: 15000 })

  // 存在しないキーワードで検索すると空状態になる
  await page.locator('input[name="query"]').fill('存在しないキーワード')
  await page.getByRole('button', { name: '検索', exact: true }).click()
  await page.waitForURL(/query=/)
  await expect(page.locator('text=検索結果が見つかりませんでした').first()).toBeVisible({ timeout: 10000 })

  // リセットすると一覧が戻る
  await page.getByText('検索をリセット').click()
  await page.waitForURL(/\/workspace\/pages$/)
  await expect(page.getByRole('link').first()).toBeVisible({ timeout: 10000 })
})

test('circle user can view workspace documents with download links', async ({ page }) => {
  await loginFromApi(page, DEMO_CIRCLE.loginId, DEMO_CIRCLE.password)
  await setCurrentCircleFromApi(page, CIRCLE_B)

  await page.goto('/workspace/documents')
  await page.waitForURL('**/workspace/documents')
  await expect(page.locator('text=配布資料').first()).toBeVisible({ timeout: 15000 })
  await expect(page.locator('text=デモサイトへのログイン方法').first()).toBeVisible({ timeout: 5000 })
  await expect(page.locator('text=サンプル配布資料').first()).toBeVisible({ timeout: 5000 })

  // ドキュメントリンクがAPIのダウンロードURLを指していることを確認
  // 実際のURLは /v1/documents/{shortId} 形式（/file サフィックスなし）
  const pdfLink = page.getByRole('link', { name: /サンプル配布資料/ })
  await expect(pdfLink).toHaveAttribute('href', /\/documents\//)
})

test('circle user can view workspace contact page', async ({ page }) => {
  await loginFromApi(page, DEMO_CIRCLE.loginId, DEMO_CIRCLE.password)
  await setCurrentCircleFromApi(page, CIRCLE_B)

  await page.goto('/workspace/contact')
  await page.waitForURL('**/workspace/contact')
  await expect(page.locator('text=お問い合わせ').first()).toBeVisible({ timeout: 15000 })

  // カテゴリの選択肢が存在することを確認（<option> は select 内で hidden 扱いのため選択して確認する）
  await page.getByLabel('お問い合わせ項目').selectOption({ label: '公式ウェブサイト掲載内容に関すること' })
  await expect(page.getByLabel('お問い合わせ項目')).toHaveValue(/\S+/)

  // 本文を入力して送信する
  await page.locator('textarea[name="body"]').fill('テスト用のお問い合わせ内容です。')
  const [contactResponse] = await Promise.all([
    page.waitForResponse((resp) => resp.url().includes('/contact') && resp.request().method() === 'POST'),
    page.getByRole('button', { name: '送信' }).click()
  ])
  expect(contactResponse.status()).toBe(201)
  await expect(page.locator('text=に問い合わせを送信しました').first()).toBeVisible({ timeout: 10000 })
})

test('circle user can view workspace settings page', async ({ page }) => {
  await loginFromApi(page, DEMO_CIRCLE.loginId, DEMO_CIRCLE.password)
  await setCurrentCircleFromApi(page, CIRCLE_B)
  await page.goto('/workspace/settings')
  await page.waitForURL('**/workspace/settings')
  await expect(page.locator('text=ユーザー設定').first()).toBeVisible({ timeout: 15000 })
  await expect(page.locator('text=デモ 企画者').first()).toBeVisible({ timeout: 5000 })
})

test('circle user can browse workspace forms and navigate to form detail', async ({ page }) => {
  await loginFromApi(page, DEMO_CIRCLE.loginId, DEMO_CIRCLE.password)
  await setCurrentCircleFromApi(page, CIRCLE_B)

  // 「全て」タブで全フォームを表示（closeAt が過去日のフォームは「受付終了」に移動しているため）
  await page.goto('/workspace/forms?status=all')
  await page.waitForURL('**/workspace/forms**')
  await expect(page.locator('text=申請').first()).toBeVisible({ timeout: 15000 })
  await expect(page.locator('text=展示チェックフォーム').first()).toBeVisible({ timeout: 5000 })

  // フォームをクリックして詳細ページに遷移し、フォームの説明が表示されることを確認
  await page.getByRole('link', { name: /展示チェックフォーム/ }).click()
  await page.waitForURL(/\/workspace\/forms\//)
  await expect(page.locator('text=展示レイアウトと機材使用申請を提出してください。').first()).toBeVisible({
    timeout: 10000
  })
})
