import { describe, expect, it } from 'vitest'
import { formatFileSize } from './fileSize'

describe('formatFileSize', () => {
  it("returns '0 B' for 0 bytes", () => {
    expect(formatFileSize(0)).toBe('0 B')
  })

  it('returns bytes for values under 1024', () => {
    expect(formatFileSize(1)).toBe('1 B')
    expect(formatFileSize(512)).toBe('512 B')
    expect(formatFileSize(1023)).toBe('1023 B')
  })

  it('returns KB for values between 1024 and 1MB', () => {
    expect(formatFileSize(1024)).toBe('1 KB')
    expect(formatFileSize(1536)).toBe('1.5 KB')
    expect(formatFileSize(1024 * 1023)).toBe('1023 KB')
  })

  it('omits trailing .0 in KB values', () => {
    expect(formatFileSize(2048)).toBe('2 KB')
    expect(formatFileSize(3 * 1024)).toBe('3 KB')
  })

  it('returns MB for values 1MB and above', () => {
    expect(formatFileSize(1024 * 1024)).toBe('1 MB')
    expect(formatFileSize(1.5 * 1024 * 1024)).toBe('1.5 MB')
    expect(formatFileSize(10 * 1024 * 1024)).toBe('10 MB')
  })

  it('omits trailing .0 in MB values', () => {
    expect(formatFileSize(2 * 1024 * 1024)).toBe('2 MB')
  })

  it("returns '0 B' for negative values", () => {
    expect(formatFileSize(-1)).toBe('0 B')
    expect(formatFileSize(-1024)).toBe('0 B')
  })

  it("returns '0 B' for non-finite values", () => {
    expect(formatFileSize(Infinity)).toBe('0 B')
    expect(formatFileSize(-Infinity)).toBe('0 B')
    expect(formatFileSize(NaN)).toBe('0 B')
  })
})
