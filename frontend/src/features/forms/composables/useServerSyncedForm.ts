import {
  focus,
  getDirtyInput,
  getErrors,
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
  type PartialValues,
  type ValidationMode
} from '@formisch/vue'
import { onScopeDispose, toValue, watch, type MaybeRefOrGetter } from 'vue'
import type * as v from 'valibot'
import { unwrapValidationError } from '@/lib/api/validation'

type Value = string | string[] | boolean | undefined
export type SyncedInput = Record<string, Value | Record<string, Value>>
export type SyncedFormSchema = v.GenericSchema<SyncedInput, Record<string, unknown>>
export type SchemaFormInput<T extends SyncedFormSchema> = v.InferInput<T> & DeepPartial<v.InferInput<T>>
export type SyncedFieldPath = readonly [string] | readonly [string, string]
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
  focusOrder?: MaybeRefOrGetter<readonly SyncedFieldPath[]>
  validateOn?: ValidationMode
  onSaved?: () => void
  errorMessage?: (error: unknown) => string
  initialState?: SchemaFormSnapshot<T>
}
type Address = { path: readonly [string] } | { path: readonly [string, string] }
type Field = Address & { initialInput: Value }
function fields(input: SyncedInput): Field[] {
  return Object.entries(input).flatMap(([key, value]): Field[] =>
    typeof value === 'object' && !Array.isArray(value)
      ? Object.entries(value).map(([name, initialInput]) => ({ path: [key, name], initialInput }))
      : [{ path: [key], initialInput: value }]
  )
}
function write(input: SyncedInput, path: SyncedFieldPath, value: Value) {
  if (path.length === 1) {
    input[path[0]] = value
    return
  }
  const group = input[path[0]]
  if (typeof group === 'object' && !Array.isArray(group)) group[path[1]] = value
}
function read(input: unknown, path: SyncedFieldPath): unknown {
  let value = input
  for (const key of path)
    value = value && typeof value === 'object' && key in value ? Reflect.get(value, key) : undefined
  return value
}
function equal(a: unknown, b: unknown): boolean {
  return Array.isArray(a)
    ? Array.isArray(b) && a.length === b.length && a.every((item, i) => item === b[i])
    : Object.is(a, b)
}
function compatible(initial: Value, previous: unknown): previous is Exclude<Value, undefined> {
  return Array.isArray(initial)
    ? Array.isArray(previous) && previous.every((item) => typeof item === 'string')
    : typeof initial === 'boolean'
      ? typeof previous === 'boolean'
      : typeof previous === 'string'
}

type Context<T extends SyncedFormSchema> = Omit<SchemaFormSnapshot<T>, 'dirtyInput'>
type Request<T extends SyncedFormSchema> = { context: Context<T>; key: string | null; event?: SubmitEvent }
type Active<T extends SyncedFormSchema> = {
  status: 'validating' | 'saving'
  request: Request<T>
  input: PartialValues<v.InferInput<T>>
  schema: T
}
type State<T extends SyncedFormSchema> =
  | { status: 'idle' | 'failed' | 'disposed' }
  | Active<T>
  | { status: 'queued'; active?: Active<T>; request: Request<T> }
type Action<T extends SyncedFormSchema> =
  | { type: 'start'; active: Active<T> }
  | { type: 'queue'; request: Request<T> }
  | { type: 'saving' | 'idle' | 'failed' | 'dispose' }

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
  let state: State<T> = { status: 'idle' }
  function currentState() {
    return state
  }
  function active() {
    return state.status === 'queued'
      ? state.active
      : state.status === 'validating' || state.status === 'saving'
        ? state
        : undefined
  }
  // Current             Action          Next
  // idle/failed          start           validating
  // validating/saving    queue           queued (retains its active phase)
  // validating/queued    saving          saving/queued
  // active/queued        idle            idle (caller drains the latest queued request)
  // active/queued        failed          failed (no automatic retry)
  // any                  dispose         disposed (terminal)
  function transition(action: Action<T>) {
    if (state.status === 'disposed') return
    switch (action.type) {
      case 'start':
        state = action.active
        break
      case 'queue':
        state = { status: 'queued', active: active(), request: action.request }
        break
      case 'saving': {
        const current = active()
        if (!current) return
        const next: Active<T> = { ...current, status: 'saving' }
        state = state.status === 'queued' ? { ...state, active: next } : next
        break
      }
      case 'dispose':
        state = { status: 'disposed' }
        break
      default:
        state = { status: action.type }
    }
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
    if (form.isSubmitted && form.isDirty && state.status !== 'failed') void validate(form, { shouldFocus: false })
  }
  watch([options.source, () => toValue(options.sourceKey)], ([source, key]) => {
    const input = toValue(options.input)
    if (context.sourceKey !== null && context.sourceKey !== key) {
      // Replacing the context invalidates old saves, even if the same key is selected again.
      context = { input, sourceKey: key, source }
      if (!active()) {
        reset(form, { initialInput: input })
        transition({ type: 'idle' })
        return
      }
      accept(input, key, undefined, true)
    } else {
      context.source = source
      const current = active()
      // Field resets interrupt validation; repeat the requested save with fresh clean values.
      if (current?.status === 'validating')
        transition({ type: 'queue', request: state.status === 'queued' ? state.request : current.request })
      accept(input, key)
    }
  })
  const submit = handleSubmit(form, async (input) => {
    const current = active()
    if (!current || current.request.context !== context) return
    transition({ type: 'saving' })
    try {
      const result = await options.saveInput(input, current.request.event, current.schema)
      if (state.status === 'disposed' || current.request.context !== context) return
      if (!result) {
        transition({ type: 'failed' })
        return
      }
      const key = toValue(options.sourceKey)
      if (key !== current.request.key && !(current.request.key === null && key === result.sourceKey)) return
      accept(result.input, result.sourceKey, current.input)
      options.onSaved?.()
    } catch (error) {
      if (state.status === 'disposed' || current.request.context !== context) return
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
    if (toValue(options.disabled) || state.status === 'disposed') return
    const request = { context, event, key: toValue(options.sourceKey) }
    if (active() || toValue(options.paused)) {
      if (options.mode === 'autosave') transition({ type: 'queue', request })
      return
    }
    if (options.mode === 'autosave' && !form.isDirty) {
      if (state.status === 'queued') transition({ type: 'idle' })
      return
    }
    transition({
      type: 'start',
      active: { status: 'validating', request, input: getInput(form), schema: toValue(options.schema) }
    })
    setErrors(form, { errors: null })
    await submit()
    const finished = currentState()
    if (finished.status === 'disposed' || finished.status === 'failed') return
    const next = finished.status === 'queued' ? finished.request : undefined
    transition({ type: 'idle' })
    if (next && next.context === context && !toValue(options.paused)) {
      await submitEvent(next.event)
      return
    }
    if (next && next.context === context) transition({ type: 'queue', request: next })
    for (const path of toValue(options.focusOrder) ?? []) {
      const address = path.length === 1 ? { path } : { path }
      if (getErrors<SyncedFormSchema, SyncedFieldPath>(fieldStore, address)) {
        focus<SyncedFormSchema, SyncedFieldPath>(fieldStore, address)
        break
      }
    }
  }
  watch(
    () => toValue(options.paused),
    (paused) => {
      if (!paused && state.status === 'queued' && !state.active) void submitEvent(state.request.event)
    }
  )
  function getSnapshot(): SchemaFormSnapshot<T> {
    return { ...context, dirtyInput: getDirtyInput(form) }
  }
  return { form, getSnapshot, submitEvent }
}
