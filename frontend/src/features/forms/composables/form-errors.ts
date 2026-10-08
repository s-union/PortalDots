import { focus, getDeepErrorEntries, getInput, setErrors, type FormStore } from '@formisch/vue'
import { unwrapValidationError } from '@/lib/api/validation'
import {
  equal,
  fields,
  read,
  type SyncedFormSchema,
  type SyncedInput,
  type SyncedFieldPath
} from './server-synced-form-fields'

export function setSubmitErrors(
  form: FormStore<SyncedFormSchema>,
  error: unknown,
  message: string,
  submitted: SyncedInput
) {
  setErrors(form, { errors: [message] })
  const validation = unwrapValidationError(error)
  for (const field of fields(submitted)) {
    const messages = validation?.errors[field.path.join('.')]
    if (
      messages?.length &&
      equal(getInput<SyncedFormSchema, SyncedFieldPath>(form, field), read(submitted, field.path))
    )
      setErrors<SyncedFormSchema, SyncedFieldPath>(form, { ...field, errors: [messages[0], ...messages.slice(1)] })
  }
}

export function focusSubmitErrors(form: FormStore<SyncedFormSchema>, order: readonly SyncedFieldPath[] = []) {
  const paths = [...order, ...fields(getInput(form)).map((field) => field.path)]
  const invalid = new Set(getDeepErrorEntries(form).map((error) => JSON.stringify(error.path)))
  for (const path of paths) {
    if (invalid.has(JSON.stringify(path))) {
      const previous = document.activeElement
      focus<SyncedFormSchema, SyncedFieldPath>(form, { path })
      const active = document.activeElement
      const name = active?.getAttribute('name')
      if (
        active !== previous ||
        active?.getAttribute('data-field-path') === JSON.stringify(path) ||
        name === path.join('.') ||
        name === JSON.stringify(path)
      )
        return
    }
  }
}
