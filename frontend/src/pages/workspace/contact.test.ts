import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { useSessionStore } from '@/features/session/store'
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

describe('ContactPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('lists categories and submits a contact message', async () => {
    const { router, wrapper } = await mountContactPage(async (input, init) => {
      await Promise.resolve()
      const { method, url, pathname } = getRequestMeta(input, init)

      if (pathname.endsWith('/contact-categories') && method === 'GET') {
        return jsonResponse([
          { id: 'contact-web', name: '公式ウェブサイト掲載内容に関すること' },
          { id: 'contact-other', name: 'その他' }
        ])
      }

      if (pathname.endsWith('/contact') && method === 'POST') {
        return jsonResponse(
          {
            id: 'mail-job-1',
            categoryId: 'contact-other',
            categoryName: 'その他',
            subject: 'その他',
            status: 'queued',
            createdAt: '2026-03-13T10:00:00Z'
          },
          201
        )
      }

      throw new Error(`Unexpected request: ${method} ${url}`)
    })

    await fillContactForm(wrapper)
    await wrapper.get('form').trigger('submit.prevent')
    await flushPromises()

    expect(wrapper.text()).toContain('「その他」に問い合わせを送信しました。')
    expect(wrapper.get('a[href="/workspace/settings"]').text()).toContain('ユーザー設定')
    expect(wrapper.get('input[readonly]').element).toHaveProperty('value', 'デモ企画A')
    expect(router.currentRoute.value.fullPath).toBe('/workspace/contact')
  })

  it('shows the category placeholder when nothing is selected', async () => {
    const { wrapper } = await mountContactPage(async (input, init) => {
      await Promise.resolve()
      const { method, url, pathname } = getRequestMeta(input, init)

      if (pathname.endsWith('/contact-categories') && method === 'GET') {
        return jsonResponse([{ id: 'contact-other', name: 'その他' }])
      }

      throw new Error(`Unexpected request: ${method} ${url}`)
    })

    expect(wrapper.get('select[name="categoryId"]').text()).toContain('選択してください')
    expect(wrapper.text()).toContain('お問い合わせ内容')
  })

  it('shows the validation message when contact submission fails', async () => {
    const { wrapper } = await mountContactPage(async (input, init) => {
      await Promise.resolve()
      const { method, url, pathname } = getRequestMeta(input, init)

      if (pathname.endsWith('/contact-categories') && method === 'GET') {
        return jsonResponse([{ id: 'contact-other', name: 'その他' }])
      }

      if (pathname.endsWith('/contact') && method === 'POST') {
        return jsonResponse(
          {
            message: 'The given data was invalid.',
            errors: {
              body: ['本文を入力してください']
            }
          },
          422
        )
      }

      throw new Error(`Unexpected request: ${method} ${url}`)
    })

    await fillContactForm(wrapper)
    await wrapper.get('textarea[name="body"]').setValue('')
    await wrapper.get('form').trigger('submit.prevent')
    await flushPromises()

    expect(wrapper.text()).toContain('本文を入力してください')
    expect(wrapper.text()).not.toContain('に問い合わせを送信しました')
  })

  it('keeps the page usable when categories fetch fails', async () => {
    const { wrapper } = await mountContactPage(async (input, init) => {
      await Promise.resolve()
      const { method, url, pathname } = getRequestMeta(input, init)

      if (pathname.endsWith('/contact-categories') && method === 'GET') {
        return jsonResponse({ message: 'server error' }, 500)
      }

      throw new Error(`Unexpected request: ${method} ${url}`)
    })

    const options = wrapper.findAll('select[name="categoryId"] option')

    expect(wrapper.text()).toContain('お問い合わせ内容')
    expect(options).toHaveLength(1)
    expect(options[0]?.text()).toBe('選択してください')
  })
})

async function mountContactPage(fetchImpl: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>) {
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

  vi.stubGlobal('fetch', vi.fn(fetchImpl))

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

function getRequestMeta(input: RequestInfo | URL, init?: RequestInit) {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
  const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase()

  const pathname = new URL(url, 'http://localhost').pathname

  return { method, url, pathname }
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}
