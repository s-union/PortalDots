import { describe, expect, it } from 'vitest'
import { mount, RouterLinkStub } from '@vue/test-utils'
import BottomTabLink from './BottomTabLink.vue'

describe('BottomTabLink', () => {
  it('renders label, icon, and notifier', () => {
    const FaIconStub = {
      name: 'FaIcon',
      props: ['name', 'prefix', 'fixedWidth', 'pulse', 'className', 'iconClass'],
      template: '<span />'
    }

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
          RouterLink: RouterLinkStub,
          FaIcon: FaIconStub
        }
      }
    })

    expect(wrapper.getComponent(RouterLinkStub).props('to')).toBe('/workspace')
    expect(wrapper.text()).toContain('ホーム')

    const faIcons = wrapper.findAllComponents(FaIconStub)
    const iconFaIcon = faIcons.find((w) => w.props('iconClass') === 'fas fa-home')
    expect(iconFaIcon?.exists()).toBe(true)
    const notifierFaIcon = faIcons.find((w) => w.props('name') === 'circle')
    expect(notifierFaIcon?.exists()).toBe(true)
  })
})
