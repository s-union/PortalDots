import { afterEach, describe, expect, it } from 'vitest'
import { enableAutoUnmount, flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import type { Component } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { http, HttpResponse } from 'msw'
import { server } from './server'
import { useSessionStore } from '@/features/session/store'
import { mockForm, mockParticipationType, mockTag, mockPlace, mockContactCategory, mockUser } from '@/mocks/data'
import ContactPage from '@/pages/workspace/contact.vue'
import PasswordPage from '@/pages/workspace/settings/password.vue'
import ProfilePage from '@/pages/workspace/settings/index.vue'
import StaffTagEditor from '@/components/staff/StaffTagEditor.vue'
import StaffPlaceEditor from '@/components/staff/StaffPlaceEditor.vue'
import StaffContactCategoryEditor from '@/components/staff/StaffContactCategoryEditor.vue'
import StaffFormCreatePage from '@/pages/staff/forms/create.vue'
import StaffFormEditPage from '@/pages/staff/forms/[formId]/edit.vue'
import ParticipationCreatePage from '@/pages/staff/circles/participation_types/index.vue'
import ParticipationEditPage from '@/pages/staff/circles/participation_types/[typeId]/edit.vue'
import StaffPageCreatePage from '@/pages/staff/pages/create.vue'
import StaffPageEditPage from '@/pages/staff/pages/[pageId].vue'
import RegistrationPage from '@/pages/email/verify/[type]/[userId].vue'

enableAutoUnmount(afterEach)

interface FormCase {
  name: string
  component: Component
  route: string
  props?: Record<string, unknown>
  endpoint: string
  method?: 'put'
  first: string
  errorField: string
  correct: string
  values: Record<string, string>
  reset?: boolean
  edit?: boolean
}
const personal = {
  name: '入力 太郎',
  nameYomi: 'にゅうりょく たろう',
  contactEmail: 'test@example.com',
  phoneNumber: '090-1111-1111'
}
const dates = { openAt: '2026-10-10T10:00', closeAt: '2026-10-11T10:00' }
const cases: FormCase[] = [
  {
    name: 'contact',
    component: ContactPage,
    route: '/workspace/contact',
    endpoint: '/v1/contact',
    first: 'categoryId',
    errorField: 'body',
    correct: '修正したお問い合わせ',
    values: { categoryId: 'cat-1', body: 'お問い合わせ' },
    reset: true
  },
  {
    name: 'password',
    component: PasswordPage,
    route: '/workspace/settings/password',
    endpoint: '/v1/session/password',
    method: 'put',
    first: 'currentPassword',
    errorField: 'newPassword',
    correct: 'corrected123',
    values: { currentPassword: 'current123', newPassword: 'password123', confirmPassword: 'password123' },
    reset: true
  },
  {
    name: 'profile',
    component: ProfilePage,
    route: '/workspace/settings',
    endpoint: '/v1/session/profile',
    method: 'put',
    first: 'name',
    errorField: 'currentPassword',
    correct: 'corrected123',
    values: { ...personal, currentPassword: 'current123' },
    edit: true
  },
  {
    name: 'tag',
    component: StaffTagEditor,
    route: '/contract/tag',
    props: { tag: null },
    endpoint: '/v1/staff/tags',
    first: 'name',
    errorField: 'name',
    correct: '修正したタグ',
    values: { name: '入力したタグ' },
    reset: true
  },
  {
    name: 'place',
    component: StaffPlaceEditor,
    route: '/contract/place',
    props: { place: null },
    endpoint: '/v1/staff/places',
    first: 'name',
    errorField: 'type',
    correct: '2',
    values: { name: '入力した場所' },
    reset: true
  },
  {
    name: 'contact category',
    component: StaffContactCategoryEditor,
    route: '/contract/category',
    props: { category: null },
    endpoint: '/v1/staff/contact-categories',
    first: 'name',
    errorField: 'email',
    correct: 'corrected@example.com',
    values: { name: '入力したカテゴリ', email: 'test@example.com' },
    reset: true
  },
  {
    name: 'form creation',
    component: StaffFormCreatePage,
    route: '/staff/forms/create',
    endpoint: '/v1/staff/forms',
    first: 'name',
    errorField: 'maxAnswers',
    correct: '2',
    values: { name: '入力したフォーム' }
  },
  {
    name: 'form settings',
    component: StaffFormEditPage,
    route: '/staff/forms/form-1/edit',
    endpoint: '/v1/staff/forms/form-1',
    method: 'put',
    first: 'name',
    errorField: 'maxAnswers',
    correct: '2',
    values: { name: '入力したフォーム' },
    edit: true
  },
  {
    name: 'participation creation',
    component: ParticipationCreatePage,
    route: '/staff/circles/participation_types',
    endpoint: '/v1/staff/participation-types',
    first: 'name',
    errorField: 'closeAt',
    correct: '2026-10-12T10:00',
    values: { name: '入力した種別', ...dates },
    reset: true
  },
  {
    name: 'participation settings',
    component: ParticipationEditPage,
    route: '/staff/circles/participation_types/type-1/edit',
    endpoint: '/v1/staff/participation-types/type-1',
    method: 'put',
    first: 'name',
    errorField: 'usersCountMax',
    correct: '3',
    values: { name: '入力した種別' },
    edit: true
  },
  {
    name: 'notice creation',
    component: StaffPageCreatePage,
    route: '/staff/pages/create',
    endpoint: '/v1/staff/pages',
    first: 'title',
    errorField: 'body',
    correct: '修正した本文',
    values: { title: '入力したお知らせ', body: '入力した本文' }
  },
  {
    name: 'notice settings',
    component: StaffPageEditPage,
    route: '/staff/pages/page-1',
    endpoint: '/v1/staff/pages/page-1',
    method: 'put',
    first: 'title',
    errorField: 'publishedAt',
    correct: '2026-10-12T10:00',
    values: { title: '入力したお知らせ' },
    edit: true
  },
  {
    name: 'account registration',
    component: RegistrationPage,
    route: '/email/verify/univemail/pending-1?token=token',
    endpoint: '/v1/auth/register/complete',
    first: 'name',
    errorField: 'passwordConfirmation',
    correct: 'corrected123',
    values: { ...personal, password: 'password123', passwordConfirmation: 'password123' }
  }
]
const formRecord = {
  ...mockForm,
  circle: { id: 'circle-1', name: '企画' },
  staffNotificationUserIds: [],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  isParticipationForm: false,
  questions: [],
  answer: null
}
const pageRecord = {
  id: 'page-1',
  title: 'お知らせ',
  body: '本文',
  notes: '',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  publishedAt: '2026-10-10T01:00:00Z',
  isPinned: false,
  isPublic: true,
  mailScheduled: false,
  viewableTags: [],
  documentIds: [],
  documents: []
}

async function mountForm(config: FormCase) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const session = {
    csrfToken: 'csrf-token',
    currentCircle: null,
    featureFlags: [],
    roles: ['admin'],
    user: { ...mockUser, lastNameReading: 'やまだ', firstNameReading: 'たろう' }
  }
  useSessionStore().hydrate(session)
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  server.use(
    http.get('/v1/session/bootstrap', () => HttpResponse.json(session)),
    http.get('/v1/contact-categories', () => HttpResponse.json([mockContactCategory])),
    http.get('/v1/staff/forms/form-1', () => HttpResponse.json(formRecord)),
    http.get('/v1/staff/pages/page-1', () => HttpResponse.json(pageRecord)),
    http.get('/v1/staff/participation-types/type-1', () => HttpResponse.json(mockParticipationType)),
    http.post('/v1/auth/register/verify', () =>
      HttpResponse.json({
        pendingRegistrationId: 'pending-1',
        univemail: 'test@example.ac.jp',
        studentId: 's123',
        verified: true
      })
    )
  )
  const path = config.route.split('?')[0]
  if (!path) throw new Error('Expected a route path')
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: path.replace('form-1', ':formId').replace('page-1', ':pageId').replace('type-1', ':typeId'),
        component: config.component,
        props: config.props
      },
      { path: '/:pathMatch(.*)*', component: { template: '<div>Completed</div>' } }
    ]
  })
  await router.push(config.route)
  await router.isReady()
  const wrapper = mount(
    { template: '<RouterView />' },
    { attachTo: document.body, global: { plugins: [pinia, router, [VueQueryPlugin, { queryClient }]] } }
  )
  await flushPromises()
  await expect.poll(() => wrapper.find(`[name="${config.first}"]`).exists()).toBe(true)
  await flushPromises()
  return { wrapper, router, queryClient }
}
async function fill(wrapper: VueWrapper, values: Record<string, string>) {
  for (const [field, value] of Object.entries(values)) await wrapper.get(`[name="${field}"]`).setValue(value)
}
function success(config: FormCase) {
  if (config.name === 'password' || config.name === 'account registration')
    return new HttpResponse(null, { status: 204 })
  const records: Record<string, unknown> = {
    contact: {
      id: 'mail-1',
      categoryId: 'cat-1',
      categoryName: 'カテゴリ',
      subject: 'カテゴリ',
      status: 'queued',
      createdAt: '2026-01-01T00:00:00Z'
    },
    tag: mockTag,
    place: mockPlace,
    'contact category': mockContactCategory,
    profile: mockUser,
    'form creation': formRecord,
    'form settings': formRecord,
    'participation creation': mockParticipationType,
    'participation settings': mockParticipationType,
    'notice creation': pageRecord,
    'notice settings': pageRecord
  }
  return HttpResponse.json(records[config.name], { status: config.method ? 200 : 201 })
}

