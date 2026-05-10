import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import PageHeader from './PageHeader.vue'

describe('PageHeader', () => {
  it('renders title, description and actions slot', () => {
    const wrapper = mount(PageHeader, {
      props: {
        title: 'ユーザー管理',
        description: '一覧管理'
      },
      slots: {
        actions: '<button type="button">追加</button>'
      }
    })

    expect(wrapper.text()).toContain('ユーザー管理')
    expect(wrapper.text()).toContain('一覧管理')
    expect(wrapper.text()).toContain('追加')
  })

  it('renders title-only mode', () => {
    const wrapper = mount(PageHeader, {
      props: {
        title: 'タイトルのみ'
      }
    })

    expect(wrapper.text()).toContain('タイトルのみ')
    expect(wrapper.find('p.text-sm.text-primary').exists()).toBe(false)
  })
})
