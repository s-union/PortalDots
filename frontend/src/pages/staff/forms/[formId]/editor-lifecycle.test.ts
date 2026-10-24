import { afterEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/server'
import { useSessionStore } from '@/features/session/store'
import { parseStaffFormQuestion, type StaffFormQuestion } from '@/features/staff/forms/api'
import { staffFormStoryDetail } from '../story-fixtures'
import { UNSAVED_CHANGES_CONFIRM_MESSAGE } from '@/features/forms/composables/useUnsavedChangesGuard'
import StaffFormEditorPage from './editor.vue'

enableAutoUnmount(afterEach)
afterEach(() => vi.restoreAllMocks())

function question(id: string, priority: number, overrides: Partial<StaffFormQuestion> = {}): StaffFormQuestion {
  return parseStaffFormQuestion({
    id,
    priority,
    name: `設問 ${id}`,
    description: '',
    type: 'text',
    isRequired: false,
    numberMin: null,
    numberMax: null,
    allowedTypes: '',
    options: [],
    createdAt: '2026-03-05T10:00:00Z',
    updatedAt: '2026-03-05T10:00:00Z',
    ...overrides
  })
}

async function setup(questions: () => StaffFormQuestion[]) {
  server.use(
    http.get('/v1/staff/forms/form-circle-b-1', () =>
      HttpResponse.json({ ...staffFormStoryDetail, questions: questions() })
    )
  )
  const pinia = createPinia()
  setActivePinia(pinia)
  useSessionStore().hydrate({
    csrfToken: 'csrf-token',
    currentCircle: null,
    featureFlags: [],
    roles: ['admin'],
    user: { id: 'staff-user', displayName: 'Staff User' }
  })
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/staff/forms/:formId/editor', component: StaffFormEditorPage },
      { path: '/staff/forms/:formId/answers', component: { template: '<div>answers</div>' } },
      { path: '/staff/forms/:formId/edit', component: { template: '<div>edit</div>' } }
    ]
  })
  await router.push('/staff/forms/form-circle-b-1/editor')
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = mount(
    { template: '<router-view />' },
    { global: { plugins: [pinia, router, [VueQueryPlugin, { queryClient: client }]] } }
  )
  await flushPromises()
  return { wrapper, router, client }
}

