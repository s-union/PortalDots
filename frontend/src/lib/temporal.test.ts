import { afterEach, describe, expect, it, vi } from 'vitest'

interface TemporalMock {
  Now: {
    instant: () => string
  }
}

function buildTemporalMock(): TemporalMock {
  return {
    Now: {
      instant: () => 'instant'
    }
  }
}

async function loadTemporalModule() {
  return import('./temporal')
}

describe('temporal', () => {
  afterEach(() => {
    vi.resetModules()
    vi.doUnmock('temporal-polyfill-lite/global')
    globalThis.Temporal = undefined
  })

  it('throws when getTemporal is called before initialization', async () => {
    globalThis.Temporal = undefined

    const temporalModule = await loadTemporalModule()

    expect(() => temporalModule.getTemporal()).toThrow('Await initTemporal() before using Temporal APIs.')
  })

  it('skips loading the polyfill when Temporal is already available', async () => {
    const loadPolyfill = vi.fn()
    globalThis.Temporal = buildTemporalMock()

    vi.doMock('temporal-polyfill-lite/global', () => {
      loadPolyfill()
      return {}
    })

    const temporalModule = await loadTemporalModule()
    await temporalModule.initTemporal()

    expect(loadPolyfill).not.toHaveBeenCalled()
    expect(temporalModule.getTemporal()).toBe(globalThis.Temporal)
  })

  it('loads the polyfill only once when Temporal is missing', async () => {
    const polyfilledTemporal = buildTemporalMock()
    const loadPolyfill = vi.fn(() => {
      globalThis.Temporal = polyfilledTemporal
    })

    globalThis.Temporal = undefined

    vi.doMock('temporal-polyfill-lite/global', () => {
      loadPolyfill()
      return {}
    })

    const temporalModule = await loadTemporalModule()
    await Promise.all([temporalModule.initTemporal(), temporalModule.initTemporal()])

    expect(loadPolyfill).toHaveBeenCalledTimes(1)
    expect(temporalModule.getTemporal()).toBe(polyfilledTemporal)
  })

  it('throws when the polyfill does not populate the Temporal global', async () => {
    globalThis.Temporal = undefined

    vi.doMock('temporal-polyfill-lite/global', () => ({}))

    const temporalModule = await loadTemporalModule()

    await expect(temporalModule.initTemporal()).rejects.toThrow('Polyfill loaded but globalThis.Temporal is undefined.')
  })
})
