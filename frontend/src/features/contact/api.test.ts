import { beforeEach, describe, expect, it, vi } from 'vitest'

const apiClientMocks = vi.hoisted(() => ({
  postMultipart: vi.fn(),
  createJsonHeaders: vi.fn(),
  $api: {
    queryData: vi.fn(),
    useQueryData: vi.fn()
  }
}))

vi.mock('@/lib/api/client', () => apiClientMocks)

vi.mock('@tanstack/vue-query', () => ({
  useMutation: vi.fn(),
  useQueryClient: vi.fn()
}))

vi.mock('@/features/session/store', () => ({
  useSessionStore: vi.fn()
}))

import { submitContact } from './api'

describe('contact api', () => {
  beforeEach(() => {
    apiClientMocks.postMultipart.mockReset()
    apiClientMocks.postMultipart.mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'contact-job',
          categoryId: 'category-a',
          categoryName: 'General',
          subject: 'Proposal',
          status: 'sent',
          createdAt: '2026-07-11T00:00:00Z'
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } }
      )
    )
  })

  it('sends multipart fields and the optional file without setting a content type', async () => {
    const file = new File(['%PDF-1.7'], 'proposal.pdf', { type: 'application/pdf' })

    await submitContact(
      {
        categoryId: 'category-a',
        subject: 'Proposal',
        body: 'Please review the attachment.',
        ccSubleader: false,
        file
      },
      'csrf-token'
    )

    expect(apiClientMocks.postMultipart).toHaveBeenCalledOnce()
    const [path, formData, csrfToken] = apiClientMocks.postMultipart.mock.calls[0] as [string, FormData, string]
    expect(path).toBe('/contact')
    expect(csrfToken).toBe('csrf-token')
    expect(formData.get('categoryId')).toBe('category-a')
    expect(formData.get('ccSubleader')).toBe('false')
    expect(formData.get('file')).toBe(file)
  })

  it('omits the file field when no attachment is selected', async () => {
    await submitContact({ categoryId: 'category-a', subject: 'Question', body: 'No file.' }, 'csrf-token')

    const formData = apiClientMocks.postMultipart.mock.calls[0]?.[1] as FormData
    expect(formData.has('file')).toBe(false)
  })
})
