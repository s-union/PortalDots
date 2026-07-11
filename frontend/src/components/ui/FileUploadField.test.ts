import { describe, expect, it } from 'vitest'
import { defineComponent, ref } from 'vue'
import { mount } from '@vue/test-utils'
import FileUploadField from './FileUploadField.vue'

function mountHost(extraProps = '') {
  const Host = defineComponent({
    components: { FileUploadField },
    setup() {
      const file = ref<File | null>(null)
      const error = ref('')
      return { file, error }
    },
    template: `<FileUploadField v-model="file" v-model:error="error" ${extraProps} />`
  })

  return mount(Host)
}

function setInputFile(wrapper: ReturnType<typeof mountHost>, file: File) {
  const input = wrapper.get('input[type="file"]')
  Object.defineProperty(input.element, 'files', { configurable: true, value: [file] })
  return input.trigger('change')
}

describe('FileUploadField', () => {
  it('updates the model when a file is selected', async () => {
    const wrapper = mountHost()
    const file = new File(['content'], 'proposal.pdf', { type: 'application/pdf' })

    await setInputFile(wrapper, file)

    expect(wrapper.text()).toContain('proposal.pdf')
    expect(wrapper.vm.file).toBe(file)
  })

  it('clears the model and native input when removed', async () => {
    const wrapper = mountHost()
    const file = new File(['content'], 'proposal.pdf', { type: 'application/pdf' })
    await setInputFile(wrapper, file)

    await wrapper.get('button[type="button"]').trigger('click')

    expect(wrapper.vm.file).toBeNull()
    expect(wrapper.text()).not.toContain('proposal.pdf')
    expect((wrapper.get('input[type="file"]').element as HTMLInputElement).value).toBe('')
  })

  it('reports a client-side extension error to the parent', async () => {
    const wrapper = mountHost(':extensions="[\'pdf\']" extension-error-message="PDFを選択してください"')
    const file = new File(['content'], 'notes.txt', { type: 'text/plain' })

    await setInputFile(wrapper, file)

    expect(wrapper.text()).toContain('PDFを選択してください')
    expect(wrapper.vm.error).toBe('PDFを選択してください')
    expect(wrapper.get('input[type="file"]').attributes('aria-invalid')).toBe('true')
  })

  it('reports a client-side max size error to the parent', async () => {
    const wrapper = mountHost(':max-size-bytes="4"')
    const file = new File(['12345'], 'big.txt')

    await setInputFile(wrapper, file)

    expect(wrapper.text()).toContain('ファイルサイズは 4B 以下にしてください')
    expect(wrapper.vm.error).toBe('ファイルサイズは 4B 以下にしてください')
  })

  it('falls back to the server error when there is no client-side issue', async () => {
    const wrapper = mountHost('server-error="サーバーエラー"')
    const file = new File(['content'], 'proposal.pdf', { type: 'application/pdf' })

    await setInputFile(wrapper, file)

    expect(wrapper.text()).toContain('サーバーエラー')
    expect(wrapper.vm.error).toBe('サーバーエラー')
  })

  it('sets the accept attribute from extensions and omits it otherwise', () => {
    const withExtensions = mountHost(":extensions=\"['pdf', 'png']\"")
    expect(withExtensions.get('input[type="file"]').attributes('accept')).toBe('.pdf,.png')

    const withoutExtensions = mountHost()
    expect(withoutExtensions.get('input[type="file"]').attributes('accept')).toBeUndefined()
  })

  it('disables the input', () => {
    const wrapper = mountHost('disabled')
    expect(wrapper.get('input[type="file"]').attributes('disabled')).toBeDefined()
  })
})
