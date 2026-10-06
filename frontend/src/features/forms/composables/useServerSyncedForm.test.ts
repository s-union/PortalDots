import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { effectScope, nextTick, ref, shallowRef } from 'vue'
import { getInput, setInput } from '@formisch/vue'
import * as v from 'valibot'
import {
  useServerSyncedForm,
  type SyncedInput,
  type SyncedFormSchema,
  type SyncedFieldPath,
  type SchemaFormSaveResult,
  type SchemaFormSnapshot
} from './useServerSyncedForm'

interface Layout {
  name: string
  schema: SyncedFormSchema
  input: (name: string | undefined, description?: string) => SyncedInput
  field: { path: readonly [string] } | { path: readonly [string, string] }
}
const nameSchema = v.optional(v.pipe(v.string(), v.trim()))
const layouts: Layout[] = [
  {
    name: 'flat',
    schema: v.object({ name: nameSchema, description: v.string() }),
    input: (name, description = 'baseline') => ({ name, description }),
    field: { path: ['name'] }
  },
  {
    name: 'grouped',
    schema: v.object({ text: v.object({ name: nameSchema, description: v.string() }) }),
    input: (name, description = 'baseline') => ({ text: { name, description } }),
    field: { path: ['text', 'name'] }
  }
]
const scopes: ReturnType<typeof effectScope>[] = []
afterEach(() => {
  for (const scope of scopes.splice(0)) scope.stop()
})

function setup(
  layout: Layout,
  options: {
    mode?: 'submit' | 'autosave'
    key?: string | null
    initialState?: SchemaFormSnapshot<SyncedFormSchema>
  } = {}
) {
  const source = shallowRef({ key: options.key === undefined ? 'a' : options.key, input: layout.input('baseline') })
  const paused = ref(false)
  const save =
    vi.fn<
      (
        input: v.InferOutput<SyncedFormSchema>,
        event: SubmitEvent | undefined,
        schema: SyncedFormSchema
      ) => Promise<SchemaFormSaveResult<SyncedFormSchema> | null>
    >()
  const saved = vi.fn()
  const scope = effectScope()
  scopes.push(scope)
  const session = scope.run(() =>
    useServerSyncedForm({
      schema: layout.schema,
      input: () => source.value.input,
      source: () => source.value,
      sourceKey: () => source.value.key,
      paused,
      mode: options.mode,
      initialState: options.initialState,
      onSaved: saved,
      saveInput: save
    })
  )
  if (!session) throw new Error('Expected an active form scope')
  return {
    ...session,
    source,
    paused,
    save,
    saved,
    scope,
    name: () => getInput<SyncedFormSchema, SyncedFieldPath>(session.form, layout.field),
    edit: (name: string) => setInput<SyncedFormSchema, SyncedFieldPath>(session.form, { ...layout.field, input: name })
  }
}

