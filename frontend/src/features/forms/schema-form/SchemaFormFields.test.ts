import { afterEach, describe, expect, it } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { getInput, useForm, validate, type FormStore } from '@formisch/vue'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import * as v from 'valibot'
import SchemaFormFields from './SchemaFormFields.vue'
import { fieldUi, type FieldOption } from './ui'
import { formLayout, type LayoutItem } from './layout'
import type { FieldOverrides } from './types'

enableAutoUnmount(afterEach)

const planOptions: readonly FieldOption[] = [
  { value: 'free', label: '無料' },
  { value: 'pro', label: '有料' }
]
const colorOptions: readonly FieldOption[] = [
  { value: 'red', label: '赤' },
  { value: 'blue', label: '青' }
]
const interestOptions: readonly FieldOption[] = [
  { value: 'sports', label: 'スポーツ' },
  { value: 'music', label: '音楽' }
]
const themeOptions: readonly FieldOption[] = [
  { value: 'gray', label: 'グレー' },
  { value: 'red', label: '赤' }
]
const favoriteColorOptions: readonly FieldOption[] = [
  { value: 'green', label: '緑' },
  { value: 'yellow', label: '黄' }
]
const documentOptions: readonly FieldOption[] = [{ value: 'doc-a', label: '資料A', description: '資料Aの説明' }]

const testSchema = v.pipe(
  v.object({
    name: v.pipe(
      v.string(),
      v.minLength(1, '名前を入力してください'),
      fieldUi({ control: 'text', label: '名前', helper: 'フルネーム', placeholder: '山田太郎' })
    ),
    bio: v.pipe(v.string(), fieldUi({ control: 'textarea', label: '自己紹介' })),
    notes: v.pipe(v.string(), fieldUi({ control: 'markdown', label: 'メモ' })),
    age: v.pipe(
      v.number('数値で入力してください'),
      v.minValue(0, '0以上で入力してください'),
      fieldUi({ control: 'number', label: '年齢', min: 0 })
    ),
    plan: v.pipe(
      v.string(),
      v.minLength(1, 'プランを選択してください'),
      fieldUi({ control: 'select', label: 'プラン', options: planOptions })
    ),
    color: v.pipe(v.string(), fieldUi({ control: 'radio', label: '色', options: colorOptions })),
    agree: v.pipe(
      v.boolean(),
      v.value(true, '同意してください'),
      fieldUi({ control: 'checkbox', label: '確認', checkboxLabel: '利用規約に同意する' })
    ),
    interests: v.pipe(
      v.array(v.string()),
      fieldUi({ control: 'checkboxGroup', label: '興味', options: interestOptions, keepUnavailableValue: true })
    ),
    openAt: v.pipe(v.string(), fieldUi({ control: 'datetime', label: '開始日時' })),
    tags: v.pipe(v.array(v.string()), fieldUi({ control: 'tags', label: 'タグ' })),
    users: v.pipe(v.array(v.string()), fieldUi({ control: 'users', label: '担当者' })),
    theme: v.pipe(v.string(), fieldUi({ control: 'colorRadio', label: 'テーマ', options: themeOptions })),
    contact: v.object({
      email: v.pipe(
        v.string(),
        v.minLength(1, 'メールアドレスを入力してください'),
        fieldUi({ control: 'email', label: 'メール' })
      )
    }),
    website: v.pipe(v.string(), fieldUi({ control: 'text', label: 'サイト', prefix: 'https://' })),
    cardAgree: v.pipe(
      v.boolean(),
      fieldUi({
        control: 'checkbox',
        variant: 'card',
        label: '確認事項',
        checkboxLabel: '案内を受け取る',
        description: 'いつでも配信停止できます。'
      })
    ),
    favoriteColor: v.pipe(
      v.string(),
      fieldUi({ control: 'select', label: '好きな色', options: favoriteColorOptions, keepUnavailableValue: true })
    ),
    documents: v.pipe(
      v.array(v.string()),
      fieldUi({ control: 'checkboxGroup', label: '資料', options: documentOptions })
    )
  }),
  formLayout([
    'name',
    { row: ['age', 'plan'] },
    { section: 'profile', description: '詳細情報', collapsible: true, items: ['bio', 'notes', 'color'] },
    { slot: 'extra' },
    { heading: '追加情報', description: '任意項目です' },
    { display: 'studentId', label: '学籍番号' },
    'agree',
    'interests',
    'openAt',
    'tags',
    'users',
    'theme',
    'contact.email',
    'website',
    'cardAgree',
    'favoriteColor',
    'documents'
  ])
)

