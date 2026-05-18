import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import QuestionEditorCard from './QuestionEditorCard.vue'

describe('QuestionEditorCard', () => {
  it('renders title, meta, default slot, and actions slot', () => {
    const wrapper = mount(QuestionEditorCard, {
      props: {
        title: '設問タイトル',
        meta: 'Q1'
      },
      slots: {
        default: '本文',
        actions: '<button type="button">編集</button>'
      }
    })

    expect(wrapper.text()).toContain('Q1')
    expect(wrapper.text()).toContain('設問タイトル')
    expect(wrapper.text()).toContain('本文')
    expect(wrapper.text()).toContain('編集')
  })
})
