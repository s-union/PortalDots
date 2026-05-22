import { describe, expect, it } from 'vitest'
import { mount, RouterLinkStub } from '@vue/test-utils'
import NavMenuLink from './NavMenuLink.vue'

const FaIconStub = {
  name: 'FaIcon',
  props: ['name', 'prefix', 'fixedWidth', 'pulse', 'className', 'iconClass'],
  template: '<span />'
}

describe('NavMenuLink', () => {
  it('renders label and icon', () => {
    const wrapper = mount(NavMenuLink, {
      props: {
        to: '/staff',
        label: 'スタッフ',
        iconClass: 'fas fa-user'
      },
      global: {
        stubs: {
          RouterLink: RouterLinkStub,
          FaIcon: FaIconStub
        }
      }
    })

    expect(wrapper.getComponent(RouterLinkStub).props('to')).toBe('/staff')
    expect(wrapper.text()).toContain('スタッフ')
    const faIcon = wrapper.findComponent(FaIconStub)
    expect(faIcon.exists()).toBe(true)
    expect(faIcon.props('iconClass')).toBe('fas fa-user')
  })

  it('shows active indicator when active', () => {
    const wrapper = mount(NavMenuLink, {
      props: {
        to: '/staff',
        label: 'スタッフ',
        active: true
      },
      global: {
        stubs: {
          RouterLink: RouterLinkStub,
          FaIcon: FaIconStub
        }
      }
    })

    expect(wrapper.find('span.absolute.right-0').exists()).toBe(true)
  })
})
