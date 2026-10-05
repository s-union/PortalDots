import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { flushPromises, mount } from '@vue/test-utils'
import { computed, defineComponent, nextTick, reactive } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockPublicHome } from '@/mocks/data'

const sessionStoreMocks = vi.hoisted(() => ({
  store: {
    user: null as { id: string } | null,
    currentCircle: null as { id: string } | null
  }
}))

vi.mock('@/features/session/store', () => ({
  useSessionStore: () => sessionStoreMocks.store
}))

import { usePublicHomeQuery } from './api'

const PublicHomeProbe = defineComponent({
  setup() {
    const homeQuery = usePublicHomeQuery(true)
    const appName = computed(() => homeQuery.data.value?.appName ?? '')

    return { appName }
  },
  template: '<output data-testid="home-name">{{ appName }}</output>'
})

function currentContext() {
  const userId = sessionStoreMocks.store.user?.id ?? 'guest'
  const circleId = sessionStoreMocks.store.currentCircle?.id ?? 'none'
  return `${userId}/${circleId}`
}

describe('public home api', () => {
  beforeEach(() => {
    sessionStoreMocks.store = reactive({ user: null, currentCircle: null })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('keeps cached home data isolated across session contexts', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ ...mockPublicHome, appName: `home:${currentContext()}` }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
    )
    vi.stubGlobal('fetch', fetchMock)

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          gcTime: Infinity,
          retry: false,
          staleTime: Infinity
        }
      }
    })
    const wrapper = mount(PublicHomeProbe, {
      global: {
        plugins: [[VueQueryPlugin, { queryClient }]]
      }
    })

    async function expectContext(userId: string | null, circleId: string | null) {
      sessionStoreMocks.store.user = userId === null ? null : { id: userId }
      sessionStoreMocks.store.currentCircle = circleId === null ? null : { id: circleId }
      await nextTick()
      await flushPromises()
      await vi.waitFor(() => {
        expect(wrapper.get('[data-testid="home-name"]').text()).toBe(`home:${currentContext()}`)
      })
    }

    await expectContext(null, null)
    await expectContext('user-a', null)
    await expectContext('user-a', 'circle-a')
    await expectContext('user-a', 'circle-b')
    await expectContext('user-b', 'circle-b')
    await expectContext(null, null)

    expect(fetchMock).toHaveBeenCalledTimes(5)
    expect(queryClient.getQueryData(['public', 'home', 'guest', 'none'])).toMatchObject({
      appName: 'home:guest/none'
    })
    expect(queryClient.getQueryData(['public', 'home', 'user-a', 'circle-a'])).toMatchObject({
      appName: 'home:user-a/circle-a'
    })
    expect(queryClient.getQueryData(['public', 'home', 'user-a', 'circle-b'])).toMatchObject({
      appName: 'home:user-a/circle-b'
    })
    expect(queryClient.getQueryData(['public', 'home', 'user-b', 'circle-b'])).toMatchObject({
      appName: 'home:user-b/circle-b'
    })

    wrapper.unmount()
    queryClient.clear()
  })
})
