import { computed, ref, watch, type Ref } from 'vue'
import type { z } from 'zod'

export interface FieldError {
  field: string
  message: string
}

function hasValueRef<T>(value: unknown): value is Ref<T> {
  return typeof value === 'object' && value !== null && 'value' in value
}

export interface UseFormValidationOptions<T extends z.ZodTypeAny> {
  /** Zod schema for validation */
  schema: T
  /** Reactive form data object */
  form: Ref<z.input<T>> | z.input<T>
  /** Debounce delay in ms (default: 300) */
  debounceMs?: number
}

export interface UseFormValidationReturn<T extends z.ZodTypeAny> {
  /** Field-level error messages (key is field name) */
  fieldErrors: Ref<Record<string, string>>
  /** Get error message for a specific field */
  getFieldError: (field: keyof z.input<T>) => string | undefined
  /** Check if a field has an error */
  hasFieldError: (field: keyof z.input<T>) => boolean
  /** Check if the entire form is valid */
  isFormValid: Ref<boolean>
  /** Validate a single field immediately */
  validateField: (field: keyof z.input<T>) => void
  /** Validate the entire form immediately */
  validateAll: () => boolean
  /** Clear all errors */
  clearErrors: () => void
  /** Clear error for a specific field */
  clearFieldError: (field: keyof z.input<T>) => void
  /** Track which fields have been touched */
  touchedFields: Ref<Set<string>>
  /** Mark a field as touched */
  markTouched: (field: keyof z.input<T>) => void
}

/**
 * Composable for form validation with Zod schemas.
 * Provides real-time validation feedback on touched fields.
 */
export function useFormValidation<T extends z.ZodTypeAny>(
  options: UseFormValidationOptions<T>
): UseFormValidationReturn<T> {
  const { schema, form, debounceMs = 300 } = options

  const fieldErrors = ref<Record<string, string>>({})
  const touchedFields = ref(new Set<string>())
  const debounceTimers: Record<string, ReturnType<typeof setTimeout>> = {}

  // Get form data regardless of whether it's a ref or plain object
  const getFormData = (): z.input<T> => {
    if (hasValueRef<z.input<T>>(form)) {
      return form.value
    }
    return form
  }

  const validateField = (field: keyof z.input<T>) => {
    const fieldStr = String(field)
    const formData = getFormData()
    const result = schema.safeParse(formData)

    if (result.success) {
      // Clear error for this field if validation passes
      const newErrors = { ...fieldErrors.value }
      delete newErrors[fieldStr]
      fieldErrors.value = newErrors
    } else {
      // Find error for this specific field
      const fieldError = result.error.issues.find((err) => err.path[0] === fieldStr)

      if (fieldError) {
        fieldErrors.value = {
          ...fieldErrors.value,
          [fieldStr]: fieldError.message
        }
      } else {
        // No error for this field, clear it
        const newErrors = { ...fieldErrors.value }
        delete newErrors[fieldStr]
        fieldErrors.value = newErrors
      }
    }
  }

  const debouncedValidateField = (field: keyof z.input<T>) => {
    const fieldStr = String(field)

    if (debounceTimers[fieldStr]) {
      clearTimeout(debounceTimers[fieldStr])
    }

    debounceTimers[fieldStr] = setTimeout(() => {
      if (touchedFields.value.has(fieldStr)) {
        validateField(field)
      }
    }, debounceMs)
  }

  const validateAll = (): boolean => {
    const formData = getFormData()
    const result = schema.safeParse(formData)

    if (result.success) {
      fieldErrors.value = {}
      return true
    }

    // Collect all errors
    const errors: Record<string, string> = {}
    for (const err of result.error.issues) {
      const fieldName = String(err.path[0])
      if (!errors[fieldName]) {
        errors[fieldName] = err.message
      }
    }
    fieldErrors.value = errors

    // Mark all fields as touched
    if (typeof formData === 'object' && formData !== null) {
      for (const key of Object.keys(formData)) {
        touchedFields.value.add(key)
      }
    }

    return false
  }

  const clearErrors = () => {
    fieldErrors.value = {}
  }

  const clearFieldError = (field: keyof z.input<T>) => {
    const newErrors = { ...fieldErrors.value }
    delete newErrors[String(field)]
    fieldErrors.value = newErrors
  }

  const getFieldError = (field: keyof z.input<T>): string | undefined => {
    return fieldErrors.value[String(field)]
  }

  const hasFieldError = (field: keyof z.input<T>): boolean => {
    return String(field) in fieldErrors.value
  }

  const markTouched = (field: keyof z.input<T>) => {
    touchedFields.value.add(String(field))
    debouncedValidateField(field)
  }

  const isFormValid = computed(() => {
    const formData = getFormData()
    const result = schema.safeParse(formData)
    return result.success
  })

  // Watch form data changes and validate touched fields
  watch(
    () => getFormData(),
    () => {
      // Re-validate all touched fields when form data changes
      for (const field of touchedFields.value) {
        debouncedValidateField(field as keyof z.input<T>)
      }
    },
    { deep: true, flush: 'sync' }
  )

  return {
    fieldErrors,
    getFieldError,
    hasFieldError,
    isFormValid,
    validateField,
    validateAll,
    clearErrors,
    clearFieldError,
    touchedFields,
    markTouched
  }
}
