import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ListPanel from './ListPanel.vue'

describe('ListPanel', () => {
  it('renders modern panel with header and actions', () => {
    const wrapper = mount(ListPanel, {
      props: {
        title: '一覧',
        description: '説明文'
      },
      slots: {
        default: '本文',
        actions: '<button type="button">追加</button>'
      }
    })

    expect(wrapper.text()).toContain('一覧')
    expect(wrapper.text()).toContain('説明文')
    expect(wrapper.text()).toContain('本文')
    expect(wrapper.text()).toContain('追加')
  })

  it('renders legacy panel classes when legacy is true', () => {
    const wrapper = mount(ListPanel, {
      props: {
        title: '旧UI',
        legacy: true,
        overflowHidden: true
      },
      slots: {
        default: '本文'
      }
    })

    expect(wrapper.text()).toContain('旧UI')
    const section = wrapper.get('section')
    expect(section.classes()).toContain('pb-2')
    expect(section.classes()).toContain('pt-4')

    const panels = wrapper.findAll('div')
    const contentPanel = panels.find((item) => item.classes().includes('rounded-[0.45rem]'))
    expect(contentPanel).toBeDefined()
    expect(contentPanel?.classes()).toContain('overflow-hidden')
  })
})
