import {
  focus,
  getDirtyInput,
  getErrors,
  getInput,
  handleSubmit,
  isDirty,
  reset,
  setInput,
  useForm,
  type DeepPartial,
  type FormStore,
  type ValidationMode
} from '@formisch/vue'
import { onScopeDispose, toValue, watch, type MaybeRefOrGetter } from 'vue'
import type * as v from 'valibot'

type FieldInput = string | string[] | undefined
export type GroupedFormInput = Record<string, Record<string, FieldInput>>
export type GroupedFormSchema = v.GenericSchema<GroupedFormInput>
export type SchemaFormInput<TSchema extends GroupedFormSchema> = v.InferInput<TSchema> &
  DeepPartial<v.InferInput<TSchema>>
export type GroupedFieldPath = readonly [string, string]

export interface SchemaFormSnapshot<TSchema extends GroupedFormSchema> {
  input: SchemaFormInput<TSchema>
  dirtyInput: DeepPartial<v.InferInput<TSchema>> | undefined
  sourceKey: string | null
  source: unknown
}

export interface SchemaFormSaveResult<TSchema extends GroupedFormSchema> {
  input: SchemaFormInput<TSchema>
  sourceKey: string | null
}

interface UseSchemaFormOptions<TSchema extends GroupedFormSchema> {
  schema: MaybeRefOrGetter<TSchema>
  input: MaybeRefOrGetter<SchemaFormInput<TSchema>>
  sourceKey: MaybeRefOrGetter<string | null>
  source: () => unknown
  disabled: MaybeRefOrGetter<boolean>
  focusOrder: MaybeRefOrGetter<readonly GroupedFieldPath[]>
  saveInput: (
    input: v.InferOutput<TSchema>,
    event: SubmitEvent,
    schema: TSchema
  ) => Promise<SchemaFormSaveResult<TSchema> | null>
  validateOn?: ValidationMode
  onSaved?: () => void
  initialState?: SchemaFormSnapshot<TSchema>
}

function equalInput(a: FieldInput, b: FieldInput): boolean {
  return Array.isArray(a)
    ? Array.isArray(b) && a.length === b.length && a.every((value, index) => value === b[index])
    : a === b
}

function compatibleInput(initial: FieldInput, input: unknown): input is string | string[] {
  return Array.isArray(initial)
    ? Array.isArray(input) && input.every((value) => typeof value === 'string')
    : typeof input === 'string'
}

export function useSchemaForm<TSchema extends GroupedFormSchema>(options: UseSchemaFormOptions<TSchema>) {
  const currentSource = options.source()
  let baselineSource = currentSource
  let baselineInput = structuredClone(toValue(options.input))
  // Carry saved baselines into the current structure, including defaults for newly added fields.
  if (options.initialState && Object.is(options.initialState.source, currentSource)) {
    const baselineFields: GroupedFormInput = baselineInput
    for (const [group, values] of Object.entries(baselineFields)) {
      for (const [name, initial] of Object.entries(values)) {
        const previous = options.initialState.input[group]?.[name]
        if (compatibleInput(initial, previous)) values[name] = previous
      }
    }
  }
  let baselineKey = options.initialState ? options.initialState.sourceKey : toValue(options.sourceKey)
  const form = useForm({
    get schema() {
      return toValue(options.schema)
    },
    initialInput: baselineInput,
    validate: options.validateOn ?? 'blur',
    revalidate: 'input'
  })
  // A typed view of the shared field groups; callers retain their complete schema type.
  const fields: FormStore<GroupedFormSchema> = form
  let revision = 0
  let disposed = false
  onScopeDispose(() => (disposed = true))

  const dirtyInput = options.initialState?.dirtyInput
  for (const [group, values] of Object.entries(toValue(options.input))) {
    for (const [name, initial] of Object.entries(values)) {
      const restored = dirtyInput?.[group]?.[name]
      if (compatibleInput(initial, restored)) {
        setInput(fields, { path: [group, name], input: restored })
      }
    }
  }

  function acceptInput(input: SchemaFormInput<TSchema>, key: string | null, submitted?: GroupedFormInput | null) {
    baselineInput = input
    baselineKey = key
    // Reset fields individually so a refresh never ends an active submission.
    for (const [group, values] of Object.entries(input)) {
      for (const [name, initialInput] of Object.entries(values)) {
        const path = [group, name] as const
        const keepInput =
          submitted === null
            ? false
            : submitted
              ? !equalInput(getInput(fields, { path }), submitted[group]?.[name])
              : isDirty(fields, { path })
        reset(fields, {
          path,
          initialInput,
          keepInput,
          keepErrors: keepInput,
          keepTouched: keepInput,
          keepEdited: keepInput
        })
      }
    }
  }

  watch([options.source, () => toValue(options.sourceKey)], ([source, key]) => {
    baselineSource = source
    const input = toValue(options.input)
    const changedSource = baselineKey !== null && baselineKey !== key
    if (changedSource) revision++
    if (changedSource && !form.isSubmitting) {
      baselineInput = input
      baselineKey = key
      reset(form, { initialInput: input })
    } else {
      acceptInput(input, key, changedSource ? null : undefined)
    }
  })

  const submit = handleSubmit(form, async (input: v.InferOutput<TSchema>, event: SubmitEvent) => {
    const submittedKey = toValue(options.sourceKey)
    const submittedRevision = revision
    const result = await options.saveInput(input, event, toValue(options.schema))
    if (!result || disposed || submittedRevision !== revision) return
    const currentKey = toValue(options.sourceKey)
    if (currentKey !== submittedKey && !(submittedKey === null && currentKey === result.sourceKey)) return
    acceptInput(result.input, result.sourceKey, input)
    options.onSaved?.()
  })

  async function submitEvent(event: SubmitEvent) {
    event.preventDefault()
    if (toValue(options.disabled) || form.isSubmitting) return
    await submit(event)
    if (disposed || form.isSubmitting) return
    for (const path of toValue(options.focusOrder)) {
      if (getErrors(fields, { path })) {
        focus(fields, { path })
        break
      }
    }
  }

  function getSnapshot(): SchemaFormSnapshot<TSchema> {
    return { input: baselineInput, dirtyInput: getDirtyInput(form), sourceKey: baselineKey, source: baselineSource }
  }
  return { form, getSnapshot, submitEvent }
}
