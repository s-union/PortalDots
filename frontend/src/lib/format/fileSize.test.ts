import { describe, expect, it } from 'vitest'
import { formatFileSize } from './fileSize'

describe('formatFileSize', () => {
  it("returns '0B' for 0 bytes", () => {
    expect(formatFileSize(0)).toBe('0B')
  })

  it('returns bytes for values under 1024', () => {
    expect(formatFileSize(1)).toBe('1B')
    expect(formatFileSize(512)).toBe('512B')
    expect(formatFileSize(1023)).toBe('1023B')
  })

  it('returns KB for values between 1024 and 1MB', () => {
    expect(formatFileSize(1024)).toBe('1KB')
    expect(formatFileSize(1536)).toBe('1.5KB')
    expect(formatFileSize(1024 * 1023)).toBe('1023KB')
  })

  it('omits trailing .0 in KB values', () => {
    expect(formatFileSize(2048)).toBe('2KB')
    expect(formatFileSize(3 * 1024)).toBe('3KB')
  })

  it('returns MB for values 1MB and above', () => {
    expect(formatFileSize(1024 * 1024)).toBe('1MB')
    expect(formatFileSize(1.5 * 1024 * 1024)).toBe('1.5MB')
    expect(formatFileSize(10 * 1024 * 1024)).toBe('10MB')
  })

  it('omits trailing .0 in MB values', () => {
    expect(formatFileSize(2 * 1024 * 1024)).toBe('2MB')
  })

  it("returns '0B' for negative values", () => {
    expect(formatFileSize(-1)).toBe('0B')
    expect(formatFileSize(-1024)).toBe('0B')
  })

  it("returns '0B' for non-finite values", () => {
    expect(formatFileSize(Infinity)).toBe('0B')
    expect(formatFileSize(-Infinity)).toBe('0B')
    expect(formatFileSize(NaN)).toBe('0B')
  })

  it('keeps two decimals when needed for demo-sized files', () => {
    expect(formatFileSize(97321)).toBe('95.04KB')
    expect(formatFileSize(165140)).toBe('161.27KB')
  })
})
