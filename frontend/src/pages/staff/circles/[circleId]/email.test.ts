import { describe, expect, it } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useSessionStore } from '@/features/session/store'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/server'
import StaffCircleMailPage from './email.vue'

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

function setupSession() {
  const pinia = createPinia()
  setActivePinia(pinia)
  const sessionStore = useSessionStore()
  sessionStore.hydrate({
    csrfToken: 'csrf-token',
    currentCircle: {
      id: 'circle-b',
      name: 'デモ企画B'
    },
    featureFlags: [],
    roles: ['admin'],
    user: {
      id: 'staff-user',
      displayName: 'Staff User'
    }
  })
  return pinia
}

async function setupRouter() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/staff/circles', component: { template: '<div>circles</div>' } },
      { path: '/staff/circles/:circleId', component: { template: '<div>detail</div>' } },
      { path: '/staff/circles/:circleId/email', component: StaffCircleMailPage }
    ]
  })
  await router.push('/staff/circles/circle-b/email')
  await router.isReady()
  return router
}

const defaultCircle = {
  id: 'circle-b',
  name: 'デモ企画B',
  nameYomi: 'デモキカクビー',
  groupName: 'Bブロック',
  groupNameYomi: 'ビーブロック',
  participationTypeId: 'participation-type-exhibit',
  participationTypeName: '展示',
  tags: ['展示'],
  notes: '既存メモ',
  submittedAt: '2025-02-01T00:00:00Z',
  status: 'pending',
  statusReason: '',
  statusSetAt: null,
  statusSetById: null,
  places: ['屋内ブース']
}

describe('StaffCircleMailPage', () => {
  it('renders and sends circle mail', async () => {
    const recipients = [
      { id: 'user-1', displayName: '責任者A', loginIds: ['leader@example.com'], isLeader: true },
      { id: 'user-2', displayName: 'メンバーB', loginIds: ['member@example.com'], isLeader: false }
    ]

    server.use(
      http.get('/v1/staff/circles/circle-b/email', () => HttpResponse.json({ circle: defaultCircle, recipients })),
      http.post('/v1/staff/circles/circle-b/email', () => HttpResponse.json({}, { status: 201 }))
    )

    const pinia = setupSession()
    const router = await setupRouter()

    const wrapper = mount(StaffCircleMailPage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()]
      }
    })
    await flushPromises()

    expect(wrapper.text()).toContain('デモ企画B')
    expect(wrapper.text()).toContain('Bブロック')
    expect(wrapper.text()).toContain('企画所属者向けメール送信')
    expect(wrapper.text()).toContain('送信対象: 2 名')

    await wrapper.get('select[name="recipient"]').setValue('leader')
    await flushPromises()

    expect(wrapper.text()).toContain('送信対象: 1 名')

    await wrapper.get('input[name="subject"]').setValue('搬入のご案内')
    await wrapper.get('textarea[name="body"]').setValue('9:00 に集合してください。')

    const mailButton = wrapper.findAll('button').find((button) => button.text().includes('送信'))
    if (!mailButton) {
      throw new Error('mail button not found')
    }
    await mailButton.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('企画所属者向けメールを送信しました。')
    expect(wrapper.text()).toContain('Markdown 記法')
  })

  it('disables mail submission when there are no recipients', async () => {
    server.use(
      http.get('/v1/staff/circles/circle-b/email', () => HttpResponse.json({ circle: defaultCircle, recipients: [] }))
    )

    const pinia = setupSession()
    const router = await setupRouter()

    const wrapper = mount(StaffCircleMailPage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()]
      }
    })
    await flushPromises()

    expect(wrapper.text()).toContain('宛先となる企画所属者がいないため、メールは送信できません。')
    const mailButton = wrapper.findAll('button').find((button) => button.text().includes('送信'))
    if (!mailButton) {
      throw new Error('mail button not found')
    }
    expect(mailButton.attributes('disabled')).toBeDefined()
  })
})
