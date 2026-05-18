import { describe, expect, it } from 'vitest'
import { defineComponent, ref } from 'vue'
import { mount } from '@vue/test-utils'
import MarkdownEditorField from './MarkdownEditorField.vue'

describe('MarkdownEditorField', () => {
  it('applies toolbar formatting to the textarea value', async () => {
    const Host = defineComponent({
      components: { MarkdownEditorField },
      setup() {
        const value = ref('')
        return { value }
      },
      template: '<MarkdownEditorField v-model="value" name="body" />'
    })

    const wrapper = mount(Host)

    await wrapper.get('button').trigger('click')

    const textarea = wrapper.get('textarea')
    expect((textarea.element as HTMLTextAreaElement).value).toBe('# 項目')
  })

  it('shows preview for the current markdown value', async () => {
    const Host = defineComponent({
      components: { MarkdownEditorField },
      setup() {
        const value = ref('## プレビュー確認')
        return { value }
      },
      template: '<MarkdownEditorField v-model="value" name="body" />'
    })

    const wrapper = mount(Host)

    const previewButton = wrapper.findAll('button').find((button) => button.text() === 'プレビュー')
    if (!previewButton) {
      throw new Error('preview button not found')
    }

    await previewButton.trigger('click')

    expect(wrapper.text()).toContain('プレビュー確認')
    expect(wrapper.get('a').attributes('href')).toBe('/staff/markdown-guide')
  })
})
