import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import NotFoundPage from './[...all].vue'

function expectNotFoundMessage(text: string) {
  expect(text).toContain('ページが見つかりません')
  expect(text).toContain('この URL は現在のアプリでは提供していません。')
}

async function mountAt(path: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div>home</div>' } },
      { path: '/workspace/forms', component: { template: '<div>forms</div>' } },
      { path: '/workspace/forms/:formId', component: { template: '<div>form</div>' } },
      { path: '/circles/select', component: { template: '<div>selector</div>' } },
      { path: '/staff/mails', component: { template: '<div>staff mails</div>' } },
      { path: '/staff/pages', component: { template: '<div>staff pages</div>' } },
      { path: '/workspace/pages', component: { template: '<div>pages</div>' } },
      { path: '/workspace/pages/:pageId', component: { template: '<div>page</div>' } },
      { path: '/workspace/documents', component: { template: '<div>documents</div>' } },
      { path: '/:all(.*)', component: NotFoundPage }
    ]
  })

  await router.push(path)
  await router.isReady()

  return mount(NotFoundPage, {
    global: {
      plugins: [router]
    }
  })
}

describe('NotFoundPage', () => {
  it('shows the non-migrated message for a legacy page detail URL', async () => {
    const wrapper = await mountAt('/pages/page-circle-a-1')

    expectNotFoundMessage(wrapper.text())
  })

  it('shows the non-migrated message for a legacy document detail URL', async () => {
    const wrapper = await mountAt('/documents/document-circle-a-1')

    expectNotFoundMessage(wrapper.text())
  })

  it('shows the non-migrated message for a legacy user settings URL', async () => {
    const wrapper = await mountAt('/user/password')

    expectNotFoundMessage(wrapper.text())
  })

  it('shows the non-migrated message for a legacy selector URL', async () => {
    const wrapper = await mountAt('/selector')

    expectNotFoundMessage(wrapper.text())
  })

  it('does not preserve legacy redirect parameters anymore', async () => {
    const wrapper = await mountAt('/selector?redirect_to=%2Fworkspace%2Fforms%2Fform-1%3Fanswer%3Danswer-1')

    expectNotFoundMessage(wrapper.text())
    expect(wrapper.findAll('a').map((link) => link.attributes('href'))).not.toContain(
      '/circles/select?redirect=/workspace/forms/form-1?answer=answer-1'
    )
  })

  it('ignores legacy circle selector query parameters', async () => {
    const wrapper = await mountAt(
      '/selector?redirect_to=%2Fworkspace%2Fforms%2Fform-1%3Fanswer%3Danswer-1&circle=circle-b'
    )

    expectNotFoundMessage(wrapper.text())
    expect(wrapper.text()).not.toContain('circle-b')
  })

  it('shows the non-migrated message for the legacy logout URL', async () => {
    const wrapper = await mountAt('/logout')

    expectNotFoundMessage(wrapper.text())
  })

  it('shows the non-migrated message for the legacy contacts URL', async () => {
    const wrapper = await mountAt('/contacts')

    expectNotFoundMessage(wrapper.text())
  })

  it('shows the non-migrated message for the legacy circle create URL', async () => {
    const wrapper = await mountAt('/circles/create')

    expectNotFoundMessage(wrapper.text())
  })

  it('does not surface legacy participation type query anymore', async () => {
    const wrapper = await mountAt('/circles/create?participation_type=pt-food')

    expectNotFoundMessage(wrapper.text())
    expect(wrapper.text()).not.toContain('pt-food')
  })

  it('shows the non-migrated message for the legacy forms index URL', async () => {
    const wrapper = await mountAt('/forms')

    expectNotFoundMessage(wrapper.text())
  })

  it('shows the non-migrated message for the legacy closed forms URL', async () => {
    const wrapper = await mountAt('/forms/closed')

    expectNotFoundMessage(wrapper.text())
  })

  it('shows the non-migrated message for the legacy all forms URL', async () => {
    const wrapper = await mountAt('/forms/all')

    expectNotFoundMessage(wrapper.text())
  })

  it('shows the non-migrated message for legacy form answer create URLs', async () => {
    const wrapper = await mountAt('/forms/form-circle-a-1/answers/create')

    expectNotFoundMessage(wrapper.text())
  })

  it('shows the non-migrated message for legacy form answer edit URLs', async () => {
    const wrapper = await mountAt('/forms/form-circle-a-1/answers/answer-2/edit')

    expectNotFoundMessage(wrapper.text())
  })

  it('shows the non-migrated message for legacy form upload URLs', async () => {
    const wrapper = await mountAt('/forms/form-circle-a-1/answers/answer-2/uploads/question-3')

    expectNotFoundMessage(wrapper.text())
  })

  it('shows the non-migrated message for legacy circle detail URLs', async () => {
    const wrapper = await mountAt('/circles/circle-a')

    expectNotFoundMessage(wrapper.text())
  })

  it.each([
    '/circles/circle-a/edit',
    '/circles/circle-a/confirm',
    '/circles/circle-a/done',
    '/circles/circle-a/delete'
  ])('shows the non-migrated message for legacy circle action routes: %s', async (path) => {
    const wrapper = await mountAt(path)

    expectNotFoundMessage(wrapper.text())
  })

  it('shows the non-migrated message for the legacy circle auth URL', async () => {
    const wrapper = await mountAt('/circles/circle-a/auth')

    expectNotFoundMessage(wrapper.text())
  })

  it('shows the non-migrated message for the legacy circle members URL', async () => {
    const wrapper = await mountAt('/circles/circle-a/users')

    expectNotFoundMessage(wrapper.text())
  })

  it('shows the non-migrated message for the legacy circle invite URL', async () => {
    const wrapper = await mountAt('/circles/circle-a/users/invite/invite-token')

    expectNotFoundMessage(wrapper.text())
  })

  it('keeps the generic 404 for unrelated routes', async () => {
    const wrapper = await mountAt('/definitely-missing')

    expectNotFoundMessage(wrapper.text())
  })
})
