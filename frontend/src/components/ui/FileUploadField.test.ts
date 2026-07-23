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
  it('renders the drop zone copy and generated upload restrictions', () => {
    const wrapper = mountHost(':extensions="[\'pdf\', \'png\']" :max-size-bytes="5242880"')

    expect(wrapper.text()).toContain('ここにファイルをドロップ')
    expect(wrapper.text()).toContain('または')
    expect(wrapper.text()).toContain('ファイルを選択')
    expect(wrapper.text()).toContain('pdf / png ・1ファイル5MBまで')
  })

  it('prefers the hint over the generated upload restrictions', () => {
    const wrapper = mountHost(
      'hint="PDF、PNG（5MB以下）を1ファイル選択できます。" :extensions="[\'pdf\']" :max-size-bytes="4"'
    )

    expect(wrapper.text()).toContain('PDF、PNG（5MB以下）を1ファイル選択できます。')
    expect(wrapper.text()).not.toContain('pdf ・1ファイル4Bまで')
  })

  it('updates the model when a file is selected', async () => {
    const wrapper = mountHost()
    const file = new File(['content'], 'proposal.pdf', { type: 'application/pdf' })

    await setInputFile(wrapper, file)

    expect(wrapper.text()).toContain('proposal.pdf')
    expect(wrapper.text()).not.toContain('ここにファイルをドロップ')
    expect(wrapper.text()).not.toContain('ファイルを選択')
    expect(wrapper.vm.file).toBe(file)
  })

  it('keeps the selected file row constrained for long filenames', async () => {
    const wrapper = mountHost()
    const file = new File(['content'], 'very-long-file-name-that-should-not-break-the-contact-form-layout.pdf', {
      type: 'application/pdf'
    })

    await setInputFile(wrapper, file)

    expect(wrapper.html()).toContain('grid-cols-[minmax(0,1fr)_auto]')
    expect(wrapper.get('.overflow-hidden.text-ellipsis.whitespace-nowrap').text()).toContain('very-long-file-name')
  })

  it('clears the model and native input when removed', async () => {
    const wrapper = mountHost()
    const file = new File(['content'], 'proposal.pdf', { type: 'application/pdf' })
    await setInputFile(wrapper, file)

    const removeButton = wrapper.findAll('button[type="button"]').find((button) => button.text() === '選択を解除')
    if (!removeButton) {
      throw new Error('remove button not found')
    }
    await removeButton.trigger('click')

    expect(wrapper.vm.file).toBeNull()
    expect(wrapper.text()).not.toContain('proposal.pdf')
    expect(wrapper.text()).toContain('ここにファイルをドロップ')
    expect(wrapper.text()).toContain('ファイルを選択')
    expect((wrapper.get('input[type="file"]').element as HTMLInputElement).value).toBe('')
  })

  it('updates the model when a file is dropped', async () => {
    const wrapper = mountHost()
    const file = new File(['content'], 'proposal.pdf', { type: 'application/pdf' })

    await wrapper.get('.border-dashed').trigger('drop', {
      dataTransfer: {
        files: [file]
      }
    })

    expect(wrapper.text()).toContain('proposal.pdf')
    expect(wrapper.vm.file).toBe(file)
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
    expect(wrapper.get('button[type="button"]').attributes('disabled')).toBeDefined()
  })
})
