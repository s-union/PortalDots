import { z } from 'zod'

const routeStringSchema = z.string()
const routeParamsSchema = z.record(z.string(), z.unknown())
const positiveIntegerSchema = z.coerce.number().int().positive()

export function routeString(value: unknown, fallback = '') {
  const result = routeStringSchema.safeParse(value)
  return result.success ? result.data : fallback
}

export function optionalRouteString(value: unknown) {
  const result = routeStringSchema.safeParse(value)
  return result.success ? result.data : undefined
}

export function routePositiveInteger(value: unknown, fallback = 1) {
  const result = positiveIntegerSchema.safeParse(value)
  return result.success ? result.data : fallback
}

export function routeParamString(params: unknown, key: string, fallback = '') {
  const result = routeParamsSchema.safeParse(params)
  return result.success ? routeString(result.data[key], fallback) : fallback
}

export function optionalRouteParamString(params: unknown, key: string) {
  const result = routeParamsSchema.safeParse(params)
  return result.success ? optionalRouteString(result.data[key]) : undefined
}
