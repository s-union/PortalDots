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

  it('keeps footnotes and task lists independent across instances and updates', async () => {
    const first = mount(PageMarkdownContent, {
      props: { source: 'First[^note]\n\n[^note]: First footnote\n\n- [x] Done' }
    })
    const second = mount(PageMarkdownContent, {
      props: { source: 'Second[^note]\n\n[^note]: Second footnote\n\n- [ ] Pending' }
    })

    expect(first.get('section[data-footnotes]').text()).toContain('First footnote')
    expect(first.text()).not.toContain('Second footnote')
    expect(second.get('section[data-footnotes]').text()).toContain('Second footnote')
    expect(second.text()).not.toContain('First footnote')
    expect(first.get<HTMLInputElement>('input[type="checkbox"]').element.checked).toBe(true)
    expect(second.get<HTMLInputElement>('input[type="checkbox"]').element.checked).toBe(false)
    expect(first.get('input').attributes()).toMatchObject({ disabled: '', 'aria-label': 'タスク' })

    await first.setProps({ source: '| A | B |\n| --- | --- |\n| 1 | 2 |' })
    expect(first.find('section[data-footnotes]').exists()).toBe(false)
    expect(first.findAll('td').map((cell) => cell.text())).toEqual(['1', '2'])
    expect(second.get('section[data-footnotes]').text()).toContain('Second footnote')

    await first.setProps({ source: '  \n  ' })
    expect(first.element.innerHTML).toBe('')
  })
})
