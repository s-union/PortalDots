import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { mockStaffUser, mockStaffUser2 } from '@/mocks/data'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/server'
import StaffUserPicker from './StaffUserPicker.vue'

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

function mountPicker(modelValue: string[], options?: { disabled?: boolean }) {
  return mount(StaffUserPicker, {
    props: {
      modelValue,
      name: 'staffNotificationUserIds',
      ...(options?.disabled ? { disabled: true } : {})
    },
    global: { plugins: [createQueryPlugin()] }
  })
}

function findRemoveButton(wrapper: ReturnType<typeof mountPicker>, displayName: string) {
  return wrapper
    .findAll('button[type="button"]')
    .find((button) => button.attributes('title') === `${displayName} を外す`)
}

describe('StaffUserPicker', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows an empty message when no user is selected', async () => {
    const wrapper = mountPicker([])
    await flushPromises()

    expect(wrapper.text()).toContain('スタッフは未選択です。')
  })

  it('adds a user from the suggestions', async () => {
    const wrapper = mountPicker([])
    await flushPromises()

    await wrapper.get('input[name="staffNotificationUserIds"]').setValue('鈴木')
    await flushPromises()

    const suggestionButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('鈴木 二郎') && button.text().includes('suzuki@example.com'))
    if (!suggestionButton) {
      throw new Error('staff user suggestion button not found')
    }
    await suggestionButton.trigger('click')
    await flushPromises()

    expect(wrapper.emitted('update:modelValue')).toEqual([[['staff-user-1']]])
  })

  it('removes a selected user', async () => {
    const wrapper = mountPicker(['staff-user-1'])
    await flushPromises()

    expect(wrapper.text()).toContain('鈴木 二郎')

    const removeButton = findRemoveButton(wrapper, '鈴木 二郎')
    if (!removeButton) {
      throw new Error('remove button not found')
    }
    await removeButton.trigger('click')

    expect(wrapper.emitted('update:modelValue')).toEqual([[[]]])
  })

  it('loads and renders the display name of each selected user', async () => {
    server.use(
      http.get('/v1/staff/users/staff-1', () => HttpResponse.json(mockStaffUser)),
      http.get('/v1/staff/users/staff-2', () => HttpResponse.json(mockStaffUser2))
    )

    const wrapper = mountPicker(['staff-1', 'staff-2'])
    await flushPromises()

    expect(wrapper.text()).toContain('スタッフ 一郎')
    expect(wrapper.text()).toContain('鈴木 二郎')
  })

  it('stays read-only when disabled', async () => {
    const wrapper = mountPicker(['staff-user-1'], { disabled: true })
    await flushPromises()

    expect(wrapper.get('input[name="staffNotificationUserIds"]').attributes('disabled')).toBeDefined()

    const removeButton = findRemoveButton(wrapper, '鈴木 二郎')
    if (!removeButton) {
      throw new Error('remove button not found')
    }
    await removeButton.trigger('click')

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })
})