describe.each(cases)('Form lifecycle: $name', (config) => {
  it('waits for interaction, blocks invalid requests and focuses its first invalid native control', async () => {
    let requests = 0
    server.use(
      http[config.method ?? 'post'](config.endpoint, () => {
        requests++
        return success(config)
      })
    )
    const { wrapper } = await mountForm(config)
    const first = wrapper.get(`[name="${config.first}"]`)
    expect(first.attributes('aria-invalid')).toBe('false')
    await first.setValue('')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(requests).toBe(0)
    expect(first.attributes('aria-invalid')).toBe('true')
    expect(document.activeElement).toBe(first.element)
    for (const id of first.attributes('aria-describedby')?.split(' ') ?? [])
      expect(document.getElementById(id)).not.toBeNull()
  })

  it('guards duplicate requests, maps server field errors, and accepts a corrected retry', async () => {
    let requests = 0
    const pending = Promise.withResolvers<Response>()
    server.use(
      http[config.method ?? 'post'](config.endpoint, async () => {
        requests++
        return requests === 1 ? (await pending.promise).clone() : success(config)
      })
    )
    const { wrapper, router } = await mountForm(config)
    await fill(wrapper, config.values)
    const form = wrapper.get('form')
    await Promise.all([form.trigger('submit'), form.trigger('submit')])
    await expect.poll(() => requests).toBe(1)
    await form.trigger('submit')
    await flushPromises()
    expect(requests).toBe(1)
    pending.resolve(
      HttpResponse.json(
        { message: 'Validation failed', errors: { [config.errorField]: ['送信値を確認してください'] } },
        { status: 422 }
      )
    )
    await expect.poll(() => wrapper.text()).toContain('送信値を確認してください')
    await flushPromises()
    const invalid = wrapper.get(`[name="${config.errorField}"]`)
    expect(invalid.attributes('aria-invalid')).toBe('true')
    expect(document.activeElement).toBe(invalid.element)
    const errorId = invalid
      .attributes('aria-describedby')
      ?.split(' ')
      .find((id) => id.endsWith('-error'))
    expect(errorId && document.getElementById(errorId)?.textContent).toBe('送信値を確認してください')
    await invalid.setValue(config.correct)
    if (config.name === 'password') await wrapper.get('[name="confirmPassword"]').setValue(config.correct)
    if (config.name === 'account registration') await wrapper.get('[name="password"]').setValue(config.correct)
    await wrapper.get('form').trigger('submit')
    await expect.poll(() => requests).toBe(2)
    await expect
      .poll(() => (wrapper.find('form').exists() ? wrapper.get('form').attributes('aria-busy') : 'false'))
      .toBe('false')
    await new Promise((resolve) => setTimeout(resolve, 400))
    expect(wrapper.findAll('[aria-invalid="true"]')).toHaveLength(0)
    expect(wrapper.text()).not.toContain('送信値を確認してください')
    if (config.reset) expect(wrapper.get<HTMLInputElement>(`[name="${config.first}"]`).element.value).toBe('')
    else if (!config.edit) expect(router.currentRoute.value.fullPath).not.toBe(config.route)
  })
})

