import { describe, expect, it } from 'vitest'
import { mount, RouterLinkStub } from '@vue/test-utils'
import ListItemLink from './ListItemLink.vue'

describe('ListItemLink', () => {
  it('renders RouterLink when to is provided', () => {
    const wrapper = mount(ListItemLink, {
      props: {
        to: '/staff/forms'
      },
      slots: {
        title: 'フォーム'
      },
      global: {
        stubs: {
          RouterLink: RouterLinkStub
        }
      }
    })

    expect(wrapper.getComponent(RouterLinkStub).props('to')).toBe('/staff/forms')
    expect(wrapper.text()).toContain('フォーム')
  })

  it('renders anchor with new tab attrs when href and newTab are provided', () => {
    const wrapper = mount(ListItemLink, {
      props: {
        href: 'https://example.com',
        newTab: true
      },
      slots: {
        title: '外部リンク',
        meta: 'メタ',
        default: '本文'
      }
    })

    const anchor = wrapper.get('a')
    expect(anchor.attributes('href')).toBe('https://example.com')
    expect(anchor.attributes('target')).toBe('_blank')
    expect(anchor.attributes('rel')).toBe('noreferrer')
    expect(wrapper.text()).toContain('メタ')
    expect(wrapper.text()).toContain('本文')
  })

  it('uses legacy classes when legacy mode is enabled', () => {
    const wrapper = mount(ListItemLink, {
      props: {
        legacy: true
      },
      slots: {
        title: 'タイトル'
      }
    })

    const title = wrapper.get('h3')
    expect(title.classes()).toContain('leading-[1.4]')

    const root = wrapper.get('div')
    expect(root.classes()).toContain('max-[1000px]:px-4')
  })
})
