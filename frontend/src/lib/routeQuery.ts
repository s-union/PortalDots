import * as v from 'valibot'

const routeStringSchema = v.string()
const routeParamsSchema = v.record(v.string(), v.unknown())
const positiveIntegerSchema = v.pipe(
  v.unknown(),
  v.transform((val) => Number(val)),
  v.number(),
  v.integer(),
  v.minValue(1)
)

export function routeString(value: unknown, fallback = '') {
  const result = v.safeParse(routeStringSchema, value)
  return result.success ? result.output : fallback
}

export function optionalRouteString(value: unknown) {
  const result = v.safeParse(routeStringSchema, value)
  return result.success ? result.output : undefined
}

export function routePositiveInteger(value: unknown, fallback = 1) {
  const result = v.safeParse(positiveIntegerSchema, value)
  return result.success ? result.output : fallback
}

export function routeParamString(params: unknown, key: string, fallback = '') {
  const result = v.safeParse(routeParamsSchema, params)
  return result.success ? routeString(result.output[key], fallback) : fallback
}

export function optionalRouteParamString(params: unknown, key: string) {
  const result = v.safeParse(routeParamsSchema, params)
  return result.success ? optionalRouteString(result.output[key]) : undefined
}
