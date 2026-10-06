import {
  focus,
  getDirtyInput,
  getDeepErrorEntries,
  getInput,
  handleSubmit,
  isDirty,
  reset,
  setErrors,
  setInput,
  useForm,
  validate,
  type DeepPartial,
  type FormStore,
  type ValidationMode
} from '@formisch/vue'
import { onScopeDispose, toValue, watch, type MaybeRefOrGetter } from 'vue'
import type * as v from 'valibot'
import { unwrapValidationError } from '@/lib/api/validation'
import {
  fields,
  read,
  write,
  equal,
  compatible,
  type SyncedFormSchema,
  type SyncedFieldPath
} from './server-synced-form-fields'
import { createSubmissionState, type SubmissionRequest } from './server-synced-form-state'

export type { SyncedInput, SyncedFormSchema, SyncedFieldPath } from './server-synced-form-fields'
export type SchemaFormInput<T extends SyncedFormSchema> = v.InferInput<T> & DeepPartial<v.InferInput<T>>
export interface SchemaFormSnapshot<T extends SyncedFormSchema> {
  input: SchemaFormInput<T>
  dirtyInput: DeepPartial<v.InferInput<T>> | undefined
  sourceKey: string | null
  source: unknown
}
export interface SchemaFormSaveResult<T extends SyncedFormSchema> {
  input: SchemaFormInput<T>
  sourceKey: string | null
}
interface Options<T extends SyncedFormSchema> {
  schema: MaybeRefOrGetter<T>
  input: MaybeRefOrGetter<SchemaFormInput<T>>
  sourceKey: MaybeRefOrGetter<string | null>
  source: () => unknown
  saveInput: (
    input: v.InferOutput<T>,
    event: SubmitEvent | undefined,
    schema: T
  ) => Promise<SchemaFormSaveResult<T> | null>
  disabled?: MaybeRefOrGetter<boolean>
  paused?: MaybeRefOrGetter<boolean>
  mode?: 'submit' | 'autosave'
  focusOrder?: MaybeRefOrGetter<readonly SyncedFieldPath<NoInfer<T>>[]>
  validateOn?: ValidationMode
  onSaved?: () => void
  errorMessage?: (error: unknown) => string
  initialState?: SchemaFormSnapshot<T>
}
type Context<T extends SyncedFormSchema> = Omit<SchemaFormSnapshot<T>, 'dirtyInput'>

