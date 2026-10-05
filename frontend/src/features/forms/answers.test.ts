import { afterEach, expect, it, vi } from 'vitest'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { mount } from '@vue/test-utils'
import { computed, defineComponent, reactive } from 'vue'
import { useFormDetailQuery, useFormsQuery } from './api'
import {
  useFormAnswerByIdQuery,
  useFormAnswerMutation,
  useFormAnswerUploadMutation,
  useFormAnswersQuery
} from './answers'

const sessionMock = vi.hoisted(() => ({
  store: { isAuthenticated: true, currentCircle: { id: 'circle-a', name: 'A' } }
}))

vi.mock('@/features/session/store', () => ({ useSessionStore: () => sessionMock.store }))

function createAnswer(id: string, body = '', uploads: unknown[] = []) {
  return {
    id,
    body,
    updatedAt: '2026-01-01T00:00:00Z',
    details: {},
    uploads
  }
}

function createUpload() {
  return {
    id: 'upload-1',
    questionId: 'question-upload',
    filename: 'layout.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 128,
    createdAt: '2026-01-01T00:00:00Z'
  }
}

function createFormDetail(name: string) {
  return {
    id: 'form-1',
    name,
    description: 'フォームの説明',
    openAt: '2026-01-01T00:00:00Z',
    closeAt: '2026-12-31T23:59:59Z',
    maxAnswers: 1,
    answerableTags: [],
    confirmationMessage: '回答ありがとうございました。',
    isPublic: true,
    isOpen: true,
    currentCircleStatus: 'approved',
    questions: []
  }
}

function createFormSummary(hasAnswer: boolean) {
  return {
    id: 'form-1',
    name: hasAnswer ? '保存後フォーム' : '保存前フォーム',
    description: 'フォームの説明',
    openAt: '2026-01-01T00:00:00Z',
    closeAt: '2026-12-31T23:59:59Z',
    maxAnswers: 1,
    answerableTags: [],
    confirmationMessage: '回答ありがとうございました。',
    isPublic: true,
    isOpen: true,
    hasAnswer
  }
}

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0, gcTime: Infinity },
      mutations: { retry: false }
    }
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
  sessionMock.store = reactive({ isAuthenticated: true, currentCircle: { id: 'circle-a', name: 'A' } })
})

it('refetches the selected answer after uploading a file', async () => {
  let uploaded = false
  let answerFetches = 0
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = input instanceof Request ? input : undefined
      const url = request?.url ?? (input instanceof URL ? input.href : typeof input === 'string' ? input : '')
      const method = request?.method ?? init?.method ?? 'GET'
      const pathname = new URL(url).pathname

      if (method === 'GET' && pathname.endsWith('/forms/form-1/answers/answer-1')) {
        answerFetches += 1
        return Response.json({ answer: createAnswer('answer-1', '', uploaded ? [createUpload()] : []) })
      }
      if (method === 'POST' && pathname.endsWith('/forms/form-1/answers/answer-1/uploads')) {
        uploaded = true
        return new Response(null, { status: 204 })
      }
      throw new Error(`Unexpected ${method} ${pathname}`)
    })
  )

  let upload: (() => Promise<unknown>) | undefined
  const Probe = defineComponent({
    setup() {
      const answerQuery = useFormAnswerByIdQuery('form-1', 'answer-1')
      const uploadMutation = useFormAnswerUploadMutation('form-1')
      upload = () =>
        uploadMutation.mutateAsync({
          answerId: 'answer-1',
          questionId: 'question-upload',
          file: new File(['content'], 'layout.pdf', { type: 'application/pdf' })
        })
      const uploadCount = computed(() => answerQuery.data.value?.answer?.uploads.length ?? 0)
      return { uploadCount }
    },
    template: '<output>{{ uploadCount }}</output>'
  })
  const client = createQueryClient()
  const wrapper = mount(Probe, { global: { plugins: [[VueQueryPlugin, { queryClient: client }]] } })

  try {
    await vi.waitFor(() => expect(wrapper.text()).toBe('0'))
    await upload?.()
    await vi.waitFor(() => expect(wrapper.text()).toBe('1'))
    expect(answerFetches).toBe(2)
  } finally {
    wrapper.unmount()
    client.clear()
  }
})

