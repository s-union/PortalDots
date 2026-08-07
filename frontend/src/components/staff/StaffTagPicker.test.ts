import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import StaffTagPicker from './StaffTagPicker.vue'

describe('StaffTagPicker', () => {
  it('renders selected tags with their colour classes', () => {
    const wrapper = mount(StaffTagPicker, {
      props: {
        modelValue: ['文化系'],
        availableTags: ['文化系', 'スポーツ系'],
        tagColors: { 文化系: 'blue' }
      }
    })

    const chip = wrapper.find('span.rounded-full')
    expect(chip.text()).toContain('文化系')
    expect(chip.classes()).toContain('text-tag-blue')
    expect(chip.classes()).toContain('bg-tag-blue-light')
    expect(chip.classes()).not.toContain('text-tag-gray')
  })

  it('falls back to gray for tags without a colour mapping', () => {
    const wrapper = mount(StaffTagPicker, {
      props: {
        modelValue: ['文化系'],
        availableTags: ['文化系']
      }
    })

    const chip = wrapper.find('span.rounded-full')
    expect(chip.classes()).toContain('text-tag-gray')
    expect(chip.classes()).toContain('bg-tag-gray-light')
  })

  it('colours suggestion buttons too', async () => {
    const wrapper = mount(StaffTagPicker, {
      props: {
        modelValue: [],
        availableTags: ['文化系', 'スポーツ系'],
        tagColors: { スポーツ系: 'green' }
      }
    })

    const suggestion = wrapper.findAll('button.rounded-full').find((button) => button.text() === 'スポーツ系')
    expect(suggestion?.classes()).toContain('text-tag-green')
  })

  it('emits update:modelValue when a tag is removed', async () => {
    const wrapper = mount(StaffTagPicker, {
      props: {
        modelValue: ['文化系', 'スポーツ系'],
        availableTags: ['文化系', 'スポーツ系']
      }
    })

    const chips = wrapper.findAll('span.rounded-full')
    await chips[0].find('button').trigger('click')

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([['スポーツ系']])
  })
})
