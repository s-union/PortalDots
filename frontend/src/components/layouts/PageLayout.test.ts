import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import PageLayout from './PageLayout.vue'

describe('PageLayout', () => {
  it('renders content with shared page container classes', () => {
    const wrapper = mount(PageLayout, {
      props: {
        class: 'custom-layout'
      },
      slots: {
        default: 'ページ本文'
      }
    })

    expect(wrapper.text()).toContain('ページ本文')
    expect(wrapper.classes()).toContain('custom-layout')
    expect(wrapper.classes()).toContain('space-y-6')
    expect(wrapper.classes()).toContain('px-6')
    expect(wrapper.classes()).toContain('max-[1000px]:px-4')
  })

  it('removes outer padding in full-width layouts', () => {
    const wrapper = mount(PageLayout, {
      props: {
        fullWidth: true
      },
      slots: {
        default: '全幅ページ'
      }
    })

    expect(wrapper.classes()).toContain('px-0')
    expect(wrapper.classes()).toContain('max-[1000px]:px-0')
    expect(wrapper.classes()).not.toContain('px-6')
    expect(wrapper.classes()).not.toContain('max-[1000px]:px-4')
  })
})
