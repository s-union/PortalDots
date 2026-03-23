import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import SettingsRow from './SettingsRow.vue'

describe('SettingsRow', () => {
  it('renders slot content', () => {
    const wrapper = mount(SettingsRow, {
      slots: {
        default: '設定行'
      }
    })

    expect(wrapper.text()).toContain('設定行')
    expect(wrapper.classes()).toContain('px-6')
  })
})
