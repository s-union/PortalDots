import { afterEach, expect, it, vi } from 'vitest'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { mount } from '@vue/test-utils'
import { computed, defineComponent, reactive } from 'vue'

const sessionMock = vi.hoisted(() => ({
  store: { isAuthenticated: true, currentCircle: { id: 'circle-a', name: 'A' } }
}))

vi.mock('@/features/session/store', () => ({ useSessionStore: () => sessionMock.store }))

import { useCircleMembersQuery, useCurrentCircleDetailQuery } from './queries'
import { useFormAnswerByIdQuery, useFormAnswerQuery, useFormAnswersQuery } from '@/features/forms/answers'

afterEach(() => {
  vi.unstubAllGlobals()
  sessionMock.store.currentCircle = { id: 'circle-a', name: 'A' }
})

it('keeps current-circle detail, members, and answer caches separate after switching circles', async () => {
  sessionMock.store = reactive({ isAuthenticated: true, currentCircle: { id: 'circle-a', name: 'A' } })
  const calls: string[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = input instanceof Request ? input.url : String(input)
      const circleId = sessionMock.store.currentCircle.id
      calls.push(`${circleId} ${url}`)
      const answer = {
        id: `answer-${circleId}`,
        body: circleId,
        updatedAt: '2026-01-01T00:00:00Z',
        details: {},
        uploads: []
      }

      if (url.endsWith('/circles/current/detail')) {
        return Response.json({
          id: circleId,
          name: circleId,
          nameYomi: '',
          groupName: '',
          groupNameYomi: '',
          participationTypeId: 'type-1',
          participationTypeName: 'Exhibit',
          formId: 'form-1',
          notes: '',
          invitationToken: '',
          submittedAt: null,
          questions: []
        })
      }
      if (url.endsWith('/circles/current/members')) {
        return Response.json([{ userId: `member-${circleId}`, displayName: circleId, isLeader: true }])
      }
      if (url.endsWith('/forms/form-1/answers')) {
        return Response.json({ answers: [answer] })
      }
      if (url.endsWith('/forms/form-1/answer') || url.endsWith('/forms/form-1/answers/answer-circle-a')) {
        return Response.json({ answer })
      }
      throw new Error(`Unexpected URL: ${url}`)
    })
  )

  const Probe = defineComponent({
    setup() {
      const detail = useCurrentCircleDetailQuery()
      const members = useCircleMembersQuery()
      const legacy = useFormAnswerQuery('form-1')
      const answers = useFormAnswersQuery('form-1')
      const selected = useFormAnswerByIdQuery('form-1', 'answer-circle-a')
      const snapshot = computed(() =>
        JSON.stringify([
          detail.data.value?.id,
          members.data.value?.[0]?.userId,
          legacy.data.value?.answer?.id,
          answers.data.value?.answers[0]?.id,
          selected.data.value?.answer?.id
        ])
      )
      return { snapshot }
    },
    template: '<output>{{ snapshot }}</output>'
  })

  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 30_000, gcTime: Infinity } }
  })
  const mountProbe = () => mount(Probe, { global: { plugins: [[VueQueryPlugin, { queryClient: client }]] } })
  let wrapper = mountProbe()

  try {
    await vi.waitFor(() =>
      expect(wrapper.text()).toBe(
        JSON.stringify(['circle-a', 'member-circle-a', 'answer-circle-a', 'answer-circle-a', 'answer-circle-a'])
      )
    )

    wrapper.unmount()
    sessionMock.store.currentCircle = { id: 'circle-b', name: 'B' }
    wrapper = mountProbe()

    await vi.waitFor(() =>
      expect(wrapper.text()).toBe(
        JSON.stringify(['circle-b', 'member-circle-b', 'answer-circle-b', 'answer-circle-b', 'answer-circle-b'])
      )
    )
    expect(calls.filter((call) => call.startsWith('circle-a '))).toHaveLength(5)
    expect(calls.filter((call) => call.startsWith('circle-b '))).toHaveLength(5)
  } finally {
    wrapper.unmount()
    client.clear()
  }
})
