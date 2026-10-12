import { describe, expect, it } from 'vitest'
import * as v from 'valibot'
import { formLayout, getFormLayout, resolveLayout } from './layout'
import { fieldUi } from './ui'

describe('formLayout/getFormLayout', () => {
  it('round-trips layout metadata through the schema', () => {
    const layout = [{ row: ['a', 'b'] }]
    const schema = v.pipe(v.object({ a: v.string(), b: v.string() }), formLayout(layout))
    expect(getFormLayout(schema)).toBe(layout)
  })

  it('returns undefined when no layout metadata is attached', () => {
    expect(getFormLayout(v.object({ a: v.string() }))).toBeUndefined()
  })
})

describe('resolveLayout', () => {
  it('falls back to one row per entry, in object-entry order, when there is no layout metadata', () => {
    const schema = v.object({
      first: v.pipe(v.string(), fieldUi({ control: 'text', label: 'First' })),
      second: v.pipe(v.string(), fieldUi({ control: 'text', label: 'Second' })),
      third: v.pipe(v.string(), fieldUi({ control: 'text', label: 'Third' }))
    })
    expect(resolveLayout(schema)).toEqual(['first', 'second', 'third'])
  })

  it('prefers explicit layout metadata over the default order', () => {
    const layout = [{ row: ['second', 'first'] }, 'third']
    const schema = v.pipe(
      v.object({
        first: v.pipe(v.string(), fieldUi({ control: 'text', label: 'First' })),
        second: v.pipe(v.string(), fieldUi({ control: 'text', label: 'Second' })),
        third: v.pipe(v.string(), fieldUi({ control: 'text', label: 'Third' }))
      }),
      formLayout(layout)
    )
    expect(resolveLayout(schema)).toBe(layout)
  })

  it('resolves layout metadata attached through a nested pipe (e.g. a validation pipe before it)', () => {
    const layout = ['a']
    const schema = v.pipe(
      v.pipe(v.object({ a: v.string() }), formLayout(layout)),
      v.check(() => true)
    )
    expect(resolveLayout(schema)).toBe(layout)
  })
})