export function useServerSyncedForm<T extends SyncedFormSchema>(options: Options<T>) {
  let context: Context<T> = {
    input: structuredClone(toValue(options.input)),
    sourceKey: options.initialState ? options.initialState.sourceKey : toValue(options.sourceKey),
    source: options.source()
  }
  if (options.initialState && Object.is(options.initialState.source, context.source)) {
    for (const field of fields(context.input)) {
      const previous = read(options.initialState.input, field.path)
      if (compatible(field.initialInput, previous)) write(context.input, field.path, previous)
    }
  }
  const form = useForm({
    get schema() {
      return toValue(options.schema)
    },
    initialInput: context.input,
    validate: options.validateOn ?? 'blur',
    revalidate: 'input'
  })
  const fieldStore: FormStore<SyncedFormSchema> = form
  for (const field of fields(toValue(options.input))) {
    const previous = read(options.initialState?.dirtyInput, field.path)
    if (compatible(field.initialInput, previous))
      setInput<SyncedFormSchema, SyncedFieldPath>(fieldStore, { ...field, input: previous })
  }
  const submission = createSubmissionState<T>()
  const { transition } = submission
  function isCurrent(request: SubmissionRequest) {
    return submission.current.status !== 'disposed' && request.context === context
  }
  onScopeDispose(() => transition({ type: 'dispose' }))

  function accept(input: SchemaFormInput<T>, key: string | null, submitted?: unknown, replace = false) {
    context.input = input
    context.sourceKey = key
    for (const field of fields(input)) {
      const keepInput =
        !replace &&
        (submitted
          ? !equal(getInput<SyncedFormSchema, SyncedFieldPath>(fieldStore, field), read(submitted, field.path))
          : isDirty<SyncedFormSchema, SyncedFieldPath>(fieldStore, field))
      reset<SyncedFormSchema, SyncedFieldPath>(fieldStore, {
        ...field,
        keepInput,
        keepErrors: keepInput,
        keepTouched: keepInput,
        keepEdited: keepInput
      })
    }
    if (form.isSubmitted && form.isDirty && submission.current.status !== 'failed')
      void validate(form, { shouldFocus: false })
  }
  watch([options.source, () => toValue(options.sourceKey)], ([source, key]) => {
    const input = toValue(options.input)
    if (context.sourceKey !== null && context.sourceKey !== key) {
      // Replacing the context invalidates old saves, even if the same key is selected again.
      context = { input, sourceKey: key, source }
      if (!submission.active) {
        reset(form, { initialInput: input })
        transition({ type: 'idle' })
        return
      }
      accept(input, key, undefined, true)
    } else {
      context.source = source
      const current = submission.active
      const state = submission.current
      // Field resets interrupt validation; repeat the requested save with fresh clean values.
      if (current?.status === 'validating')
        transition({ type: 'queue', request: state.status === 'queued' ? state.request : current.request })
      accept(input, key)
    }
  })
  const submit = handleSubmit(form, async (input) => {
    const current = submission.active
    if (!current || !isCurrent(current.request)) return
    transition({ type: 'saving' })
    try {
      const result = await options.saveInput(input, current.request.event, current.schema)
      if (!isCurrent(current.request)) return
      if (!result) {
        transition({ type: 'failed' })
        return
      }
      const key = toValue(options.sourceKey)
      if (key !== current.request.key && !(current.request.key === null && key === result.sourceKey)) return
      accept(result.input, result.sourceKey, current.input)
      options.onSaved?.()
    } catch (error) {
      if (!isCurrent(current.request)) return
      transition({ type: 'failed' })
      setErrors(form, {
        errors: [options.errorMessage?.(error) ?? (error instanceof Error ? error.message : '保存に失敗しました。')]
      })
      const validation = unwrapValidationError(error)
      for (const field of fields(context.input)) {
        const messages = validation?.errors[field.path.join('.')]
        const first = messages?.[0]
        if (
          messages &&
          first &&
          equal(getInput<SyncedFormSchema, SyncedFieldPath>(fieldStore, field), read(current.input, field.path))
        )
          setErrors<SyncedFormSchema, SyncedFieldPath>(fieldStore, { ...field, errors: [first, ...messages.slice(1)] })
      }
    }
  })
  async function submitEvent(event?: SubmitEvent) {
    event?.preventDefault()
    if (toValue(options.disabled) || submission.current.status === 'disposed') return
    let request: SubmissionRequest | undefined = { context, event, key: toValue(options.sourceKey) }
    if (submission.active || toValue(options.paused)) {
      if (options.mode === 'autosave') transition({ type: 'queue', request })
      return
    }
    while (request && isCurrent(request)) {
      if (options.mode === 'autosave' && !form.isDirty) {
        if (submission.current.status === 'queued') transition({ type: 'idle' })
        return
      }
      request = { ...request, key: toValue(options.sourceKey) }
      transition({
        type: 'start',
        active: { status: 'validating', request, input: getInput(form), schema: toValue(options.schema) }
      })
      setErrors(form, { errors: null })
      await submit()
      const finished = submission.current
      if (finished.status === 'disposed' || finished.status === 'failed') return
      request = finished.status === 'queued' ? finished.request : undefined
      transition({ type: 'idle' })
      if (request && isCurrent(request) && toValue(options.paused)) {
        transition({ type: 'queue', request })
        break
      }
      if (request && toValue(options.disabled)) return
    }
    const focusOrder = toValue(options.focusOrder)
    if (!focusOrder?.length) return
    const invalidPaths = new Set(getDeepErrorEntries(form).map((error) => JSON.stringify(error.path)))
    for (const path of focusOrder) {
      if (invalidPaths.has(JSON.stringify(path))) {
        focus<SyncedFormSchema, SyncedFieldPath>(fieldStore, { path })
        break
      }
    }
  }
  watch(
    () => toValue(options.paused),
    (paused) => {
      const state = submission.current
      if (!paused && state.status === 'queued' && !state.active) void submitEvent(state.request.event)
    }
  )
  function getSnapshot(): SchemaFormSnapshot<T> {
    return { ...context, dirtyInput: getDirtyInput(form) }
  }
  return { form, getSnapshot, submitEvent }
}
