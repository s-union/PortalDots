import * as v from 'valibot'

const validationErrorSchema = v.object({
  message: v.string(),
  errors: v.record(v.string(), v.array(v.string()))
})

export type ValidationError = v.InferOutput<typeof validationErrorSchema>

export function parseValidationError(value: unknown, label: string): ValidationError {
  const parsed = v.safeParse(validationErrorSchema, value)
  if (!parsed.success) {
    throw new Error(`Invalid ${label} validation error`)
  }

  return parsed.output
}

export function extractValidationMessage(error: unknown, fallback: string) {
  const cause = unwrapValidationError(error)
  if (!cause) {
    return fallback
  }

  for (const messages of Object.values(cause.errors)) {
    if (messages.length > 0) {
      return messages[0]
    }
  }

  return fallback
}

export function unwrapValidationError(error: unknown): ValidationError | null {
  if (!(error instanceof Error)) {
    return null
  }

  const cause: unknown = hasErrorCause(error) ? error.cause : undefined
  return isValidationError(cause) ? cause : null
}

function isValidationError(value: unknown): value is ValidationError {
  return v.safeParse(validationErrorSchema, value).success
}

function hasErrorCause(error: Error): error is Error & { cause: unknown } {
  return 'cause' in error
}
