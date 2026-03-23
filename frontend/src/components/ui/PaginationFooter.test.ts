import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import PaginationFooter from './PaginationFooter.vue'

describe('PaginationFooter', () => {
  it('renders range and pages', () => {
    const wrapper = mount(PaginationFooter, {
      props: {
        page: 2,
        pageSize: 10,
        total: 35
      }
    })

    expect(wrapper.text()).toContain('35 件中')
    expect(wrapper.text()).toContain('11')
    expect(wrapper.text()).toContain('20')
    expect(wrapper.text()).toContain('2 / 4')
  })

  it('emits update:page when clicking next', async () => {
    const wrapper = mount(PaginationFooter, {
      props: {
        page: 1,
        pageSize: 10,
        total: 35
      }
    })

    const buttons = wrapper.findAll('button')
    await buttons[1].trigger('click')

    expect(wrapper.emitted('update:page')).toEqual([[2]])
  })

  it('shows border-top style when bordered is false', () => {
    const wrapper = mount(PaginationFooter, {
      props: {
        page: 1,
        pageSize: 10,
        total: 5,
        bordered: false
      }
    })

    expect(wrapper.classes()).toContain('border-t')
    expect(wrapper.classes()).not.toContain('rounded')
  })
})
