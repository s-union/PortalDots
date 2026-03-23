import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import AlertMessage from './AlertMessage.vue'

describe('AlertMessage', () => {
  it('renders slot content', () => {
    const wrapper = mount(AlertMessage, {
      slots: {
        default: '保存しました'
      }
    })

    expect(wrapper.text()).toContain('保存しました')
  })

  it('applies success tone classes', () => {
    const wrapper = mount(AlertMessage, {
      props: {
        tone: 'success'
      },
      slots: {
        default: 'OK'
      }
    })

    expect(wrapper.classes()).toContain('border-success')
    expect(wrapper.classes()).toContain('text-success')
  })
})
