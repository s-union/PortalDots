import type { RouteLocationRaw } from 'vue-router'

const CIRCLE_SELECTOR_PATH = '/circles/select'
const DEFAULT_CIRCLE_SELECTOR_DESTINATION = '/workspace'

export function sanitizeCircleSelectorRedirect(input: string | null | undefined): string | null {
  if (typeof input !== 'string') {
    return null
  }

  const normalized = `/${input.replace(/\n/g, '').replace(/^\/+/, '')}`

  if (normalized === '/' || normalized.startsWith(`${CIRCLE_SELECTOR_PATH}?`) || normalized === CIRCLE_SELECTOR_PATH) {
    return null
  }

  return normalized
}

export function sanitizeCircleSelectorCircleId(input: string | null | undefined): string | null {
  if (typeof input !== 'string') {
    return null
  }

  const normalized = input.replace(/\n/g, '').trim()
  return normalized.length > 0 ? normalized : null
}

export function buildCircleSelectorLocation(redirectTo?: string, circleId?: string): RouteLocationRaw {
  const redirect = sanitizeCircleSelectorRedirect(redirectTo)
  const circle = sanitizeCircleSelectorCircleId(circleId)

  if (redirect === null && circle === null) {
    return CIRCLE_SELECTOR_PATH
  }

  return {
    path: CIRCLE_SELECTOR_PATH,
    query: {
      ...(redirect ? { redirect } : {}),
      ...(circle ? { circle } : {})
    }
  }
}

export function resolveCircleSelectorDestination(redirectTo?: string): string {
  return sanitizeCircleSelectorRedirect(redirectTo) ?? DEFAULT_CIRCLE_SELECTOR_DESTINATION
}
