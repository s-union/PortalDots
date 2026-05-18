import { describe, expect, it } from 'vitest'
import { cn } from './cn'

describe('cn', () => {
  it('returns a single class unchanged', () => {
    expect(cn('foo')).toBe('foo')
  })

  it('joins multiple classes with a space', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('filters out falsy values', () => {
    expect(cn('foo', false, null, undefined, 'bar')).toBe('foo bar')
  })

  it('returns empty string when all values are falsy', () => {
    expect(cn(false, null, undefined)).toBe('')
  })

  it('merges conflicting Tailwind classes (last wins)', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4')
    expect(cn('text-sm', 'text-lg')).toBe('text-lg')
  })

  it('handles no arguments', () => {
    expect(cn()).toBe('')
  })
})