type TestSchema = typeof testSchema

function initialInput(): v.InferInput<TestSchema> {
  return {
    name: '',
    bio: '',
    notes: '',
    age: 0,
    plan: '',
    color: '',
    agree: false,
    interests: [],
    openAt: '',
    tags: [],
    users: [],
    theme: 'gray',
    contact: { email: '' },
    website: '',
    cardAgree: false,
    favoriteColor: '',
    documents: []
  }
}

function mountForm(
  options: {
    overrides?: FieldOverrides<TestSchema['entries']>
    disabled?: boolean
    variant?: 'stack' | 'settings' | 'list'
    requiredLabel?: string
    displayValues?: Record<string, string>
    displayLabels?: Record<string, string>
    layout?: readonly LayoutItem[]
    slots?: Record<string, unknown>
    input?: v.InferInput<TestSchema>
    onFieldBlur?: (key: string) => void
    onFieldChange?: (key: string) => void
    attachToBody?: boolean
  } = {}
) {
  let form!: FormStore<TestSchema>
  const Harness = defineComponent({
    setup() {
      form = useForm({ schema: testSchema, initialInput: options.input ?? initialInput() })
      return () =>
        h(
          SchemaFormFields,
          {
            of: form,
            schema: testSchema,
            disabled: options.disabled,
            variant: options.variant,
            requiredLabel: options.requiredLabel,
            displayValues: options.displayValues,
            displayLabels: options.displayLabels,
            layout: options.layout,
            overrides: { users: { disabled: true }, ...options.overrides },
            onFieldBlur: options.onFieldBlur,
            onFieldChange: options.onFieldChange
          },
          options.slots
        )
    }
  })
  const wrapper = mount(Harness, {
    attachTo: options.attachToBody ? document.body : undefined,
    global: { plugins: [[VueQueryPlugin, { queryClient: new QueryClient() }]] }
  })
  return {
    wrapper,
    get form() {
      return form
    }
  }
}

