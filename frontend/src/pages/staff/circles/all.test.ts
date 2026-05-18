import { describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useSessionStore } from '@/features/session/store'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/server'
import StaffCirclesAllPage from './all.vue'

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

describe('StaffCirclesAllPage', () => {
  it('renders legacy-like toolbar/actions and opens filter drawer', async () => {
    let deleteWasCalled = false

    server.use(
      http.get('/v1/staff/circles/all', ({ request }) => {
        const query = new URL(request.url).searchParams.get('query')?.trim() ?? ''
        const items = [
          {
            id: '0195ec00-0021-7000-8000-000000000001',
            name: '屋台企画A',
            nameYomi: 'ヤタイキカクエー',
            groupName: 'Aブロック',
            groupNameYomi: 'エーブロック',
            participationTypeId: '0195ec00-0001-7000-8000-000000000001',
            participationTypeName: '模擬店',
            tags: ['模擬店'],
            notes: '',
            submittedAt: '2026-03-05T12:00:00Z',
            status: 'pending',
            statusReason: '',
            statusSetAt: null,
            statusSetById: null,
            places: ['第一会場']
          },
          {
            id: '0195ec00-0022-7000-8000-000000000001',
            name: '展示企画B',
            nameYomi: 'テンジキカクビー',
            groupName: 'Bブロック',
            groupNameYomi: 'ビーブロック',
            participationTypeId: '0195ec00-0002-7000-8000-000000000001',
            participationTypeName: '展示',
            tags: ['展示'],
            notes: 'メモ',
            submittedAt: '2026-03-06T12:00:00Z',
            status: 'approved',
            statusReason: '',
            statusSetAt: null,
            statusSetById: null,
            places: ['第二会場']
          }
        ]
        if (query === '') {
          return HttpResponse.json(items)
        }
        return HttpResponse.json(items.filter((item) => `${item.name} ${item.groupName}`.includes(query)))
      }),
      http.get('/v1/staff/participation-types', () =>
        HttpResponse.json([
          {
            id: '0195ec00-0001-7000-8000-000000000001',
            name: '模擬店',
            description: '',
            usersCountMin: 1,
            usersCountMax: 4,
            tags: ['模擬店'],
            form: {
              id: '0195ec00-0011-7000-8000-000000000001',
              name: '企画参加登録',
              description: '',
              openAt: '2026-03-01T00:00:00Z',
              closeAt: '2026-03-31T23:59:59Z',
              isPublic: true,
              isOpen: true,
              maxAnswers: 1,
              isParticipationForm: true,
              answerableTags: [],
              confirmationMessage: ''
            }
          }
        ])
      ),
      http.get('/v1/staff/places', () => HttpResponse.json([{ id: 'place-a', name: '第一会場', maxCircleCount: 100 }])),
      http.post('/v1/staff/circles', () =>
        HttpResponse.json(
          {
            id: 'circle-c',
            name: '新規企画',
            nameYomi: 'シンキキカク',
            groupName: 'Cブロック',
            groupNameYomi: 'シーブロック',
            participationTypeId: '0195ec00-0001-7000-8000-000000000001',
            participationTypeName: '模擬店',
            tags: ['模擬店'],
            notes: '',
            submittedAt: null,
            status: 'pending',
            statusReason: '',
            statusSetAt: null,
            statusSetById: null,
            places: []
          },
          { status: 201 }
        )
      ),
      http.delete('/v1/staff/circles/0195ec00-0021-7000-8000-000000000001', () => {
        deleteWasCalled = true
        return new HttpResponse(null, { status: 204 })
      }),
      http.delete('/v1/staff/circles/0195ec00-0022-7000-8000-000000000001', () => {
        deleteWasCalled = true
        return new HttpResponse(null, { status: 204 })
      })
    )

    const pinia = createPinia()
    setActivePinia(pinia)
    const sessionStore = useSessionStore()
    sessionStore.hydrate({
      csrfToken: 'csrf-token',
      currentCircle: {
        id: '0195ec00-0021-7000-8000-000000000001',
        name: '屋台企画A'
      },
      featureFlags: [],
      roles: ['admin'],
      permissions: ['staff.circles'],
      user: {
        id: 'staff-user',
        displayName: 'Staff User'
      }
    })

    vi.stubGlobal(
      'confirm',
      vi.fn(() => true)
    )

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/staff/circles', component: { template: '<div>circles</div>' } },
        { path: '/staff/circles/all', component: StaffCirclesAllPage },
        { path: '/staff/circles/create', component: { template: '<div>circle create</div>' } },
        { path: '/staff/circles/:circleId', component: { template: '<div>circle detail</div>' } },
        { path: '/staff/circles/participation_types', component: { template: '<div>types</div>' } }
      ]
    })
    await router.push('/staff/circles/all')
    await router.isReady()

    const wrapper = mount(StaffCirclesAllPage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()],
        stubs: {
          teleport: true
        }
      }
    })
    await flushPromises()

    expect(wrapper.text()).toContain('新規企画')
    expect(wrapper.text()).toContain('CSVで出力')
    expect(wrapper.text()).toContain('絞り込み')
    expect(wrapper.text()).toContain('表示件数:')
    expect(wrapper.text()).toContain('第一会場')
    expect(wrapper.text()).not.toContain('企画を新規作成')
    expect(wrapper.text()).not.toContain('企画ID')
    expect(wrapper.text().indexOf('屋台企画A')).toBeLessThan(wrapper.text().indexOf('展示企画B'))

    expect(wrapper.get('a[href="/staff/circles/create"]').text()).toContain('新規企画')

    const emailLink = wrapper.get('a[title="メール送信"]')
    expect(emailLink.attributes('href')).toBe('/staff/circles/0195ec00-0021-7000-8000-000000000001/email')

    await wrapper.get('button[title="絞り込み"]').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('絞り込み条件')

    const searchInput = wrapper.get('input[type="search"]')
    await searchInput.setValue('展示')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('展示企画B')
    expect(wrapper.text()).not.toContain('屋台企画A')

    const deleteButton = wrapper.findAll('button[title="削除"]')[0]
    if (!deleteButton) {
      throw new Error('expected delete button')
    }
    await deleteButton.trigger('click')
    await flushPromises()

    expect(deleteWasCalled).toBe(true)
  })
})
