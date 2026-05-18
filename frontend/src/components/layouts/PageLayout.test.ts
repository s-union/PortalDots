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
  })
})
