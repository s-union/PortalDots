import { it, expectTypeOf } from 'vitest'
import type { FormStore } from '@formisch/vue'
import * as v from 'valibot'
import SchemaFormFields from './SchemaFormFields.vue'
import { fieldUi } from './ui'
import type { FieldOverrides } from './types'

const schema = v.object({
  name: v.pipe(v.string(), v.minLength(1), fieldUi({ control: 'text', label: '名前' })),
  tags: v.pipe(v.array(v.string()), fieldUi({ control: 'tags', label: 'タグ' })),
  contact: v.object({
    email: v.pipe(v.string(), fieldUi({ control: 'email', label: 'メール' }))
  })
})

declare const form: FormStore<typeof schema>

it('checks override keys (including dotted nested paths) against the schema', () => {
  const overrides: FieldOverrides<typeof schema.entries> = {
    name: { label: 'フルネーム' },
    tags: { availableTags: ['a'], tagColors: { a: 'blue' } },
    'contact.email': { helper: '連絡先' }
  }
  expectTypeOf(overrides).toMatchTypeOf<FieldOverrides<typeof schema.entries>>()

  SchemaFormFields({ of: form, schema, overrides })

  type Overrides = FieldOverrides<typeof schema.entries>
  // @ts-expect-error A misspelled top-level key must not type-check.
  const misspelledKey: Overrides = { nam: { label: 'x' } }
  // @ts-expect-error A misspelled nested group path must not type-check.
  const misspelledPath: Overrides = { 'contact.mail': { helper: 'x' } }
  // @ts-expect-error A field that is not a nested group must not accept a dotted path.
  const notAGroup: Overrides = { 'name.first': { label: 'x' } }
  void misspelledKey
  void misspelledPath
  void notAGroup
})
