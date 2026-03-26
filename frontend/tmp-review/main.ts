import { createApp, h } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createRouter, createWebHashHistory } from 'vue-router'
import App from './App.vue'
import StaffFormsIndexPage from '../src/pages/staff/forms/index.vue'
import StaffFormEditPage from '../src/pages/staff/forms/[formId]/edit.vue'
import { authGuard } from '../src/app/router/guards/auth'
import { publicGuard } from '../src/app/router/guards/public'
import { staffGuard } from '../src/app/router/guards/staff'
import { useSessionStore } from '../src/features/session/store'
import '../src/styles/app.css'

interface FormState {
  id: string
  name: string
  description: string
  openAt: string
  closeAt: string
  maxAnswers: number
  answerableTags: string[]
  confirmationMessage: string
  isPublic: boolean
  isOpen: boolean
  createdAt: string
  updatedAt: string
  isParticipationForm: boolean
  questions: []
  answer: null
}

const mockState: { form: FormState; lastPut: null | Record<string, unknown> } = {
  form: {
    id: 'form-1',
    name: '展示チェックフォーム',
    description: '展示レイアウトと機材使用申請を提出してください。',
    openAt: '2026-03-02T00:00:00Z',
    closeAt: '2026-03-22T23:59:59Z',
    maxAnswers: 2,
    answerableTags: ['展示'],
    confirmationMessage: '回答ありがとうございました。',
    isPublic: true,
    isOpen: true,
    createdAt: '2026-03-01T12:00:00Z',
    updatedAt: '2026-03-01T12:00:00Z',
    isParticipationForm: false,
    questions: [],
    answer: null
  },
  lastPut: null
}
;(window as Window & { __mockState?: typeof mockState }).__mockState = mockState

const originalFetch = window.fetch.bind(window)
window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
  const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase()
  const pathname = new URL(url, 'http://localhost').pathname

  if (pathname.endsWith('/staff/status') && method === 'GET') {
    return jsonResponse({ allowed: true, authorized: true })
  }
  if (pathname.endsWith('/staff/forms') && method === 'GET') {
    const { questions: _q, answer: _a, ...summary } = mockState.form
    return jsonResponse([summary])
  }
  if (pathname.endsWith('/staff/forms/form-1') && method === 'GET') {
    return jsonResponse(mockState.form)
  }
  if (pathname.endsWith('/staff/forms/form-1') && method === 'PUT') {
    const payload = await parseBody(input, init?.body)
    mockState.lastPut = payload
    mockState.form = { ...mockState.form, ...(payload as Partial<FormState>) }
    const { questions: _q, answer: _a, ...summary } = mockState.form
    return jsonResponse(summary)
  }

  return originalFetch(input, init)
}

function jsonResponse(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}

async function parseBody(
  input: RequestInfo | URL,
  body: null | string | ArrayBuffer | Blob | FormData | URLSearchParams | ReadableStream<Uint8Array> | undefined
) {
  if (typeof body !== 'string') {
    if (typeof Request !== 'undefined' && input instanceof Request) {
      body = await input.clone().text()
    }
  }
  if (typeof body !== 'string') {
    return {}
  }

  const parsed: unknown = JSON.parse(body)
  return isRecord(parsed) ? parsed : {}
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const pinia = createPinia()
setActivePinia(pinia)
const sessionStore = useSessionStore()
sessionStore.hydrate({
  csrfToken: 'csrf-token',
  currentCircle: { id: 'circle-b', name: 'デモ企画B' },
  featureFlags: [],
  permissions: ['staff.forms.read,edit'],
  roles: [],
  user: { id: 'staff-user', displayName: 'Staff User' }
})

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: { render: () => h('div', 'home') } },
    {
      path: '/staff',
      component: { render: () => h('div', { id: 'staff-home' }, 'staff home') },
      meta: { requiresAuth: true, requiresStaffRole: true, requiresStaffAuthorized: true }
    },
    { path: '/staff/forms', component: StaffFormsIndexPage },
    { path: '/staff/forms/:formId/edit', component: StaffFormEditPage },
    {
      path: '/staff/forms/:formId/editor',
      component: { render: () => h('div', { id: 'editor-page' }, 'editor page') },
      meta: {
        requiresAuth: true,
        requiresStaffRole: true,
        requiresStaffAuthorized: true,
        requiresCircle: true,
        staffCapability: 'forms.edit'
      }
    },
    {
      path: '/staff/forms/:formId/answers',
      component: { render: () => h('div', { id: 'answers-page' }, 'answers page') },
      meta: {
        requiresAuth: true,
        requiresStaffRole: true,
        requiresStaffAuthorized: true,
        requiresCircle: true,
        staffCapability: 'formAnswers.read'
      }
    },
    {
      path: '/staff/forms/:formId/preview',
      component: { render: () => h('div', { id: 'preview-page' }, 'preview page') },
      meta: {
        requiresAuth: true,
        requiresStaffRole: true,
        requiresStaffAuthorized: true,
        requiresCircle: true,
        staffCapability: 'forms.edit'
      }
    }
  ]
})

router.beforeEach(async (to) => {
  for (const guard of [publicGuard, authGuard, staffGuard]) {
    const result = await guard(to, sessionStore)
    if (result !== true) {
      return result
    }
  }
  return true
})

await router.push('/staff/forms')
await router.isReady()

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false }
  }
})

createApp(App).use(pinia).use(router).use(VueQueryPlugin, { queryClient }).mount('#app')
