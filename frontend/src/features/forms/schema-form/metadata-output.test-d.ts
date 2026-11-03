import { it, expectTypeOf } from 'vitest'
import * as v from 'valibot'
import { fieldUi } from './ui'
import { formLayout } from './layout'

it('keeps a field schema wrapped with fieldUi() output-equivalent to the schema without it', () => {
  const plain = v.pipe(v.string(), v.minLength(1, 'x'))
  const withUi = v.pipe(v.string(), v.minLength(1, 'x'), fieldUi({ control: 'text', label: 'y' }))
  expectTypeOf<v.InferOutput<typeof withUi>>().toEqualTypeOf<v.InferOutput<typeof plain>>()
  expectTypeOf<v.InferOutput<typeof withUi>>().toEqualTypeOf<string>()
})

it('keeps an object schema wrapped with formLayout() output-equivalent to the schema without it', () => {
  const entries = { a: v.string(), b: v.number() }
  const plain = v.object(entries)
  const withLayout = v.pipe(v.object(entries), formLayout(['a', 'b']))
  expectTypeOf<v.InferOutput<typeof withLayout>>().toEqualTypeOf<v.InferOutput<typeof plain>>()
  expectTypeOf<v.InferOutput<typeof withLayout>>().toEqualTypeOf<{ a: string; b: number }>()
})

it('keeps output equivalent when both fieldUi() and formLayout() end a pipe together', () => {
  const entries = {
    name: v.pipe(v.string(), v.minLength(1), fieldUi({ control: 'text', label: 'Name' }))
  }
  const plain = v.object({ name: v.pipe(v.string(), v.minLength(1)) })
  const withBoth = v.pipe(v.object(entries), formLayout(['name']))
  expectTypeOf<v.InferOutput<typeof withBoth>>().toEqualTypeOf<v.InferOutput<typeof plain>>()
})
