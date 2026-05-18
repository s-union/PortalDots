import type { Temporal as TemporalNamespace } from 'temporal-polyfill-lite'

/**
 * Type representing the Temporal global namespace.
 */
export type TemporalGlobal = typeof TemporalNamespace

declare global {
  var Temporal: TemporalGlobal | undefined
}

/**
 * Singleton promise for the polyfill loading operation.
 * Once resolved, subsequent calls are no-ops.
 */
let initPromise: Promise<void> | null = null

/**
 * Checks if native Temporal API is available in this environment.
 * Uses a capability check so native-supporting browsers skip polyfill loading.
 */
function hasNativeTemporal(): boolean {
  return (
    typeof globalThis.Temporal === 'object' &&
    globalThis.Temporal !== null &&
    typeof globalThis.Temporal.Now?.instant === 'function'
  )
}

/**
 * Returns the Temporal global. Assumes initTemporal() has been awaited.
 * Throws if Temporal is not available (programmer error - forgot to initialize).
 */
export function getTemporal(): TemporalGlobal {
  const temporal = globalThis.Temporal
  if (temporal === undefined) {
    throw new Error('[Temporal] Not initialized. Await initTemporal() before using Temporal APIs.')
  }
  return temporal
}

/**
 * Initializes the Temporal API for use in the application.
 * - If native Temporal is available, returns immediately.
 * - Otherwise, dynamically loads the polyfill (once).
 *
 * Call this once at app startup (e.g., in main.ts) before rendering.
 * Safe to call multiple times; subsequent calls are no-ops.
 */
export async function initTemporal(): Promise<void> {
  // Fast path: native Temporal available
  if (hasNativeTemporal()) {
    return
  }

  // Already loading or loaded
  if (initPromise !== null) {
    return initPromise
  }

  initPromise = loadPolyfill()
  return initPromise
}

/**
 * Loads the Temporal polyfill only when needed.
 * Vite keeps this as a separate lazy chunk, so it is not part of the initial app bundle.
 */
async function loadPolyfill(): Promise<void> {
  await import('temporal-polyfill-lite/global')

  if (globalThis.Temporal === undefined) {
    throw new Error('[Temporal] Polyfill loaded but globalThis.Temporal is undefined.')
  }
}