const editCases = [
  { name: 'form settings', record: formRecord, query: ['staff', 'forms', 'detail', 'form-1'], clean: 'description' },
  {
    name: 'participation settings',
    record: mockParticipationType,
    query: ['staff', 'participation-types', 'type-1'],
    clean: 'description'
  },
  { name: 'notice settings', record: pageRecord, query: ['staff', 'pages', 'detail', 'page-1'], clean: 'body' }
]
describe.each(editCases)('Server synchronization: $name', ({ name, record, query, clean }) => {
  it('refreshes clean fields, keeps dirty input and preserves edits made during a save', async () => {
    const config = cases.find((item) => item.name === name)
    if (!config) throw new Error('Expected an edit case')
    const pending = Promise.withResolvers<Response>()
    let requests = 0
    server.use(
      http.put(config.endpoint, async () => {
        requests++
        return pending.promise
      })
    )
    const { wrapper, queryClient } = await mountForm(config)
    await wrapper.get(`[name="${config.first}"]`).setValue('local draft')
    queryClient.setQueryData(query, { ...record, [config.first]: 'refreshed name', [clean]: 'refreshed clean field' })
    await expect
      .poll(() => wrapper.get<HTMLInputElement>(`[name="${clean}"]`).element.value)
      .toBe('refreshed clean field')
    expect(wrapper.get<HTMLInputElement>(`[name="${config.first}"]`).element.value).toBe('local draft')
    await wrapper.get('form').trigger('submit')
    await expect.poll(() => requests).toBe(1)
    const input = wrapper.get<HTMLInputElement>(`[name="${config.first}"]`)
    expect(input.element.disabled).toBe(false)
    await input.setValue('edited while saving')
    pending.resolve(HttpResponse.json({ ...record, [config.first]: 'local draft', [clean]: 'saved clean field' }))
    await expect.poll(() => wrapper.get('form').attributes('aria-busy')).toBe('false')
    expect(input.element.value).toBe('edited while saving')
    expect(wrapper.get<HTMLInputElement>(`[name="${clean}"]`).element.value).toBe('saved clean field')
  })
})

