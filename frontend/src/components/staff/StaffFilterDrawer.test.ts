import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import StaffFilterDrawer, { type StaffFilterField, type StaffFilterQuery } from './StaffFilterDrawer.vue'

const fields: StaffFilterField[] = [
  { key: 'id', label: 'ユーザーID', type: 'string' },
  { key: 'contactEmail', label: '連絡先メールアドレス', type: 'string' },
  { key: 'isVerified', label: '本人確認', type: 'bool' }
]

describe('StaffFilterDrawer', () => {
  it('emits row update and add/remove events for string filters', async () => {
    const queries: StaffFilterQuery[] = [{ id: 1, keyName: 'id', operator: 'like', value: 'staff' }]

    const wrapper = mount(StaffFilterDrawer, {
      props: {
        fields,
        queries,
        mode: 'and'
      }
    })

    const selects = wrapper.findAll('select')
    const operatorSelect = selects[0]
    const addSelect = selects[1]

    await operatorSelect.setValue('not like')
    await wrapper.get('input[type="text"]').setValue('demo')
    await wrapper.get('button[title="条件を削除"]').trigger('click')
    await addSelect.setValue('isVerified')

    expect(wrapper.emitted('updateQuery')).toEqual([
      [1, { operator: 'not like' }],
      [1, { value: 'demo' }]
    ])
    expect(wrapper.emitted('remove')).toEqual([[1]])
    expect(wrapper.emitted('add')).toEqual([['isVerified']])
  })

  it('emits bool updates, mode changes, apply and clear', async () => {
    const queries: StaffFilterQuery[] = [{ id: 2, keyName: 'isVerified', operator: '=', value: 'true' }]

    const wrapper = mount(StaffFilterDrawer, {
      props: {
        fields,
        queries,
        mode: 'and'
      }
    })

    const selects = wrapper.findAll('select')
    const boolSelect = selects[1]
    await boolSelect.setValue('false')

    await wrapper.get('input[name="filter-mode"][value="or"]').trigger('change')

    const buttons = wrapper.findAll('button')
    const applyButton = buttons.find((button) => button.text().includes('適用'))
    const clearButton = buttons.find((button) => button.text().includes('絞り込みを解除'))
    if (!applyButton || !clearButton) {
      throw new Error('expected apply and clear buttons')
    }

    await applyButton.trigger('click')
    await clearButton.trigger('click')

    expect(wrapper.emitted('updateQuery')).toEqual([[2, { value: 'false' }]])
    expect(wrapper.emitted('updateMode')).toEqual([['or']])
    expect(wrapper.emitted('apply')).toBeTruthy()
    expect(wrapper.emitted('clear')).toBeTruthy()
  })
})
