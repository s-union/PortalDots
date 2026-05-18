import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import SettingsSection from './SettingsSection.vue'

describe('SettingsSection', () => {
  it('renders title, body, and footer slot', () => {
    const wrapper = mount(SettingsSection, {
      props: {
        id: 'settings-profile',
        title: 'プロフィール設定'
      },
      slots: {
        default: '本文',
        footer: 'フッター'
      }
    })

    expect(wrapper.attributes('id')).toBe('settings-profile')
    expect(wrapper.text()).toContain('プロフィール設定')
    expect(wrapper.text()).toContain('本文')
    expect(wrapper.text()).toContain('フッター')
  })

  it('does not render footer block when footer slot is missing', () => {
    const wrapper = mount(SettingsSection, {
      props: {
        title: 'セクション'
      },
      slots: {
        default: '本文'
      }
    })

    expect(wrapper.text()).not.toContain('フッター')
    expect(wrapper.find('.border-t.border-border').exists()).toBe(false)
  })

  it('renders title outside the card when titleOutside is true', () => {
    const wrapper = mount(SettingsSection, {
      props: {
        title: '外観',
        titleOutside: true
      },
      slots: {
        default: '本文'
      }
    })

    const h2 = wrapper.find('h2')
    expect(h2.exists()).toBe(true)
    expect(h2.text()).toBe('外観')
    expect(wrapper.findAll('h2')).toHaveLength(1)
  })
})
