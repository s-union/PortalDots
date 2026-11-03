import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { config, icon, type IconDefinition } from '@fortawesome/fontawesome-svg-core'
import * as icons from '@/lib/icons/fontawesome'
import FaIcon from './FaIcon.vue'

config.autoAddCss = false

function svgShape(element: Element): object {
  return {
    tag: element.tagName,
    attributes: Object.fromEntries(Array.from(element.attributes, ({ name, value }) => [name, value])),
    children: Array.from(element.children, svgShape)
  }
}

function coreSvgShape(definition: IconDefinition, classes: string[] = []): object {
  const container = document.createElement('div')
  container.innerHTML = icon(definition, {
    classes,
    attributes: { 'aria-hidden': 'true', focusable: 'false' }
  }).html.join('')
  const svg = container.querySelector('svg')
  if (!svg) {
    throw new Error('Font Awesome did not render the reference SVG')
  }
  return svgShape(svg)
}

afterEach(() => vi.restoreAllMocks())

describe('FaIcon', () => {
  it.each(icons.iconDefinitions)('preserves SVG output and aliases for $prefix/$iconName', (definition) => {
    const expected = coreSvgShape(definition)
    const wrapper = mount(FaIcon, { props: { prefix: definition.prefix, name: definition.iconName } })
    expect(svgShape(wrapper.get('svg').element)).toEqual(expected)
    wrapper.unmount()

    for (const alias of definition.icon[2]) {
      const aliasWrapper = mount(FaIcon, { props: { iconClass: `${definition.prefix} fa-${alias}` } })
      expect(svgShape(aliasWrapper.get('svg').element)).toEqual(expected)
      aliasWrapper.unmount()
    }
  })

  it('preserves iconClass precedence, sizing, animation, and extra classes', () => {
    const definition = icons.findIconDefinition('far', 'edit')
    expect(definition).toBeDefined()
    if (!definition) return

    const wrapper = mount(FaIcon, {
      props: {
        name: 'home',
        iconClass: 'far fa-edit fa-fw fa-pulse fa-spin text-primary',
        className: '  mr-2   text-xl '
      },
      attrs: { class: 'outer-class', title: 'Edit' }
    })

    expect(svgShape(wrapper.get('svg').element)).toEqual(
      coreSvgShape(definition, ['fa-fw', 'fa-pulse', 'fa-spin', 'text-primary', 'mr-2', 'text-xl'])
    )
    expect(wrapper.classes()).toContain('outer-class')
    expect(wrapper.attributes('title')).toBe('Edit')
    expect(wrapper.get('svg').classes()).not.toContain('outer-class')
  })

  it('updates name, prefix, and modifier props synchronously', async () => {
    const wrapper = mount(FaIcon, { props: { name: 'spinner', fixedWidth: true, pulse: true } })
    expect(wrapper.get('svg').classes()).toEqual(['svg-inline--fa', 'fa-spinner', 'fa-fw', 'fa-pulse'])

    await wrapper.setProps({ name: 'eye', prefix: 'far', fixedWidth: false, pulse: false })
    expect(wrapper.get('svg').attributes('data-prefix')).toBe('far')
    expect(wrapper.get('svg').attributes('data-icon')).toBe('eye')
    expect(wrapper.get('svg').classes()).toEqual(['svg-inline--fa', 'fa-eye'])

    await wrapper.setProps({ iconClass: 'fas fa-home' })
    expect(wrapper.get('svg').attributes('data-icon')).toBe('house')
  })

  it('keeps missing icons empty and falls back to name for incomplete icon classes', async () => {
    const wrapper = mount(FaIcon)
    expect(wrapper.find('svg').exists()).toBe(false)

    await wrapper.setProps({ name: 'home', iconClass: 'fas fa-unregistered-icon' })
    expect(wrapper.find('svg').exists()).toBe(false)

    await wrapper.setProps({ iconClass: 'fa-home' })
    expect(wrapper.get('svg').attributes('data-icon')).toBe('house')

    await wrapper.setProps({ iconClass: '', prefix: 'fab' })
    expect(wrapper.find('svg').exists()).toBe(false)
  })

  it('preserves secondary and primary paths for layered definitions', () => {
    const definition: IconDefinition = {
      prefix: 'fad',
      iconName: 'circle',
      icon: [32, 32, [], 'f111', ['M0 0h32v32H0z', 'M8 8h16v16H8z']]
    }
    vi.spyOn(icons, 'findIconDefinition').mockReturnValue(definition)
    const wrapper = mount(FaIcon, { props: { name: 'circle', prefix: 'fad' } })

    expect(svgShape(wrapper.get('svg').element)).toEqual(coreSvgShape(definition))
  })
})
