import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import StaffSideWindow from './StaffSideWindow.vue'

describe('StaffSideWindow', () => {
  it('renders title and popup link when opened', () => {
    const wrapper = mount(StaffSideWindow, {
      props: {
        isOpen: true,
        title: 'ユーザーを編集',
        popUpUrl: '/staff/users/user-1'
      },
      slots: {
        default: '<div>editor body</div>'
      },
      global: {
        stubs: {
          teleport: true
        }
      }
    })

    expect(wrapper.text()).toContain('ユーザーを編集')
    expect(wrapper.text()).toContain('editor body')
    expect(wrapper.find('a[href="/staff/users/user-1"]').exists()).toBe(true)
  })

  it('emits clickClose when close button is clicked', async () => {
    const wrapper = mount(StaffSideWindow, {
      props: {
        isOpen: true
      },
      global: {
        stubs: {
          teleport: true
        }
      }
    })

    await wrapper.get('button[title="閉じる"]').trigger('click')
    expect(wrapper.emitted('clickClose')).toBeTruthy()
  })
})
