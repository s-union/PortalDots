import { afterEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { defineComponent, effectScope, h, nextTick, ref, shallowRef } from 'vue'
import { getInput, setInput, useField, type FieldStore } from '@formisch/vue'
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
enableAutoUnmount(afterEach)
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
  it('focuses server errors in display order after submission controls become enabled', async () => {
    const descriptionAddress: Layout['field'] =
      layout.name === 'flat' ? { path: ['description'] } : { path: ['text', 'description'] }
    const error = new Error('Validation failed', {
      cause: {
        message: 'Invalid',
        errors: {
          [layout.field.path.join('.')]: ['Name error'],
          [descriptionAddress.path.join('.')]: ['Description error']
        }
      }
    })
    const wrapper = mount(
      defineComponent({
        setup() {
          const { form, submitEvent } = useServerSyncedForm({
            schema: layout.schema,
            input: layout.input('name', 'description'),
            source: () => null,
            sourceKey: 'a',
            focusOrder: [descriptionAddress.path, layout.field.path],
            saveInput: async () => {
              throw error
            }
          })
          const name = useField<SyncedFormSchema, SyncedFieldPath>(form, layout.field)
          const description = useField<SyncedFormSchema, SyncedFieldPath>(form, descriptionAddress)
          return () =>
            h('form', { onSubmit: submitEvent }, [
              h('input', { ...name.props, id: 'name', disabled: form.isSubmitting, value: name.input }),
              h('input', {
                ...description.props,
                id: 'description',
                disabled: form.isSubmitting,
                value: description.input
              })
            ])
        }
      }),
      { attachTo: document.body }
    )
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(document.activeElement).toBe(wrapper.get('#description').element)
  })

  it('focuses an invalid optional field in display order even when it was absent from initial input', async () => {
    const entries = v.object({
      name: v.pipe(v.string(), v.minLength(2)),
      description: v.optional(v.pipe(v.string(), v.minLength(2)))
    })
    const schema: SyncedFormSchema = layout.name === 'flat' ? entries : v.object({ text: entries })
    const descriptionAddress: Layout['field'] =
      layout.name === 'flat' ? { path: ['description'] } : { path: ['text', 'description'] }
    const save = vi.fn(async () => ({ input: layout.input('valid', 'valid'), sourceKey: 'a' }))
    const wrapper = mount(
      defineComponent({
        setup() {
          const { form, submitEvent } = useServerSyncedForm({
            schema,
            input: layout.name === 'flat' ? { name: 'valid' } : { text: { name: 'valid' } },
            source: () => null,
            sourceKey: 'a',
            focusOrder: [descriptionAddress.path, layout.field.path],
            saveInput: save
          })
          const name = useField<SyncedFormSchema, SyncedFieldPath>(form, layout.field)
          const description = useField<SyncedFormSchema, SyncedFieldPath>(form, descriptionAddress)
          function control(field: FieldStore<SyncedFormSchema, SyncedFieldPath>, id: string) {
            return h('input', {
              ...field.props,
              id,
              value: field.input,
              onInput: (event: Event) => {
                if (event.target instanceof HTMLInputElement) field.input = event.target.value
              }
            })
          }
          return () =>
            h('form', { onSubmit: submitEvent }, [control(name, 'name'), control(description, 'description')])
        }
      }),
      { attachTo: document.body }
    )
    await wrapper.get('#name').setValue('a')
    await wrapper.get('#description').setValue('b')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(document.activeElement).toBe(wrapper.get('#description').element)
    expect(save).not.toHaveBeenCalled()
  })

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

  it('drains successive autosaves serially with each latest requested submitter', async () => {
    const session = setup(layout, { mode: 'autosave' })
    const first = Promise.withResolvers<SchemaFormSaveResult<SyncedFormSchema>>()
    const second = Promise.withResolvers<SchemaFormSaveResult<SyncedFormSchema>>()
    const third = Promise.withResolvers<SchemaFormSaveResult<SyncedFormSchema>>()
    session.save
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise)
      .mockReturnValueOnce(third.promise)
    const button = document.createElement('button')
    button.value = 'continue'
    const event = new SubmitEvent('submit', { submitter: button })
    session.edit('first')
    const saving = session.submitEvent()
    await flushPromises()
    session.edit('second')
    await session.submitEvent()
    first.resolve({ input: layout.input('first'), sourceKey: 'a' })
    await flushPromises()
    expect(session.save.mock.calls.map(([input]) => input)).toEqual([layout.input('first'), layout.input('second')])
    session.edit('discarded intermediate edit')
    await session.submitEvent()
    session.edit('latest')
    await session.submitEvent(event)
    expect(session.save).toHaveBeenCalledTimes(2)
    second.resolve({ input: layout.input('second'), sourceKey: 'a' })
    await flushPromises()
    expect(session.name()).toBe('latest')
    expect(session.form.isSubmitting).toBe(true)
    expect(session.save.mock.calls[2]).toEqual([layout.input('latest'), event, layout.schema])
    third.resolve({ input: layout.input('latest'), sourceKey: 'a' })
    await saving
    expect(session.name()).toBe('latest')
    expect(session.form.isDirty).toBe(false)
    expect(session.form.isSubmitting).toBe(false)
    expect(session.save).toHaveBeenCalledTimes(3)
    expect(session.saved).toHaveBeenCalledTimes(3)
  })

  it('retains a queued autosave through a pause that starts during the active save', async () => {
    const session = setup(layout, { mode: 'autosave' })
    const pending = Promise.withResolvers<SchemaFormSaveResult<SyncedFormSchema>>()
    session.save.mockReturnValueOnce(pending.promise)
    session.edit('first')
    const saving = session.submitEvent()
    await flushPromises()
    session.edit('queued draft')
    await session.submitEvent()
    session.paused.value = true
    pending.resolve({ input: layout.input('first'), sourceKey: 'a' })
    await saving
    expect(session.name()).toBe('queued draft')
    expect(session.save).toHaveBeenCalledTimes(1)
    expect(session.form.isSubmitting).toBe(false)
    session.edit('latest draft')
    session.source.value = { key: 'a', input: layout.input('first', 'refreshed while paused') }
    await nextTick()
    session.save.mockResolvedValue({ input: layout.input('latest draft', 'refreshed while paused'), sourceKey: 'a' })
    session.paused.value = false
    await flushPromises()
    expect(session.save.mock.calls.map(([input]) => input)).toEqual([
      layout.input('first'),
      layout.input('latest draft', 'refreshed while paused')
    ])
    expect(session.name()).toBe('latest draft')
    expect(session.form.isDirty).toBe(false)
    expect(session.form.isSubmitting).toBe(false)
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
