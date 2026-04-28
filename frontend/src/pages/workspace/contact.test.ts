import { describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { useSessionStore } from '@/features/session/store'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/server'
import ContactPage from './contact.vue'

function createQueryPlugin() {
  return [
    VueQueryPlugin,
    {
      queryClient: new QueryClient({
        defaultOptions: {
          queries: { retry: false }
        }
      })
    }
  ]
}

async function mountContactPage() {
  const pinia = createPinia()
  setActivePinia(pinia)
  const sessionStore = useSessionStore()
  sessionStore.hydrate({
    csrfToken: 'csrf-token',
    currentCircle: {
      id: 'circle-a',
      name: 'デモ企画A'
    },
    featureFlags: [],
    roles: ['participant'],
    user: {
      id: 'demo-user',
      displayName: 'Demo User'
    }
  })

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/workspace', component: { template: '<div>workspace</div>' } },
      { path: '/workspace/settings', component: { template: '<div>settings</div>' } },
      { path: '/workspace/contact', component: ContactPage }
    ]
  })
  await router.push('/workspace/contact')
  await router.isReady()

  const wrapper = mount(ContactPage, {
    global: {
      plugins: [pinia, router, createQueryPlugin()]
    }
  })
  await flushPromises()

  return { wrapper, router }
}

async function fillContactForm(wrapper: ReturnType<typeof mount>) {
  await wrapper.get('select[name="categoryId"]').setValue('contact-other')
  await wrapper.get('textarea[name="body"]').setValue('9時前の搬入可否を確認したいです。')
}

describe('ContactPage', () => {
  it('lists categories and submits a contact message', async () => {
    server.use(
      http.get('/v1/contact-categories', () =>
        HttpResponse.json([
          { id: 'contact-web', name: '公式ウェブサイト掲載内容に関すること' },
          { id: 'contact-other', name: 'その他' }
        ])
      ),
      http.post('/v1/contact', () =>
        HttpResponse.json(
          {
            id: 'mail-job-1',
            categoryId: 'contact-other',
            categoryName: 'その他',
            subject: 'その他',
            status: 'queued',
            createdAt: '2026-03-13T10:00:00Z'
          },
          { status: 201 }
        )
      )
    )

    const { router, wrapper } = await mountContactPage()

    await fillContactForm(wrapper)
    await wrapper.get('form').trigger('submit.prevent')
    await flushPromises()

    expect(wrapper.text()).toContain('「その他」に問い合わせを送信しました。')
    expect(wrapper.get('a[href="/workspace/settings"]').text()).toContain('ユーザー設定')
    expect(wrapper.get('input[readonly]').element).toHaveProperty('value', 'デモ企画A')
    expect(router.currentRoute.value.fullPath).toBe('/workspace/contact')
  })

  it('shows the category placeholder when nothing is selected', async () => {
    server.use(http.get('/v1/contact-categories', () => HttpResponse.json([{ id: 'contact-other', name: 'その他' }])))

    const { wrapper } = await mountContactPage()

    expect(wrapper.get('select[name="categoryId"]').text()).toContain('選択してください')
    expect(wrapper.text()).toContain('お問い合わせ内容')
  })

  it('shows the validation message when contact submission fails', async () => {
    server.use(
      http.get('/v1/contact-categories', () => HttpResponse.json([{ id: 'contact-other', name: 'その他' }])),
      http.post('/v1/contact', () =>
        HttpResponse.json(
          {
            message: 'The given data was invalid.',
            errors: {
              body: ['本文を入力してください']
            }
          },
          { status: 422 }
        )
      )
    )

    const { wrapper } = await mountContactPage()

    await fillContactForm(wrapper)
    await wrapper.get('textarea[name="body"]').setValue('')
    await wrapper.get('form').trigger('submit.prevent')
    await flushPromises()

    expect(wrapper.text()).toContain('お問い合わせ内容を入力してください')
    expect(wrapper.text()).not.toContain('に問い合わせを送信しました')
  })

  it('keeps the page usable when categories fetch fails', async () => {
    server.use(
      http.get('/v1/contact-categories', () => HttpResponse.json({ message: 'server error' }, { status: 500 }))
    )

    const { wrapper } = await mountContactPage()

    const options = wrapper.findAll('select[name="categoryId"] option')

    expect(wrapper.text()).toContain('お問い合わせ内容')
    expect(options).toHaveLength(1)
    expect(options[0]?.text()).toBe('選択してください')
  })
})