describe('StaffFormEditorPage lifecycle', () => {
  it('keeps raw options and validation errors attached to their question after reordering', async () => {
    const first = question('a', 1, { type: 'checkbox', options: ['既存'] })
    const second = question('b', 2)
    let questions = [first, second]
    const orderPayloads: unknown[] = []
    server.use(
      http.put('/v1/staff/forms/form-circle-b-1/questions/order', async ({ request }) => {
        orderPayloads.push(await request.json())
        questions = [
          { ...second, priority: 1 },
          { ...first, priority: 2 }
        ]
        return new HttpResponse(null, { status: 204 })
      })
    )
    const { wrapper } = await setup(() => questions)
    const firstCard = wrapper.findAll('article')[0]
    await firstCard.get('[role="button"]').trigger('click')
    const name = firstCard.get<HTMLInputElement>('#question-a-name')
    const options = firstCard.get<HTMLTextAreaElement>('#question-a-options')
    await name.setValue('   ')
    await firstCard.get('form').trigger('submit')
    await flushPromises()
    await options.setValue('  未保存 A  \n未保存 A\n未保存 B\n')
    await flushPromises()
    expect(firstCard.text()).toContain('設問名を入力してください')
    await firstCard
      .findAll('button')
      .find((button) => button.text() === '↓ 下へ')!
      .trigger('click')
    await flushPromises()
    expect(orderPayloads).toEqual([{ questionIds: ['b', 'a'] }])
    const cards = wrapper.findAll('article')
    expect(cards[0].get<HTMLInputElement>('#question-b-name').element.value).toBe('設問 b')
    expect(cards[0].text()).not.toContain('設問名を入力してください')
    expect(cards[1].get<HTMLInputElement>('#question-a-name').element.value).toBe('   ')
    expect(cards[1].get<HTMLTextAreaElement>('#question-a-options').element.value).toBe(
      '  未保存 A  \n未保存 A\n未保存 B\n'
    )
    expect(cards[1].get('#question-a-name').attributes('aria-invalid')).toBe('true')
    expect(wrapper.text()).toContain('未保存の変更があります')
  })

  it('preserves an unblurred options draft through creation and deletion refreshes', async () => {
    let questions = [question('a', 1, { type: 'checkbox', options: ['既存'] })]
    const added = question('b', 2)
    server.use(
      http.post('/v1/staff/forms/form-circle-b-1/questions', () => {
        questions = [...questions, added]
        return HttpResponse.json(added, { status: 201 })
      }),
      http.delete('/v1/staff/forms/form-circle-b-1/questions/b', () => {
        questions = questions.filter((item) => item.id !== added.id)
        return new HttpResponse(null, { status: 204 })
      })
    )
    const { wrapper } = await setup(() => questions)
    const firstCard = wrapper.findAll('article')[0]
    await firstCard.get('[role="button"]').trigger('click')
    const options = firstCard.get<HTMLTextAreaElement>('#question-a-options')
    await options.setValue('  未保存の選択肢  \n\n追加')
    const addText = wrapper.findAll('button').find((button) => button.text().includes('一行入力'))
    if (!addText) throw new Error('Text question creation must be available')
    await addText.trigger('click')
    await flushPromises()
    expect(wrapper.findAll('article')).toHaveLength(2)
    expect(options.element.value).toBe('  未保存の選択肢  \n\n追加')
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const deleteButton = wrapper
      .findAll('article')[1]
      .findAll('button')
      .find((button) => button.text() === 'この項目を削除')
    if (!deleteButton) throw new Error('Delete button must be rendered')
    await deleteButton.trigger('click')
    await flushPromises()
    expect(wrapper.findAll('article')).toHaveLength(1)
    expect(options.element.value).toBe('  未保存の選択肢  \n\n追加')
    expect(wrapper.text()).toContain('未保存の変更があります')
  })

  it('refreshes clean fields without clearing another question draft', async () => {
    let questions = [question('a', 1), question('b', 2)]
    const { wrapper, client } = await setup(() => questions)
    const name = wrapper.get<HTMLInputElement>('#question-a-name')
    await name.setValue('入力中の設問')
    questions = [question('a', 1, { description: '最新の説明' }), question('b', 2, { name: '別のスタッフによる変更' })]
    await client.invalidateQueries({ queryKey: ['staff', 'forms', 'detail', 'form-circle-b-1'] })
    await flushPromises()
    expect(name.element.value).toBe('入力中の設問')
    expect(wrapper.get<HTMLTextAreaElement>('#question-a-description').element.value).toBe('最新の説明')
    expect(wrapper.get<HTMLInputElement>('#question-b-name').element.value).toBe('別のスタッフによる変更')
  })

  it('confirms a form switch and ignores a pending result from the previous form', async () => {
    const pending = Promise.withResolvers<Response>()
    const started = Promise.withResolvers<void>()
    let previousQuestion = question('a', 1)
    server.use(
      http.put('/v1/staff/forms/form-circle-b-1/questions/a', () => {
        started.resolve()
        return pending.promise
      }),
      http.get('/v1/staff/forms/form-next', () =>
        HttpResponse.json({
          ...staffFormStoryDetail,
          id: 'form-next',
          questions: [question('a', 1, { name: '次のフォームの設問' })]
        })
      )
    )
    const { wrapper, router } = await setup(() => [previousQuestion])
    const firstCard = wrapper.findAll('article')[0]
    await firstCard.get('[role="button"]').trigger('click')
    await firstCard.get('#question-a-name').setValue('旧フォームの保存')
    await firstCard.get('#question-a-name').trigger('blur')
    await started.promise
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    await router.push('/staff/forms/form-next/editor')
    expect(router.currentRoute.value.path).toBe('/staff/forms/form-circle-b-1/editor')
    expect(confirm).toHaveBeenCalledWith(UNSAVED_CHANGES_CONFIRM_MESSAGE)
    confirm.mockReturnValue(true)
    await router.push('/staff/forms/form-next/editor')
    await flushPromises()
    expect(wrapper.get<HTMLInputElement>('#question-a-name').element.value).toBe('次のフォームの設問')
    await wrapper.get('#question-a-name').setValue('次のフォームの入力中')
    previousQuestion = question('a', 1, { name: '旧フォームの保存' })
    pending.resolve(HttpResponse.json(previousQuestion))
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/staff/forms/form-next/editor')
    expect(wrapper.get<HTMLInputElement>('#question-a-name').element.value).toBe('次のフォームの入力中')
    expect(wrapper.text()).toContain('未保存の変更があります')
    expect(wrapper.text()).not.toContain('保存しました')
  })
})
