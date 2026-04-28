import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useSessionStore } from '@/features/session/store'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/server'
import StaffParticipationTypesIndexPage from '../circles/participation_types/index.vue'

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

function buildParticipationType(overrides: Partial<ReturnType<typeof baseParticipationType>> = {}) {
  return {
    ...baseParticipationType(),
    ...overrides,
    form: {
      ...baseParticipationType().form,
      ...overrides.form
    }
  }
}

function baseParticipationType() {
  return {
    id: 'participation-type-food',
    name: '模擬店',
    description: '模擬店向けの参加種別です。',
    usersCountMin: 1,
    usersCountMax: 4,
    tags: ['模擬店'],
    form: {
      id: 'form-participation-food',
      name: '企画参加登録',
      description: '参加登録を提出してください。',
      openAt: '2026-03-01T00:00:00Z',
      closeAt: '2026-03-31T23:59:59Z',
      isPublic: true,
      isOpen: true,
      maxAnswers: 1,
      answerableTags: [],
      confirmationMessage: 'ありがとうございました。'
    }
  }
}

describe('StaffParticipationTypesIndexPage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('lists participation types, links to detail, and creates a new type', async () => {
    let created = false
    let createdRequestBody = ''

    server.use(
      http.get('/v1/staff/tags', () =>
        HttpResponse.json([
          { id: 'tag-food', name: '模擬店' },
          { id: 'tag-exhibit', name: '展示' },
          { id: 'tag-stage', name: 'ステージ' },
          { id: 'tag-sound', name: '音響' }
        ])
      ),
      http.get('/v1/staff/participation-types', () =>
        HttpResponse.json(
          created
            ? [
                buildParticipationType({
                  id: 'participation-type-stage',
                  name: 'ステージ',
                  description: 'ステージ企画向けの参加種別です。',
                  usersCountMax: 8,
                  tags: ['ステージ', '音響']
                }),
                buildParticipationType(),
                buildParticipationType({
                  id: 'participation-type-exhibit',
                  name: '展示',
                  description: '展示企画向けの参加種別です。',
                  tags: ['展示']
                })
              ]
            : [
                buildParticipationType(),
                buildParticipationType({
                  id: 'participation-type-exhibit',
                  name: '展示',
                  description: '展示企画向けの参加種別です。',
                  tags: ['展示']
                })
              ]
        )
      ),
      http.post('/v1/staff/participation-types', async ({ request }) => {
        createdRequestBody = await request.text()
        created = true
        return HttpResponse.json(
          buildParticipationType({
            id: 'participation-type-stage',
            name: 'ステージ',
            description: 'ステージ企画向けの参加種別です。',
            usersCountMax: 8,
            tags: ['ステージ', '音響']
          }),
          { status: 201 }
        )
      })
    )

    const pinia = createPinia()
    setActivePinia(pinia)
    const sessionStore = useSessionStore()
    sessionStore.hydrate({
      csrfToken: 'csrf-token',
      currentCircle: { id: 'circle-b', name: 'デモ企画B' },
      featureFlags: [],
      roles: ['admin'],
      user: { id: 'staff-user', displayName: 'Staff User' }
    })

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/staff/circles', component: { template: '<div>circles</div>' } },
        { path: '/staff/circles/participation_types', component: StaffParticipationTypesIndexPage },
        {
          path: '/staff/circles/participation_types/:typeId',
          component: { template: '<div>participation type detail</div>' }
        }
      ]
    })
    await router.push('/staff/circles/participation_types')
    await router.isReady()

    const wrapper = mount(StaffParticipationTypesIndexPage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()]
      }
    })
    await flushPromises()

    expect(wrapper.text()).toContain('参加種別管理')
    expect(wrapper.text()).toContain('模擬店')
    expect(wrapper.text()).toContain('展示')
    expect(wrapper.get('a[href="/staff/circles/participation_types/participation-type-food"]').text()).toContain(
      '模擬店'
    )

    await wrapper.get('input[name="name"]').setValue('ステージ')
    await wrapper.get('textarea[name="description"]').setValue('ステージ企画向けの参加種別です。')
    await wrapper.get('input[name="usersCountMin"]').setValue('2')
    await wrapper.get('input[name="usersCountMax"]').setValue('8')
    await wrapper.get('input[name="openAt"]').setValue('2026-04-01T10:00')
    await wrapper.get('input[name="openAt"]').trigger('input')
    await wrapper.get('input[name="closeAt"]').setValue('2026-04-30T17:00')
    await wrapper.get('input[name="closeAt"]').trigger('input')
    await wrapper.get('input[name="tags"]').setValue('ステ')
    const stageTagButton = wrapper.findAll('button').find((button) => button.text() === 'ステージ')
    if (!stageTagButton) {
      throw new Error('stage tag button not found')
    }
    await stageTagButton.trigger('click')
    await wrapper.get('input[name="tags"]').setValue('音')
    const soundTagButton = wrapper.findAll('button').find((button) => button.text() === '音響')
    if (!soundTagButton) {
      throw new Error('sound tag button not found')
    }
    await soundTagButton.trigger('click')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(createdRequestBody).toContain('ステージ')
    expect(createdRequestBody).toContain('音響')
    expect(wrapper.text()).toContain('ステージ')
    expect(wrapper.get('a[href="/staff/circles/participation_types/participation-type-stage"]').text()).toContain(
      'ステージ'
    )
  })
})