describe.each(layouts)('useServerSyncedForm ($name)', (layout) => {
  it('accepts normalization using the raw submitted snapshot and preserves later edits', async () => {
    const session = setup(layout)
    const pending = Promise.withResolvers<SchemaFormSaveResult<SyncedFormSchema>>()
    session.save.mockReturnValueOnce(pending.promise)
    session.edit('  first  ')
    const saving = session.submitEvent()
    await flushPromises()
    expect(session.save.mock.calls[0]?.[0]).toEqual(layout.input('first'))
    pending.resolve({ input: layout.input('first'), sourceKey: 'a' })
    await saving
    expect(session.name()).toBe('first')
    expect(session.form.isDirty).toBe(false)

    const second = Promise.withResolvers<SchemaFormSaveResult<SyncedFormSchema>>()
    session.save.mockReturnValueOnce(second.promise)
    session.edit('second')
    const savingAgain = session.submitEvent()
    await flushPromises()
    session.edit('later edit')
    session.source.value = { key: 'a', input: layout.input('second', 'server description') }
    await nextTick()
    second.resolve({ input: layout.input('second', 'server description'), sourceKey: 'a' })
    await savingAgain
    expect(session.name()).toBe('later edit')
    expect(getInput(session.form)).toEqual(layout.input('later edit', 'server description'))
    expect(session.form.isDirty).toBe(true)
  })

  it('retries interrupted validation with the original native submitter', async () => {
    const session = setup(layout)
    const button = document.createElement('button')
    button.value = 'continue'
    const event = new SubmitEvent('submit', { submitter: button, cancelable: true })
    session.save.mockResolvedValue({ input: layout.input('draft', 'refreshed'), sourceKey: 'a' })
    session.edit('draft')
    const saving = session.submitEvent(event)
    session.source.value = { key: 'a', input: layout.input('baseline', 'refreshed') }
    await saving
    expect(event.defaultPrevented).toBe(true)
    expect(session.save.mock.calls).toEqual([[layout.input('draft', 'refreshed'), event, layout.schema]])
    expect(session.save.mock.calls[0]?.[1]?.submitter?.getAttribute('value')).toBe('continue')
    expect(session.name()).toBe('draft')
    expect(session.form.isDirty).toBe(false)
    expect(session.saved).toHaveBeenCalledTimes(1)
  })

  it('ignores a response from the old scope after switching away and back to the same key', async () => {
    const session = setup(layout)
    const pending = Promise.withResolvers<SchemaFormSaveResult<SyncedFormSchema>>()
    session.save.mockReturnValueOnce(pending.promise)
    session.edit('old submission')
    const saving = session.submitEvent()
    await flushPromises()
    session.source.value = { key: 'b', input: layout.input('other source') }
    await nextTick()
    session.source.value = { key: 'a', input: layout.input('latest source') }
    await nextTick()
    session.edit('current draft')
    pending.resolve({ input: layout.input('old submission'), sourceKey: 'a' })
    await saving
    expect(session.name()).toBe('current draft')
    expect(session.getSnapshot().input).toEqual(layout.input('latest source'))
    expect(session.form.isDirty).toBe(true)
    expect(session.saved).not.toHaveBeenCalled()
  })

  it('does not accept a creation response after props select an unrelated created source', async () => {
    const session = setup(layout, { key: null })
    const pending = Promise.withResolvers<SchemaFormSaveResult<SyncedFormSchema>>()
    session.save.mockReturnValueOnce(pending.promise)
    session.edit('creating')
    const saving = session.submitEvent()
    await flushPromises()
    session.source.value = { key: 'unrelated', input: layout.input('other source') }
    await nextTick()
    pending.resolve({ input: layout.input('created'), sourceKey: 'created' })
    await saving
    expect(session.name()).toBe('creating')
    expect(session.getSnapshot().sourceKey).toBe('unrelated')
    expect(session.saved).not.toHaveBeenCalled()
  })

  it('discards queued retries on failure and saves the latest input only after explicit retry', async () => {
    const session = setup(layout, { mode: 'autosave' })
    const pending = Promise.withResolvers<SchemaFormSaveResult<SyncedFormSchema>>()
    session.save.mockReturnValueOnce(pending.promise)
    session.edit('first')
    const saving = session.submitEvent()
    await flushPromises()
    session.edit('latest')
    await session.submitEvent()
    session.paused.value = true
    pending.reject(new Error('save failed'))
    await saving
    session.paused.value = false
    await flushPromises()
    expect(session.name()).toBe('latest')
    expect(session.form.errors).toEqual(['save failed'])
    expect(session.save).toHaveBeenCalledTimes(1)
    session.save.mockResolvedValue({ input: layout.input('latest'), sourceKey: 'a' })
    await session.submitEvent()
    expect(session.name()).toBe('latest')
    expect(session.form.isDirty).toBe(false)
    expect(session.form.errors).toBeNull()
    expect(session.save).toHaveBeenCalledTimes(2)
  })

  it('ignores late results and queued autosaves after disposal', async () => {
    const session = setup(layout, { mode: 'autosave' })
    const pending = Promise.withResolvers<SchemaFormSaveResult<SyncedFormSchema>>()
    session.save.mockReturnValueOnce(pending.promise)
    session.edit('first')
    const saving = session.submitEvent()
    await flushPromises()
    session.edit('latest')
    await session.submitEvent()
    session.scope.stop()
    pending.resolve({ input: layout.input('first'), sourceKey: 'a' })
    await saving
    expect(session.name()).toBe('latest')
    expect(session.form.isDirty).toBe(true)
    expect(session.saved).not.toHaveBeenCalled()
    expect(session.save).toHaveBeenCalledTimes(1)
  })

  it('restores compatible optional-string drafts when the new initial value is undefined', () => {
    const source = { key: 'a', input: layout.input(undefined) }
    const scope = effectScope()
    scopes.push(scope)
    const session = scope.run(() =>
      useServerSyncedForm({
        schema: layout.schema,
        input: source.input,
        source: () => source,
        sourceKey: source.key,
        initialState: {
          input: layout.input(undefined),
          dirtyInput: layout.input('restored draft'),
          sourceKey: 'a',
          source
        },
        saveInput: async () => null
      })
    )
    if (!session) throw new Error('Expected an active form scope')
    expect(getInput<SyncedFormSchema, SyncedFieldPath>(session.form, layout.field)).toBe('restored draft')
    expect(session.form.isDirty).toBe(true)
  })
})