describe('SchemaFormFields', () => {
  it('renders every control kind and binds input both ways', async () => {
    const { wrapper, form } = mountForm()

    await wrapper.get('input[name="name"]').setValue('田中太郎')
    expect(getInput(form).name).toBe('田中太郎')

    await wrapper.get('textarea[name="bio"]').setValue('こんにちは')
    expect(getInput(form).bio).toBe('こんにちは')

    await wrapper.get('textarea[name="notes"]').setValue('**メモ**')
    expect(getInput(form).notes).toBe('**メモ**')

    await wrapper.get('input[name="age"]').setValue('20')
    expect(getInput(form).age).toBe(20)

    await wrapper.get('select[name="plan"]').setValue('pro')
    expect(getInput(form).plan).toBe('pro')

    const colorRadios = wrapper.findAll('input[name="color"]')
    expect(colorRadios).toHaveLength(2)
    await colorRadios[1].setValue(true)
    expect(getInput(form).color).toBe('blue')

    await wrapper.get('input[name="agree"]').setValue(true)
    expect(getInput(form).agree).toBe(true)

    const interestCheckboxes = wrapper.findAll('input[name="interests"]')
    expect(interestCheckboxes).toHaveLength(2)
    await interestCheckboxes[0].setValue(true)
    expect(getInput(form).interests).toEqual(['sports'])

    await wrapper.get('input[name="openAt"]').setValue('2026-05-01T10:00')
    expect(getInput(form).openAt).not.toBe('')

    expect(wrapper.find('input[name="users"]').attributes('disabled')).toBeDefined()

    const themeRadios = wrapper.findAll('input[name="theme"]')
    expect(themeRadios).toHaveLength(2)
    await themeRadios[1].setValue(true)
    expect(getInput(form).theme).toBe('red')

    await wrapper.get('input[name="contact.email"]').setValue('taro@example.com')
    expect(getInput(form).contact?.email).toBe('taro@example.com')
  })

  it('adds a tag through the tags control using override picker data', async () => {
    const { wrapper, form } = mountForm({
      overrides: { tags: { availableTags: ['企画', '広報'], tagColors: { 企画: 'blue' } } }
    })
    const suggestion = wrapper.findAll('button').find((button) => button.text() === '企画')
    if (!suggestion) throw new Error('Expected a tag suggestion button')
    await suggestion.trigger('click')
    expect(getInput(form).tags).toEqual(['企画'])
  })

  it('derives the required marker and native required/aria-required from the schema', () => {
    const { wrapper } = mountForm()
    expect(wrapper.get('label[for="name"]').text()).toContain('*')
    expect(wrapper.get('input[name="name"]').attributes('required')).toBeDefined()
    expect(wrapper.get('input[name="age"]').attributes('required')).toBeDefined()
    expect(wrapper.get('select[name="plan"]').attributes('required')).toBeDefined()
    expect(wrapper.get('input[name="agree"]').attributes('required')).toBeDefined()

    expect(wrapper.find('label[for="bio"]').text()).not.toContain('*')
    expect(wrapper.get('textarea[name="bio"]').attributes('required')).toBeUndefined()
  })

  it('exposes the required marker through the labelled accessible name, not a redundant aria-label', () => {
    const { wrapper } = mountForm()
    // No `aria-label` override: the browser (and testing-library's `getByRole`) computes the
    // accessible name from the associated `<label>`, so it must include the required marker.
    for (const name of ['name', 'age', 'plan', 'bio']) {
      expect(wrapper.get(`[name="${name}"]`).attributes('aria-label')).toBeUndefined()
    }
    const input = wrapper.get<HTMLInputElement>('input[name="name"]')
    expect(input.element.labels?.[0]?.textContent).toContain('名前')
    expect(input.element.labels?.[0]?.textContent).toContain('*')
    const select = wrapper.get<HTMLSelectElement>('select[name="plan"]')
    expect(select.element.labels?.[0]?.textContent).toContain('プラン')
    expect(select.element.labels?.[0]?.textContent).toContain('*')
  })

  it('shows validation errors accessibly after validation', async () => {
    const { wrapper, form } = mountForm()
    await validate(form)
    const name = wrapper.get('input[name="name"]')
    expect(name.attributes('aria-invalid')).toBe('true')
    const describedBy = name.attributes('aria-describedby')
    expect(describedBy).toContain('-error')
    const errorId = describedBy?.split(' ').find((id) => id.endsWith('-error'))
    expect(errorId).toBeDefined()
    expect(wrapper.get(`#${errorId}`).text()).toBe('名前を入力してください')
  })

  it('does not present errors on a disabled field (form-level or per-field override)', async () => {
    const { wrapper: formDisabled, form: formDisabledForm } = mountForm({ disabled: true })
    await validate(formDisabledForm)
    const nameInDisabledForm = formDisabled.get('input[name="name"]')
    expect(nameInDisabledForm.attributes('aria-invalid')).toBe('false')
    expect(nameInDisabledForm.attributes('aria-describedby')).not.toContain('-error')
    expect(formDisabled.find('#name-error').exists()).toBe(false)

    const { wrapper: fieldDisabled, form: fieldDisabledForm } = mountForm({ overrides: { name: { disabled: true } } })
    await validate(fieldDisabledForm)
    const nameField = fieldDisabled.get('input[name="name"]')
    expect(nameField.attributes('aria-invalid')).toBe('false')
    expect(nameField.attributes('aria-describedby')).not.toContain('-error')
    expect(fieldDisabled.find('#name-error').exists()).toBe(false)
    // An unrelated, non-disabled field still presents its own error.
    expect(fieldDisabled.get('select[name="plan"]').attributes('aria-invalid')).toBe('true')
  })

  it('honours per-field overrides for hidden, disabled, label, helper, placeholder and options', () => {
    const { wrapper } = mountForm({
      overrides: {
        bio: { hidden: true },
        age: { disabled: true },
        name: { label: 'フルネーム', helper: '本名を入力', placeholder: '例: 山田太郎' },
        plan: { options: [{ value: 'enterprise', label: '法人' }] }
      }
    })
    expect(wrapper.find('textarea[name="bio"]').exists()).toBe(false)
    expect(wrapper.get('input[name="age"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('label[for="name"]').text()).toContain('フルネーム')
    expect(wrapper.text()).toContain('本名を入力')
    expect(wrapper.get('input[name="name"]').attributes('placeholder')).toBe('例: 山田太郎')
    const planOptionsRendered = wrapper.findAll('select[name="plan"] option').map((option) => option.text())
    expect(planOptionsRendered).toEqual(['選択してください', '法人'])
  })

  it('renders rows, collapsible sections and named layout slots', () => {
    const { wrapper } = mountForm({ slots: { 'slot:extra': () => h('p', 'EXTRA CONTENT') } })
    const row = wrapper.get('input[name="age"]').element.closest('.grid.gap-4.md\\:grid-cols-2')
    expect(row).not.toBeNull()
    expect(row?.querySelector('select[name="plan"]')).not.toBeNull()

    const details = wrapper.get('details')
    expect(details.get('summary').text()).toBe('profile')
    expect(details.text()).toContain('詳細情報')
    expect(details.find('textarea[name="bio"]').exists()).toBe(true)

    expect(wrapper.text()).toContain('EXTRA CONTENT')
  })

  it('supports before/after/field slots as an escape hatch', () => {
    const { wrapper } = mountForm({
      slots: {
        'before:name': () => h('p', { class: 'before-name' }, 'BEFORE'),
        'after:name': () => h('p', { class: 'after-name' }, 'AFTER'),
        'field:plan': () => h('div', { class: 'custom-plan' }, 'CUSTOM PLAN CONTROL')
      }
    })
    expect(wrapper.find('.before-name').exists()).toBe(true)
    expect(wrapper.find('.after-name').exists()).toBe(true)
    expect(wrapper.find('.custom-plan').exists()).toBe(true)
    expect(wrapper.find('select[name="plan"]').exists()).toBe(false)
  })

  it('disables every control when the form-level disabled prop is set', () => {
    const { wrapper } = mountForm({ disabled: true })
    expect(wrapper.get('input[name="name"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('textarea[name="bio"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('select[name="plan"]').attributes('disabled')).toBeDefined()
  })

  it('renders a text prefix and an override-able suffix', async () => {
    const { wrapper, form } = mountForm({ overrides: { website: { suffix: '.example.com' } } })
    const website = wrapper.get('input[name="website"]')
    expect(website.element.parentElement?.textContent).toContain('https://')
    expect(website.element.parentElement?.textContent).toContain('.example.com')
    await website.setValue('my-site')
    expect(getInput(form).website).toBe('my-site')
  })

  it('renders a card-variant checkbox with its description', () => {
    const { wrapper } = mountForm()
    expect(wrapper.text()).toContain('案内を受け取る')
    expect(wrapper.text()).toContain('いつでも配信停止できます。')
    expect(wrapper.get('input[name="cardAgree"]').element.closest('label')?.className).toContain('border')
  })

  it('keeps a removed select value visible and disabled when keepUnavailableValue is set', async () => {
    const { wrapper } = mountForm({ input: { ...initialInput(), favoriteColor: 'obsolete' } })
    const option = wrapper.get('select[name="favoriteColor"] option[value="obsolete"]')
    expect(option.text()).toContain('（現在は選べません）')
    expect(option.attributes('disabled')).toBeDefined()
    expect(wrapper.get<HTMLSelectElement>('select[name="favoriteColor"]').element.value).toBe('obsolete')
  })

  it('renders a removed checkboxGroup selection as an extra, uncheckable-but-removable option and retains focus when it is removed', async () => {
    const { wrapper, form } = mountForm({
      attachToBody: true,
      input: { ...initialInput(), interests: ['obsolete-interest', 'sports'] }
    })
    const checkboxes = wrapper.findAll<HTMLInputElement>('input[name="interests"]')
    // The two current options, plus the obsolete one appended at the end.
    expect(checkboxes).toHaveLength(3)
    const obsolete = checkboxes.find((checkbox) => checkbox.element.value === 'obsolete-interest')
    if (!obsolete) throw new Error('Expected the obsolete interest checkbox')
    expect(obsolete.element.checked).toBe(true)
    expect(obsolete.element.closest('label')?.textContent).toContain('（現在は選べません）')
    const nextAvailable = checkboxes.find((checkbox) => checkbox.element.value === 'sports')
    if (!nextAvailable) throw new Error('Expected the sports checkbox')

    obsolete.element.focus()
    await obsolete.setValue(false)
    // Removing the obsolete option removes its control entirely; focus moves to the next
    // available (non-disabled) checkbox in the same group instead of falling back to the body.
    expect(wrapper.findAll('input[name="interests"]')).toHaveLength(2)
    expect(document.activeElement).toBe(nextAvailable.element)
    expect(getInput(form).interests).toEqual(['sports'])
  })

  it('renders rich checkboxGroup options with a description and respects loading/empty overrides', () => {
    const { wrapper } = mountForm()
    const documentLabel = wrapper.get('input[name="documents"]').element.closest('label')
    expect(documentLabel?.querySelector('strong')?.textContent).toBe('資料A')
    expect(documentLabel?.textContent).toContain('資料Aの説明')

    const loading = mountForm({ overrides: { documents: { loading: true, loadingMessage: '読込中です' } } })
    expect(loading.wrapper.text()).toContain('読込中です')
    expect(loading.wrapper.find('input[name="documents"]').exists()).toBe(false)

    const empty = mountForm({ overrides: { documents: { options: [], emptyMessage: '資料はありません' } } })
    expect(empty.wrapper.text()).toContain('資料はありません')
    expect(empty.wrapper.find('input[name="documents"]').exists()).toBe(false)
  })

  it('renders static heading and read-only display layout items', () => {
    const { wrapper } = mountForm({ displayValues: { studentId: '2026001' } })
    expect(wrapper.get('h2').text()).toBe('追加情報')
    expect(wrapper.text()).toContain('任意項目です')
    const display = wrapper.get('input[name="studentId"]')
    expect(display.element.value).toBe('2026001')
    expect(display.attributes('readonly')).toBeDefined()
    expect(wrapper.text()).toContain('学籍番号')
  })

  it('uses a custom required marker when requiredLabel is set', () => {
    const { wrapper } = mountForm({ requiredLabel: '必須' })
    expect(wrapper.get('label[for="name"]').text()).toContain('必須')
    expect(wrapper.get('label[for="name"]').text()).not.toContain('*')
  })

  it('emits fieldBlur/fieldChange for a registered control', async () => {
    const blurred: string[] = []
    const changed: string[] = []
    const { wrapper } = mountForm({
      onFieldBlur: (key) => blurred.push(key),
      onFieldChange: (key) => changed.push(key)
    })
    const name = wrapper.get('input[name="name"]')
    await name.trigger('focus')
    await name.setValue('変更後')
    await name.trigger('change')
    await name.trigger('blur')
    expect(changed).toContain('name')
    expect(blurred).toContain('name')
  })

  describe("the 'settings' variant", () => {
    it('renders one accessible label per plain field, not a duplicate', () => {
      const { wrapper } = mountForm({ variant: 'settings', requiredLabel: '必須' })
      const nameLabels = wrapper.findAll('label').filter((label) => label.text().includes('名前'))
      expect(nameLabels).toHaveLength(1)
      expect(nameLabels[0]?.attributes('for')).toBe('name')
      expect(nameLabels[0]?.text()).toContain('必須')
    })

    it('keeps before/after slot content in the field column, not the label column', () => {
      const { wrapper } = mountForm({
        variant: 'settings',
        slots: {
          'after:name': () => h('a', { class: 'after-name-link' }, 'リンク')
        }
      })
      const row = wrapper
        .get('input[name="name"]')
        .element.closest('.grid.md\\:grid-cols-\\[14rem_minmax\\(0\\,1fr\\)\\]')
      if (!row) throw new Error('Expected the settings row grid')
      // Exactly two direct grid children: the label column and the field column.
      expect(row.children).toHaveLength(2)
      const fieldColumn = row.children[1]
      expect(fieldColumn?.querySelector('input[name="name"]')).not.toBeNull()
      expect(fieldColumn?.querySelector('.after-name-link')).not.toBeNull()
    })

    it('names a fieldset control through aria-labelledby instead of a duplicated legend', () => {
      const { wrapper } = mountForm({ variant: 'settings' })
      const fieldset = wrapper.get('input[name="agree"]').element.closest('fieldset')
      if (!fieldset) throw new Error('Expected a fieldset ancestor')
      expect(fieldset.querySelector('legend')).toBeNull()
      const labelledBy = fieldset.getAttribute('aria-labelledby')
      expect(labelledBy).toBeTruthy()
      const labelEl = wrapper.get(`#${labelledBy}`)
      expect(labelEl.text()).toContain('確認')
    })

    it('applies a row testId and renders a read-only display entry inside a row', () => {
      const { wrapper } = mountForm({
        variant: 'settings',
        displayValues: { studentId: '2026001' },
        layout: [{ row: ['age', { display: 'studentId', label: '学籍番号' }], testId: 'settings-pair-row' }]
      })
      expect(wrapper.get('[data-testid="settings-pair-row"]').find('input[name="age"]').exists()).toBe(true)
      const display = wrapper.get('input[name="studentId"]')
      expect(display.element.value).toBe('2026001')
      expect(display.attributes('readonly')).toBeDefined()
      expect(wrapper.get('[data-testid="settings-pair-row"]').text()).toContain('学籍番号')
    })

    it('overrides a display item label at runtime through displayLabels', () => {
      const { wrapper } = mountForm({
        variant: 'settings',
        displayValues: { studentId: '2026001' },
        displayLabels: { studentId: '学生番号（運用設定）' },
        layout: [{ display: 'studentId', label: '学籍番号' }]
      })
      expect(wrapper.text()).toContain('学生番号（運用設定）')
      expect(wrapper.text()).not.toContain('学籍番号')
    })
  })
})
