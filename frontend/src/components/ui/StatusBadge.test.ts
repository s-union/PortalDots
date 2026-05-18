import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import StatusBadge from './StatusBadge.vue'

describe('StatusBadge', () => {
  it('renders slot content', () => {
    const wrapper = mount(StatusBadge, {
      slots: {
        default: '限定公開'
      }
    })

    expect(wrapper.text()).toContain('限定公開')
  })

  it('applies outlined primary classes', () => {
    const wrapper = mount(StatusBadge, {
      props: {
        tone: 'primary',
        appearance: 'outlined'
      },
      slots: {
        default: '限定公開'
      }
    })

    expect(wrapper.classes()).toContain('border')
    expect(wrapper.classes()).toContain('border-primary')
    expect(wrapper.classes()).toContain('text-primary')
  })

  it('supports small size', () => {
    const wrapper = mount(StatusBadge, {
      props: {
        size: 'sm'
      },
      slots: {
        default: 'NEW'
      }
    })

    expect(wrapper.classes()).toContain('py-0.5')
  })
})
