import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import TagChip from './TagChip.vue'

describe('TagChip', () => {
  it('applies colour classes for a known colour token', () => {
    const wrapper = mount(TagChip, { props: { name: '文化系', color: 'blue' } })

    expect(wrapper.classes()).toContain('text-tag-blue')
    expect(wrapper.classes()).toContain('bg-tag-blue-light')
    expect(wrapper.text()).toBe('文化系')
  })

  it('falls back to gray for a missing colour', () => {
    const wrapper = mount(TagChip, { props: { name: '文化系' } })

    expect(wrapper.classes()).toContain('text-tag-gray')
    expect(wrapper.classes()).toContain('bg-tag-gray-light')
  })

  it('falls back to gray for an unknown colour token', () => {
    const wrapper = mount(TagChip, { props: { name: '文化系', color: 'pink' } })

    expect(wrapper.classes()).toContain('text-tag-gray')
  })

  it('applies the small size variant', () => {
    const wrapper = mount(TagChip, { props: { name: '文化系', color: 'red', size: 'sm' } })

    expect(wrapper.classes()).toContain('text-xs')
    expect(wrapper.classes()).not.toContain('text-sm')
  })
})
