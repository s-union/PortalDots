import { describe, expect, it } from 'vitest'
import { buildApiUrl } from '@/lib/api/client'

describe('buildApiUrl', () => {
  it('normalizes repeated leading slashes to prevent protocol-relative host overrides', () => {
    const apiOrigin = new URL(buildApiUrl('/')).origin
    const result = buildApiUrl('///evil.example/download')
    const parsed = new URL(result)

    expect(parsed.origin).toBe(apiOrigin)
    expect(parsed.hostname).not.toBe('evil.example')
  })

  it('rejects external absolute URLs', () => {
    const safeBase = buildApiUrl('/')
    const result = buildApiUrl('https://evil.example/download')
    expect(result).toBe(safeBase)
  })

  it('accepts same-origin absolute API URLs', () => {
    const apiBase = new URL(buildApiUrl('/'))
    const input = new URL('public/documents/document-1', apiBase).toString()
    expect(buildApiUrl(input)).toBe(input)
  })
})
