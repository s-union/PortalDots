import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import PageMarkdownContent from './PageMarkdownContent.vue'

describe('PageMarkdownContent', () => {
  it('renders basic markdown', () => {
    const wrapper = mount(PageMarkdownContent, {
      props: {
        source: '# 見出し\n\n- 項目'
      }
    })

    expect(wrapper.text()).toContain('見出し')
    expect(wrapper.text()).toContain('項目')
    expect(wrapper.classes()).toContain('text-base')
    expect(wrapper.attributes('data-heading-scale')).toBe('embedded')
  })

  it('uses the page heading scale when requested', () => {
    const wrapper = mount(PageMarkdownContent, {
      props: {
        source: '# 見出し',
        headingScale: 'page'
      }
    })

    expect(wrapper.attributes('data-heading-scale')).toBe('page')
  })

  it('sanitizes unsafe link protocols', () => {
    const javascriptUrl = ['java', 'script:alert(1)'].join('')
    const wrapper = mount(PageMarkdownContent, {
      props: {
        source: `[unsafe](${javascriptUrl})\n\n[safe](https://example.com)`
      }
    })

    expect(wrapper.html()).not.toContain(javascriptUrl)
    expect(wrapper.html()).toContain('href="https://example.com"')
  })
})
