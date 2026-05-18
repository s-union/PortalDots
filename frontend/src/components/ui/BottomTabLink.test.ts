import { describe, expect, it } from 'vitest'
import { mount, RouterLinkStub } from '@vue/test-utils'
import BottomTabLink from './BottomTabLink.vue'

describe('BottomTabLink', () => {
  it('renders label, icon, and notifier', () => {
    const wrapper = mount(BottomTabLink, {
      props: {
        to: '/workspace',
        label: 'ホーム',
        iconClass: 'fas fa-home',
        active: true,
        showNotifier: true
      },
      global: {
        stubs: {
          RouterLink: RouterLinkStub
        }
      }
    })

    expect(wrapper.getComponent(RouterLinkStub).props('to')).toBe('/workspace')
    expect(wrapper.text()).toContain('ホーム')
    expect(wrapper.find('i.fas.fa-home').exists()).toBe(true)
    expect(wrapper.find('i.fas.fa-circle').exists()).toBe(true)
  })
})