it('preserves an unfinished profile edit when the session refreshes, and clears the submitted password', async () => {
  const config = cases.find((item) => item.name === 'profile')
  if (!config) throw new Error('Expected the profile case')
  const { wrapper } = await mountForm(config)
  const session = useSessionStore()
  if (!session.user) throw new Error('Expected a session user')
  await wrapper.get('[name="name"]').setValue('編集中 太郎')
  session.user = { ...session.user, contactEmail: 'refreshed@example.com' }
  await expect
    .poll(() => wrapper.get<HTMLInputElement>('[name="contactEmail"]').element.value)
    .toBe('refreshed@example.com')
  expect(wrapper.get<HTMLInputElement>('[name="name"]').element.value).toBe('編集中 太郎')
  server.use(http.put(config.endpoint, () => HttpResponse.json(mockUser)))
  await wrapper.get('[name="currentPassword"]').setValue('current123')
  await wrapper.get('form').trigger('submit')
  await expect.poll(() => wrapper.text()).toContain('プロフィールを更新しました。')
  expect(wrapper.get<HTMLInputElement>('[name="currentPassword"]').element.value).toBe('')
})

it('keeps a blank numeric draft across refresh and submits typed numbers and complete tag arrays', async () => {
  const config = cases.find((item) => item.name === 'form settings')
  if (!config) throw new Error('Expected form settings')
  const { wrapper, queryClient } = await mountForm(config)
  const maximum = wrapper.get<HTMLInputElement>('[name="maxAnswers"]')
  await maximum.setValue('')
  queryClient.setQueryData(['staff', 'forms', 'detail', 'form-1'], { ...formRecord, maxAnswers: 3 })
  await flushPromises()
  expect(maximum.element.value).toBe('')
  await wrapper.get('form').trigger('submit')
  await expect.poll(() => maximum.attributes('aria-invalid')).toBe('true')
  await maximum.setValue('2')
  const picker = wrapper.get('[name="answerableTags"]')
  await picker.setValue('独自タグ')
  await picker.trigger('keydown', { key: 'Enter' })
  const pending = Promise.withResolvers<Response>()
  let payload: unknown
  server.use(
    http.put(config.endpoint, async ({ request }) => {
      payload = await request.json()
      return pending.promise
    })
  )
  await wrapper.get('form').trigger('submit')
  await expect.poll(() => payload).toMatchObject({ maxAnswers: 2, answerableTags: ['独自タグ'] })
  await picker.setValue('後から追加')
  await picker.trigger('keydown', { key: 'Enter' })
  pending.resolve(HttpResponse.json({ ...formRecord, maxAnswers: 2, answerableTags: ['独自タグ'] }))
  await expect.poll(() => wrapper.get('form').attributes('aria-busy')).toBe('false')
  expect(maximum.element.value).toBe('2')
  expect(wrapper.text()).toContain('独自タグ')
  expect(wrapper.text()).toContain('後から追加')
})
