import { z } from 'zod'

const validationErrorSchema = z.object({
  message: z.string(),
  errors: z.record(z.string(), z.array(z.string()))
})

export type ValidationError = z.infer<typeof validationErrorSchema>

export function parseValidationError(value: unknown, label: string): ValidationError {
  const parsed = validationErrorSchema.safeParse(value)
  if (!parsed.success) {
    throw new Error(`Invalid ${label} validation error`)
  }

  return parsed.data
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
  return validationErrorSchema.safeParse(value).success
}

function hasErrorCause(error: Error): error is Error & { cause: unknown } {
  return 'cause' in error
}
