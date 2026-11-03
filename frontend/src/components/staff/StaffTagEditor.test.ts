import { afterEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { useSessionStore } from '@/features/session/store'
import type { StaffTag } from '@/features/staff/masters/tags'
import { toTagId } from '@/lib/api/schema'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/server'
import StaffTagEditor from './StaffTagEditor.vue'

enableAutoUnmount(afterEach)

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

function mountEditor(tag: StaffTag | null = null) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const sessionStore = useSessionStore()
  sessionStore.hydrate({
    csrfToken: 'csrf-token',
    currentCircle: null,
    featureFlags: [],
    roles: ['admin'],
    user: { id: 'staff-user', displayName: 'Staff User' }
  })
  return mount(StaffTagEditor, {
    props: { tag },
    global: { plugins: [pinia, createQueryPlugin()] }
  })
}

describe('StaffTagEditor', () => {
  it('preserves dirty text and refreshes clean colour when the list replaces the selected record', async () => {
    const tag = {
      id: toTagId('tag-1'),
      name: 'First',
      color: 'blue' as const,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z'
    }
    const wrapper = mountEditor(tag)
    await wrapper.get('[name="name"]').setValue('unfinished draft')
    await wrapper.setProps({ tag: { ...tag, name: 'Server name', color: 'green' } })
    expect(wrapper.get<HTMLInputElement>('[name="name"]').element.value).toBe('unfinished draft')
    expect(wrapper.get<HTMLInputElement>('[name="color"][value="green"]').element.checked).toBe(true)
  })

  it('clears success and delete errors when selecting a different record', async () => {
    const tag = {
      id: toTagId('tag-1'),
      name: 'First',
      color: 'blue' as const,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z'
    }
    const next = { ...tag, id: toTagId('tag-2'), name: 'Second' }
    server.use(
      http.put('/v1/staff/tags/tag-1', () => HttpResponse.json(tag)),
      http.delete('/v1/staff/tags/tag-2', () => HttpResponse.json({ message: 'Delete failed' }, { status: 500 }))
    )
    const wrapper = mountEditor(tag)
    await wrapper.get('form').trigger('submit')
    await expect.poll(() => wrapper.text()).toContain('タグを更新しました。')
    await wrapper.setProps({ tag: next })
    expect(wrapper.text()).not.toContain('タグを更新しました。')
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    await wrapper.get('button[type="button"]').trigger('click')
    await expect.poll(() => wrapper.text()).toContain('タグの保存に失敗しました。')
    await wrapper.setProps({ tag: null })
    expect(wrapper.text()).not.toContain('タグの保存に失敗しました。')
    expect(wrapper.get<HTMLInputElement>('[name="name"]').element.value).toBe('')
  })

  it('ignores a late failed delete after selection changes', async () => {
    const tag = {
      id: toTagId('tag-1'),
      name: 'First',
      color: 'blue' as const,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z'
    }
    const pending = Promise.withResolvers<Response>()
    let requests = 0
    server.use(
      http.delete('/v1/staff/tags/tag-1', () => {
        requests++
        return pending.promise
      })
    )
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const wrapper = mountEditor(tag)
    await wrapper.get('button[type="button"]').trigger('click')
    await expect.poll(() => requests).toBe(1)
    await wrapper.setProps({ tag: { ...tag, id: toTagId('tag-2'), name: 'Second' } })
    pending.resolve(HttpResponse.json({ message: 'Delete failed' }, { status: 500 }))
    await flushPromises()
    await expect.poll(() => wrapper.get('button[type="submit"]').attributes('disabled')).toBeUndefined()
    expect(wrapper.text()).not.toContain('タグの保存に失敗しました。')
    expect(wrapper.emitted('deleted')).toBeUndefined()
    expect(wrapper.get<HTMLInputElement>('[name="name"]').element.value).toBe('Second')
  })

  it('defaults to gray and sends the selected colour when creating a tag', async () => {
    let createBody: unknown
    server.use(
      http.post('/v1/staff/tags', async ({ request }) => {
        createBody = await request.json()
        return HttpResponse.json(
          {
            id: 'tag-new',
            name: '新規タグ',
            color: 'green',
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-01-01T00:00:00Z'
          },
          { status: 201 }
        )
      })
    )

    const wrapper = mountEditor()
    const grayRadio = wrapper.find('input[name="color"][value="gray"]')
    expect((grayRadio.element as HTMLInputElement).checked).toBe(true)

    await wrapper.find('input[name="name"]').setValue('新規タグ')
    await wrapper.find('input[name="color"][value="green"]').setValue()
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(createBody).toEqual({ name: '新規タグ', color: 'green' })
  })

  it('pre-selects the existing colour and sends it when updating a tag', async () => {
    let updateBody: unknown
    server.use(
      http.put('/v1/staff/tags/tag-1', async ({ request }) => {
        updateBody = await request.json()
        return HttpResponse.json({
          id: 'tag-1',
          name: '文化系',
          color: 'blue',
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z'
        })
      })
    )

    const wrapper = mountEditor({
      id: toTagId('tag-1'),
      name: '文化系',
      color: 'blue',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z'
    })
    const blueRadio = wrapper.find('input[name="color"][value="blue"]')
    expect((blueRadio.element as HTMLInputElement).checked).toBe(true)

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(updateBody).toEqual({ name: '文化系', color: 'blue' })
  })

  it('renders the full colour palette', async () => {
    const wrapper = mountEditor()
    const options = wrapper.findAll('input[name="color"]')
    expect(options.map((option) => option.attributes('value'))).toEqual([
      'gray',
      'red',
      'orange',
      'green',
      'blue',
      'purple'
    ])
  })

  it('groups the colour radios in a fieldset with a legend', () => {
    const wrapper = mountEditor()

    const fieldset = wrapper.find('fieldset')
    expect(fieldset.exists()).toBe(true)
    expect(fieldset.find('legend').text()).toContain('タグの色')

    const radios = wrapper.findAll('input[name="color"]')
    expect(radios.length).toBe(6)
    for (const radio of radios) {
      expect(radio.element.closest('label')).not.toBeNull()
    }
  })

  it('does not nest radio labels inside another label', () => {
    const wrapper = mountEditor()

    const labels = wrapper.findAll('label')
    expect(labels.length).toBeGreaterThan(0)
    for (const label of labels) {
      expect(label.find('label').exists()).toBe(false)
    }
  })
})