it('refreshes answer lists, form details, and the forms list after saving', async () => {
  let saved = false
  const fetchCounts = { forms: 0, detail: 0, answers: 0 }
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = input instanceof Request ? input : undefined
      const url = request?.url ?? (input instanceof URL ? input.href : typeof input === 'string' ? input : '')
      const method = request?.method ?? init?.method ?? 'GET'
      const pathname = new URL(url).pathname

      if (method === 'GET' && pathname.endsWith('/forms')) {
        fetchCounts.forms += 1
        return Response.json({
          items: [createFormSummary(saved)],
          page: 1,
          pageSize: 20,
          total: 1,
          totalUnfiltered: 1
        })
      }
      if (method === 'GET' && pathname.endsWith('/forms/form-1')) {
        fetchCounts.detail += 1
        return Response.json(createFormDetail(saved ? '保存後フォーム' : '保存前フォーム'))
      }
      if (method === 'GET' && pathname.endsWith('/forms/form-1/answers')) {
        fetchCounts.answers += 1
        return Response.json({ answers: [createAnswer('answer-1', saved ? '保存後回答' : '保存前回答')] })
      }
      if (method === 'PUT' && pathname.endsWith('/forms/form-1/answer')) {
        saved = true
        return Response.json({ answer: createAnswer('answer-1', '保存後回答') })
      }
      throw new Error(`Unexpected ${method} ${pathname}`)
    })
  )

  let save: (() => Promise<unknown>) | undefined
  const Probe = defineComponent({
    setup() {
      const formsQuery = useFormsQuery()
      const detailQuery = useFormDetailQuery('form-1')
      const answersQuery = useFormAnswersQuery('form-1')
      const saveMutation = useFormAnswerMutation('form-1')
      save = () => saveMutation.mutateAsync({ 'question-1': 'saved' })
      const snapshot = computed(() =>
        JSON.stringify({
          form: formsQuery.data.value?.items[0]?.name,
          detail: detailQuery.data.value?.name,
          answer: answersQuery.data.value?.answers[0]?.body
        })
      )
      return { snapshot }
    },
    template: '<output>{{ snapshot }}</output>'
  })
  const client = createQueryClient()
  const wrapper = mount(Probe, { global: { plugins: [[VueQueryPlugin, { queryClient: client }]] } })

  try {
    await vi.waitFor(() =>
      expect(wrapper.text()).toBe(
        JSON.stringify({ form: '保存前フォーム', detail: '保存前フォーム', answer: '保存前回答' })
      )
    )
    await save?.()
    await vi.waitFor(() =>
      expect(wrapper.text()).toBe(
        JSON.stringify({ form: '保存後フォーム', detail: '保存後フォーム', answer: '保存後回答' })
      )
    )
    expect(fetchCounts.forms).toBe(2)
    expect(fetchCounts.detail).toBe(2)
    expect(fetchCounts.answers).toBe(2)
  } finally {
    wrapper.unmount()
    client.clear()
  }
})

it('writes an in-flight save to its original circle cache after switching circles', async () => {
  let resolveSave: ((response: Response) => void) | undefined
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = input instanceof Request ? input : undefined
      const url = request?.url ?? (input instanceof URL ? input.href : typeof input === 'string' ? input : '')
      const method = request?.method ?? init?.method ?? 'GET'
      const pathname = new URL(url).pathname
      if (method === 'PUT' && pathname.endsWith('/forms/form-1/answer')) {
        return new Promise<Response>((resolve) => {
          resolveSave = resolve
        })
      }
      throw new Error(`Unexpected ${method} ${pathname}`)
    })
  )

  let save: (() => Promise<unknown>) | undefined
  const Probe = defineComponent({
    setup() {
      const saveMutation = useFormAnswerMutation('form-1')
      save = () => saveMutation.mutateAsync({ 'question-1': 'saved' })
      return {}
    },
    template: '<div />'
  })
  const client = createQueryClient()
  const wrapper = mount(Probe, { global: { plugins: [[VueQueryPlugin, { queryClient: client }]] } })
  const circleAKey = ['forms', 'answer', 'form-1', 'circle-a']
  const circleBKey = ['forms', 'answer', 'form-1', 'circle-b']
  client.setQueryData(circleAKey, { answer: createAnswer('answer-a', 'before') })
  client.setQueryData(circleBKey, { answer: createAnswer('answer-b', 'circle B') })

  try {
    const pendingSave = save?.()
    await vi.waitFor(() => expect(resolveSave).toBeDefined())
    sessionMock.store.currentCircle = { id: 'circle-b', name: 'B' }
    resolveSave?.(Response.json({ answer: createAnswer('answer-a', 'saved') }))
    await pendingSave

    expect(client.getQueryData<{ answer: { body: string } }>(circleAKey)?.answer.body).toBe('saved')
    expect(client.getQueryData<{ answer: { body: string } }>(circleBKey)?.answer.body).toBe('circle B')
  } finally {
    wrapper.unmount()
    client.clear()
  }
})
