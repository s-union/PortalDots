import { afterEach, describe, expect, it } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { getErrors, setErrors, useField, useForm } from '@formisch/vue'
import * as v from 'valibot'
import { focusSubmitErrors, setSubmitErrors } from './form-errors'

enableAutoUnmount(afterEach)

describe('submission field errors', () => {
  it('uses display order and skips disabled and unmounted invalid controls', () => {
    const schema = v.object({ hidden: v.string(), disabled: v.string(), first: v.string(), second: v.string() })
    const wrapper = mount(
      defineComponent({
        setup() {
          const form = useForm({ schema, initialInput: { hidden: '', disabled: '', first: '', second: '' } })
          const disabled = useField(form, { path: ['disabled'] })
          const first = useField(form, { path: ['first'] })
          const second = useField(form, { path: ['second'] })
          for (const path of ['hidden', 'disabled', 'first', 'second'] as const)
            setErrors(form, { path: [path], errors: ['Invalid'] })
          return () =>
            h(
              'form',
              {
                onSubmit: (event: Event) => {
                  event.preventDefault()
                  focusSubmitErrors(form, [['hidden'], ['disabled'], ['second'], ['first']])
                }
              },
              [
                h('input', { ...disabled.props, disabled: true, id: 'disabled' }),
                h('input', { ...first.props, id: 'first' }),
                h('input', {
                  ...second.props,
                  name: 'custom-name',
                  'data-field-path': JSON.stringify(['second']),
                  id: 'second'
                }),
                h('button', { type: 'submit' }, 'Submit')
              ]
            )
        }
      }),
      { attachTo: document.body }
    )
    wrapper.get('button').element.focus()
    wrapper.get('form').element.dispatchEvent(new Event('submit', { cancelable: true }))
    expect(document.activeElement).toBe(wrapper.get('#second').element)
    wrapper.get('form').element.dispatchEvent(new Event('submit', { cancelable: true }))
    expect(document.activeElement).toBe(wrapper.get('#second').element)
  })

  it('compares raw submitted strings, numbers and arrays before attaching late server errors', () => {
    const schema = v.object({ name: v.pipe(v.string(), v.trim()), count: v.number(), tags: v.array(v.string()) })
    const form = useForm({ schema, initialInput: { name: '  name  ', count: 2, tags: ['later'] } })
    const error = new Error('Validation failed', {
      cause: { message: 'Invalid', errors: { name: ['Name error'], count: ['Count error'], tags: ['Tags error'] } }
    })
    setSubmitErrors(form, error, 'Save failed', { name: '  name  ', count: 2, tags: ['submitted'] })
    expect(getErrors(form, { path: ['name'] })).toEqual(['Name error'])
    expect(getErrors(form, { path: ['count'] })).toEqual(['Count error'])
    expect(getErrors(form, { path: ['tags'] })).toBeNull()
    expect(form.errors).toEqual(['Save failed'])
  })
})
