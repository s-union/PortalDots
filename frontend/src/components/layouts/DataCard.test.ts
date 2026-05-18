import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import DataCard from './DataCard.vue'

describe('DataCard', () => {
  it('renders header, toolbar, body, and footer slots', () => {
    const wrapper = mount(DataCard, {
      props: {
        title: '企画一覧',
        description: '説明'
      },
      slots: {
        toolbar: '<div>ツールバー</div>',
        default: '<div>本文</div>',
        footer: '<div>フッター</div>',
        actions: '<button type="button">操作</button>'
      }
    })

    expect(wrapper.text()).toContain('企画一覧')
    expect(wrapper.text()).toContain('説明')
    expect(wrapper.text()).toContain('ツールバー')
    expect(wrapper.text()).toContain('本文')
    expect(wrapper.text()).toContain('フッター')
    expect(wrapper.text()).toContain('操作')
  })

  it('supports overflowHidden option', () => {
    const wrapper = mount(DataCard, {
      props: {
        overflowHidden: true
      },
      slots: {
        default: '<div>本文</div>'
      }
    })

    expect(wrapper.find('.overflow-hidden').exists()).toBe(true)
  })
})
