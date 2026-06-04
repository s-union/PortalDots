import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { effectScope, reactive, ref, nextTick } from 'vue'
import * as z from 'zod'
import { useFormValidation } from './useFormValidation'

const testSchema = z.object({
  name: z.string().min(1, '名前を入力してください'),
  email: z.string().email('メールアドレスの形式が正しくありません'),
  age: z.number().min(0, '年齢は0以上で入力してください').optional()
})

describe('useFormValidation', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('initializes with no errors', () => {
    const form = reactive({ name: '', email: '', age: undefined })
    const { fieldErrors, isFormValid } = useFormValidation({
      schema: testSchema,
      form: ref(form)
    })

    expect(Object.keys(fieldErrors.value)).toHaveLength(0)
    expect(isFormValid.value).toBe(false)
  })

  it('validates a single field when touched', async () => {
    const form = reactive({ name: '', email: '', age: undefined })
    const { markTouched, fieldErrors } = useFormValidation({
      schema: testSchema,
      form: ref(form),
      debounceMs: 100
    })

    markTouched('name')
    vi.advanceTimersByTime(100)
    await nextTick()

    expect(fieldErrors.value.name).toBe('名前を入力してください')
  })

  it('clears field error when value becomes valid', async () => {
    const form = reactive({ name: '', email: 'test@example.com', age: undefined })
    const { markTouched, fieldErrors } = useFormValidation({
      schema: testSchema,
      form: ref(form),
      debounceMs: 100
    })

    markTouched('name')
    vi.advanceTimersByTime(100)
    await nextTick()
    expect(fieldErrors.value.name).toBe('名前を入力してください')

    form.name = 'Valid Name'
    // Wait for the watch to trigger and debounce to complete
    vi.advanceTimersByTime(100)
    await nextTick()
    // The watcher triggers debouncedValidateField which has its own timer
    vi.advanceTimersByTime(100)
    await nextTick()

    expect(fieldErrors.value.name).toBeUndefined()
  })

  it('validates all fields when validateAll is called', async () => {
    const form = reactive({ name: '', email: 'invalid', age: undefined })
    const { validateAll, fieldErrors, touchedFields } = useFormValidation({
      schema: testSchema,
      form: ref(form)
    })

    const isValid = validateAll()

    expect(isValid).toBe(false)
    expect(fieldErrors.value.name).toBe('名前を入力してください')
    expect(fieldErrors.value.email).toBe('メールアドレスの形式が正しくありません')
    expect(touchedFields.value.has('name')).toBe(true)
    expect(touchedFields.value.has('email')).toBe(true)
  })

  it('returns true from validateAll when form is valid', () => {
    const form = reactive({ name: 'Test', email: 'test@example.com', age: 25 })
    const { validateAll, fieldErrors } = useFormValidation({
      schema: testSchema,
      form: ref(form)
    })

    const isValid = validateAll()

    expect(isValid).toBe(true)
    expect(Object.keys(fieldErrors.value)).toHaveLength(0)
  })

  it('clears all errors when clearErrors is called', async () => {
    const form = reactive({ name: '', email: 'invalid', age: undefined })
    const { validateAll, clearErrors, fieldErrors } = useFormValidation({
      schema: testSchema,
      form: ref(form)
    })

    validateAll()
    expect(Object.keys(fieldErrors.value).length).toBeGreaterThan(0)

    clearErrors()
    expect(Object.keys(fieldErrors.value)).toHaveLength(0)
  })

  it('clears specific field error when clearFieldError is called', async () => {
    const form = reactive({ name: '', email: 'invalid', age: undefined })
    const { validateAll, clearFieldError, fieldErrors } = useFormValidation({
      schema: testSchema,
      form: ref(form)
    })

    validateAll()
    expect(fieldErrors.value.name).toBeDefined()
    expect(fieldErrors.value.email).toBeDefined()

    clearFieldError('name')
    expect(fieldErrors.value.name).toBeUndefined()
    expect(fieldErrors.value.email).toBeDefined()
  })

  it('getFieldError returns error message for a field', async () => {
    const form = reactive({ name: '', email: 'test@example.com', age: undefined })
    const { validateAll, getFieldError } = useFormValidation({
      schema: testSchema,
      form: ref(form)
    })

    validateAll()

    expect(getFieldError('name')).toBe('名前を入力してください')
    expect(getFieldError('email')).toBeUndefined()
  })

  it('hasFieldError returns boolean for field error state', async () => {
    const form = reactive({ name: '', email: 'test@example.com', age: undefined })
    const { validateAll, hasFieldError } = useFormValidation({
      schema: testSchema,
      form: ref(form)
    })

    validateAll()

    expect(hasFieldError('name')).toBe(true)
    expect(hasFieldError('email')).toBe(false)
  })

  it('debounces validation calls', async () => {
    const form = reactive({ name: '', email: 'test@example.com', age: undefined })
    const { markTouched, fieldErrors } = useFormValidation({
      schema: testSchema,
      form: ref(form),
      debounceMs: 300
    })

    markTouched('name')

    // Error should not appear immediately
    expect(fieldErrors.value.name).toBeUndefined()

    // After debounce time
    vi.advanceTimersByTime(300)
    await nextTick()

    expect(fieldErrors.value.name).toBe('名前を入力してください')
  })

  it('clears pending debounce timers when disposed', async () => {
    const form = reactive({ name: '', email: 'test@example.com', age: undefined })
    const scope = effectScope()
    let fieldErrors = ref<Record<string, string>>({})

    scope.run(() => {
      const formValidation = useFormValidation({
        schema: testSchema,
        form: ref(form),
        debounceMs: 300
      })
      fieldErrors = formValidation.fieldErrors
      formValidation.markTouched('name')
    })

    scope.stop()

    vi.advanceTimersByTime(300)
    await nextTick()

    expect(fieldErrors.value.name).toBeUndefined()
  })

  it('works with plain reactive form object', async () => {
    const form = reactive({ name: '', email: 'test@example.com', age: undefined })
    const { validateAll, fieldErrors } = useFormValidation({
      schema: testSchema,
      form
    })

    validateAll()

    expect(fieldErrors.value.name).toBe('名前を入力してください')
  })

  it('isFormValid reflects current validation state', () => {
    const form = reactive({ name: '', email: 'test@example.com', age: undefined })
    const { isFormValid } = useFormValidation({
      schema: testSchema,
      form: ref(form)
    })

    expect(isFormValid.value).toBe(false)

    form.name = 'Test'
    expect(isFormValid.value).toBe(true)

    form.email = 'invalid'
    expect(isFormValid.value).toBe(false)
  })
})
