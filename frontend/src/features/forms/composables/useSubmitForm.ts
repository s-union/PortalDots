import { getInput, handleSubmit, setErrors, useForm, type ValidationMode } from '@formisch/vue'
import { computed, nextTick, shallowRef, toValue, type MaybeRefOrGetter } from 'vue'
import type * as v from 'valibot'
import { extractValidationMessage } from '@/lib/api/validation'
import type { SchemaFormInput, SyncedFormSchema } from './useServerSyncedForm'
import { focusSubmitErrors, setSubmitErrors } from './form-errors'

export function useSubmitForm<T extends SyncedFormSchema>(options: {
  schema: MaybeRefOrGetter<T>
  initialInput: SchemaFormInput<T>
  submit: (input: v.InferOutput<T>) => Promise<void | string>
  disabled?: MaybeRefOrGetter<boolean>
  errorMessage?: (error: unknown) => string
  validateOn?: ValidationMode
}) {
  const form = useForm({
    get schema() {
      return toValue(options.schema)
    },
    initialInput: options.initialInput,
    validate: options.validateOn ?? 'blur',
    revalidate: 'input'
  })
  const successMessage = shallowRef('')
  async function submitEvent(event?: Event) {
    event?.preventDefault()
    if (form.isSubmitting || toValue(options.disabled)) return
    setErrors(form, { errors: null })
    successMessage.value = ''
    const submitted = getInput(form)
    await handleSubmit(form, async (input) => {
      try {
        successMessage.value = (await options.submit(input)) ?? ''
      } catch (error) {
        setSubmitErrors(
          form,
          error,
          options.errorMessage?.(error) ?? extractValidationMessage(error, '保存に失敗しました。'),
          submitted
        )
      }
    })()
    await nextTick()
    if (form.errors) focusSubmitErrors(form)
  }
  return { form, submitEvent, successMessage, errorMessage: computed(() => form.errors?.[0] ?? '') }
}
