import { describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { File as NodeFile } from 'node:buffer'
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
    let submittedBody: FormData | undefined
    server.use(
      http.get('/v1/contact-categories', () =>
        HttpResponse.json([
          { id: 'contact-web', name: '公式ウェブサイト掲載内容に関すること' },
          { id: 'contact-other', name: 'その他' }
        ])
      ),
      http.post('/v1/contact', async ({ request }) => {
        submittedBody = await request.formData()
        return HttpResponse.json(
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
      })
    )

    const { router, wrapper } = await mountContactPage()

    await fillContactForm(wrapper)
    await wrapper.get('form').trigger('submit.prevent')
    await flushPromises()

    expect(wrapper.text()).toContain('「その他」に問い合わせを送信しました。')
    expect(submittedBody?.get('categoryId')).toBe('contact-other')
    expect(submittedBody?.get('ccSubleader')).toBe('true')
    expect(submittedBody?.has('file')).toBe(false)
    expect(wrapper.get('a[href="/workspace/settings"]').text()).toContain('ユーザー設定')
    expect(wrapper.find('input[readonly]').exists()).toBe(false)
    expect(router.currentRoute.value.fullPath).toBe('/workspace/contact')
  })

  it('submits and resets an optional attachment', async () => {
    server.use(
      http.get('/v1/contact-categories', () => HttpResponse.json([{ id: 'contact-other', name: 'その他' }])),
      http.post('/v1/contact', () => {
        return HttpResponse.json(
          {
            id: 'mail-job-attachment',
            categoryId: 'contact-other',
            categoryName: 'その他',
            subject: 'その他',
            status: 'sent',
            createdAt: '2026-03-13T10:00:00Z',
            attachment: { filename: 'proposal.pdf', mimeType: 'application/pdf', sizeBytes: 12 }
          },
          { status: 201 }
        )
      })
    )

    const { wrapper } = await mountContactPage()
    await fillContactForm(wrapper)
    const input = wrapper.get('input[name="file"]')
    const file = new NodeFile(['%PDF-1.7'], 'proposal.pdf', { type: 'application/pdf' })
    Object.defineProperty(input.element, 'files', { configurable: true, value: [file] })
    await input.trigger('change')

    expect(wrapper.text()).toContain('proposal.pdf')
    expect(input.attributes('aria-describedby')).toBe('contact-file-hint')

    await wrapper.get('form').trigger('submit.prevent')
    await flushPromises()

    expect(wrapper.text()).not.toContain('proposal.pdf')
    expect((wrapper.get('input[name="file"]').element as HTMLInputElement).value).toBe('')
  })

  it('validates and removes a selected attachment accessibly', async () => {
    server.use(http.get('/v1/contact-categories', () => HttpResponse.json([{ id: 'contact-other', name: 'その他' }])))
    const { wrapper } = await mountContactPage()
    const input = wrapper.get('input[name="file"]')
    const file = new File(['text'], 'notes.txt', { type: 'text/plain' })
    Object.defineProperty(input.element, 'files', { configurable: true, value: [file] })
    await input.trigger('change')

    expect(wrapper.text()).toContain('PDF、Word、Excel、PowerPoint、PNG、JPEG ファイルを選択してください')
    expect(input.attributes('aria-invalid')).toBe('true')
    expect(input.attributes('aria-describedby')).toContain('contact-file-error')

    const removeButton = wrapper.findAll('button[type="button"]').find((button) => button.text() === '選択を解除')
    if (!removeButton) {
      throw new Error('remove button not found')
    }
    await removeButton.trigger('click')
    expect(wrapper.text()).not.toContain('notes.txt')
    expect(input.attributes('aria-invalid')).toBeUndefined()
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
