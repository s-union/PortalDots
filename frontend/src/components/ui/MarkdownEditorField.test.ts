import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, ref } from 'vue'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import MarkdownEditorField from './MarkdownEditorField.vue'

enableAutoUnmount(afterEach)

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

    await vi.waitFor(
      () => {
        expect(wrapper.text()).toContain('プレビュー確認')
      },
      { timeout: 5000 }
    )
    expect(wrapper.get('a').attributes('href')).toBe('/staff/markdown-guide')
  })

  it('restores focus and selection after formatting selected text', async () => {
    const Host = defineComponent({
      components: { MarkdownEditorField },
      setup() {
        const value = ref('書式対象です')
        return { value }
      },
      template: '<MarkdownEditorField v-model="value" name="body" />'
    })
    const wrapper = mount(Host, { attachTo: document.body })
    const textarea = wrapper.get<HTMLTextAreaElement>('textarea').element
    textarea.focus()
    textarea.setSelectionRange(2, 4)

    await wrapper.get('button[title="太字"]').trigger('click')

    expect(textarea.value).toBe('書式**対象**です')
    expect(document.activeElement).toBe(textarea)
    expect(textarea.selectionStart).toBe(4)
    expect(textarea.selectionEnd).toBe(6)
  })
})
