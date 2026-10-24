import { describe, expect, it } from 'vitest'
import * as v from 'valibot'
import { isRequiredField } from './required'
import { fieldUi } from './ui'

describe('isRequiredField', () => {
  it('is required for a string with minLength(1) or non-empty', () => {
    expect(isRequiredField(v.pipe(v.string(), v.minLength(1, '必須です')))).toBe(true)
    expect(isRequiredField(v.pipe(v.string(), v.nonEmpty('必須です')))).toBe(true)
  })

  it('is not required for a string without a non-empty requirement', () => {
    expect(isRequiredField(v.string())).toBe(false)
    expect(isRequiredField(v.pipe(v.string(), v.maxLength(10)))).toBe(false)
  })

  it('is required for a minLength(1) requirement reached through a shared base schema', () => {
    const branded = v.pipe(v.string(), v.brand('Id'))
    expect(isRequiredField(v.pipe(branded, v.minLength(1, '必須です')))).toBe(true)
  })

  it('is required for any non-optional number, regardless of its validations', () => {
    expect(isRequiredField(v.number())).toBe(true)
    expect(isRequiredField(v.pipe(v.number(), v.minValue(1, '1以上で入力してください')))).toBe(true)
  })

  it('is required for a boolean with a literal `true` check', () => {
    expect(isRequiredField(v.pipe(v.boolean(), v.value(true, '同意してください')))).toBe(true)
  })

  it('is not required for a plain boolean', () => {
    expect(isRequiredField(v.boolean())).toBe(false)
  })

  it('is not required for optional/nullable/nullish/undefinedable wrappers, even with a non-empty requirement', () => {
    expect(isRequiredField(v.optional(v.pipe(v.string(), v.minLength(1)), ''))).toBe(false)
    expect(isRequiredField(v.nullable(v.pipe(v.string(), v.minLength(1))))).toBe(false)
    expect(isRequiredField(v.nullish(v.pipe(v.string(), v.minLength(1))))).toBe(false)
    expect(isRequiredField(v.undefinedable(v.pipe(v.string(), v.minLength(1))))).toBe(false)
  })

  it('honours an explicit ui.required override in both directions', () => {
    expect(isRequiredField(v.pipe(v.string(), fieldUi({ control: 'text', label: 'x', required: true })))).toBe(true)
    expect(
      isRequiredField(v.pipe(v.string(), v.minLength(1), fieldUi({ control: 'text', label: 'x', required: false })))
    ).toBe(false)
  })

  it('derives requiredness even when fieldUi() metadata is absent', () => {
    expect(isRequiredField(v.pipe(v.string(), v.minLength(1)))).toBe(true)
  })

  it('honours an explicit ui.required override even on an optional/nullable/... wrapper', () => {
    expect(
      isRequiredField(v.pipe(v.optional(v.string(), ''), fieldUi({ control: 'text', label: 'x', required: true })))
    ).toBe(true)
    expect(
      isRequiredField(
        v.pipe(
          v.nullable(v.pipe(v.string(), v.minLength(1))),
          fieldUi({ control: 'text', label: 'x', required: false })
        )
      )
    ).toBe(false)
  })

  it('recognises a wrapper schema used as a later pipe item, not just the first one', () => {
    // `v.optional(...)` as pipe item 1 (not item 0): pipe()'s spread only copies item 0's
    // properties, so the top-level `type` alone would miss this; collectPipeItems() must walk
    // every item, not just the first, to find it.
    const nonFirstOptional = v.pipe(v.string(), v.optional(v.pipe(v.string(), v.minLength(1))))
    expect(isRequiredField(nonFirstOptional)).toBe(false)
  })

  it("follows a wrapper's .wrapped to find fieldUi() metadata attached inside it", () => {
    // fieldUi() attached to the *inner* schema, with optional() wrapping the whole pipe — not the
    // common `v.pipe(v.optional(inner, default), fieldUi(...))` shape used elsewhere in this app.
    const nestedUi = v.optional(
      v.pipe(v.string(), v.minLength(1), fieldUi({ control: 'text', label: 'x', required: true })),
      ''
    )
    expect(isRequiredField(nestedUi)).toBe(true)
  })
})
