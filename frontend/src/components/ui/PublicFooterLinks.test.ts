import { describe, expect, it } from 'vitest'
import { mount, RouterLinkStub } from '@vue/test-utils'
import PublicFooterLinks from './PublicFooterLinks.vue'

describe('PublicFooterLinks', () => {
  it('renders app name and static links', () => {
    const wrapper = mount(PublicFooterLinks, {
      props: {
        appName: 'PortalDots Demo'
      },
      global: {
        stubs: {
          RouterLink: RouterLinkStub
        }
      }
    })

    expect(wrapper.text()).toContain('PortalDots Demo')
    expect(wrapper.get('a[href="https://www.portaldots.com"]').attributes('target')).toBe('_blank')

    const links = wrapper.findAllComponents(RouterLinkStub)
    expect(links[0]?.props('to')).toBe('/support')
    expect(links[1]?.props('to')).toBe('/privacy_policy')
  })

  it('hides privacy policy link when disabled', () => {
    const wrapper = mount(PublicFooterLinks, {
      props: {
        appName: 'PortalDots Demo',
        showPrivacyPolicy: false
      },
      global: {
        stubs: {
          RouterLink: RouterLinkStub
        }
      }
    })

    const links = wrapper.findAllComponents(RouterLinkStub)
    expect(links).toHaveLength(1)
    expect(links[0]?.props('to')).toBe('/support')
    expect(wrapper.text()).not.toContain('プライバシーポリシー')
  })
})
