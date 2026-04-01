import { afterEach, describe, expect, it, vi } from 'vitest'

describe('main entrypoint', () => {
  afterEach(() => {
    vi.resetModules()
  })

  it('initializes Temporal and theme before mounting the app', async () => {
    const use = vi.fn().mockReturnThis()
    const mount = vi.fn()
    const createApp = vi.fn(() => ({ use, mount }))
    const initTemporal = vi.fn().mockResolvedValue(undefined)
    const initializeUiTheme = vi.fn()

    vi.doMock('vue', () => ({
      createApp
    }))
    vi.doMock('@tanstack/vue-query', () => ({
      VueQueryPlugin: { install: vi.fn() }
    }))
    vi.doMock('@/app/App.vue', () => ({
      default: { name: 'AppRoot' }
    }))
    vi.doMock('@/app/providers/pinia', () => ({
      pinia: { install: vi.fn() }
    }))
    vi.doMock('@/app/router', () => ({
      router: { install: vi.fn() }
    }))
    vi.doMock('@/app/providers/queryClient', () => ({
      queryClient: { id: 'query-client' }
    }))
    vi.doMock('@/lib/temporal', () => ({
      initTemporal
    }))
    vi.doMock('@/features/session/theme', () => ({
      initializeUiTheme
    }))
    vi.doMock('@fortawesome/fontawesome-free/css/all.min.css', () => ({}))
    vi.doMock('@/styles/app.css', () => ({}))

    await import('./main')

    expect(initTemporal).toHaveBeenCalledTimes(1)
    expect(initializeUiTheme).toHaveBeenCalledTimes(1)
    expect(initTemporal.mock.invocationCallOrder[0]).toBeLessThan(initializeUiTheme.mock.invocationCallOrder[0])
    expect(createApp).toHaveBeenCalledTimes(1)
    expect(use).toHaveBeenCalledTimes(3)
    expect(mount).toHaveBeenCalledWith('#v2-app')
  })
})
