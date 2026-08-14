import { computed, getCurrentScope, onScopeDispose, ref, toValue, watch, type MaybeRefOrGetter, type Ref } from 'vue'
import * as v from 'valibot'

export interface FieldError {
  field: string
  message: string
}

function hasValueRef<T>(value: unknown): value is Ref<T> {
  return typeof value === 'object' && value !== null && 'value' in value
}

type GenericSchema = v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>

export interface UseFormValidationOptions<T extends GenericSchema> {
  /** Valibot schema for validation. Accepts a plain schema, a Ref, or a getter function for dynamic schemas. */
  schema: MaybeRefOrGetter<T>
  /** Reactive form data object */
  form: Ref<v.InferInput<T>> | v.InferInput<T>
  /** Debounce delay in ms (default: 300) */
  debounceMs?: number
}

export interface UseFormValidationReturn<T extends GenericSchema> {
  /** Field-level error messages (key is field name) */
  fieldErrors: Ref<Record<string, string>>
  /** Get error message for a specific field */
  getFieldError: (field: keyof v.InferInput<T>) => string | undefined
  /** Check if a field has an error */
  hasFieldError: (field: keyof v.InferInput<T>) => boolean
  /** Check if the entire form is valid */
  isFormValid: Ref<boolean>
  /** Validate a single field immediately */
  validateField: (field: keyof v.InferInput<T>) => void
  /** Validate the entire form immediately */
  validateAll: () => boolean
  /** Clear all errors */
  clearErrors: () => void
  /** Clear error for a specific field */
  clearFieldError: (field: keyof v.InferInput<T>) => void
  /** Track which fields have been touched */
  touchedFields: Ref<Set<string>>
  /** Mark a field as touched */
  markTouched: (field: keyof v.InferInput<T>) => void
}

/**
 * Composable for form validation with Valibot schemas.
 * Provides real-time validation feedback on touched fields.
 */
export function useFormValidation<T extends GenericSchema>(
  options: UseFormValidationOptions<T>
): UseFormValidationReturn<T> {
  const { schema: schemaSource, form, debounceMs = 300 } = options
  const getSchema = () => toValue(schemaSource)

  const fieldErrors = ref<Record<string, string>>({})
  const touchedFields = ref(new Set<string>())
  const debounceTimers: Record<string, ReturnType<typeof setTimeout> | undefined> = {}

  const clearFieldDebounceTimer = (fieldKey: string) => {
    const timer = debounceTimers[fieldKey]
    if (timer === undefined) {
      return
    }
    clearTimeout(timer)
    delete debounceTimers[fieldKey]
  }

  const scheduleFieldValidation = (fieldKey: string) => {
    clearFieldDebounceTimer(fieldKey)
    debounceTimers[fieldKey] = setTimeout(() => {
      delete debounceTimers[fieldKey]
      if (touchedFields.value.has(fieldKey)) {
        validateFieldByKey(fieldKey)
      }
    }, debounceMs)
  }

  // Get form data regardless of whether it's a ref or plain object
  const getFormData = (): v.InferInput<T> => {
    if (hasValueRef<v.InferInput<T>>(form)) {
      return form.value
    }
    return form
  }

  const validateFieldByKey = (fieldKey: string) => {
    const formData = getFormData()
    const result = v.safeParse(getSchema(), formData)

    if (result.success) {
      // Clear error for this field if validation passes
      const newErrors = { ...fieldErrors.value }
      delete newErrors[fieldKey]
      fieldErrors.value = newErrors
    } else {
      // Find error for this specific field
      const fieldError = result.issues.find((err) => err.path?.[0] && String(err.path[0].key) === fieldKey)

      if (fieldError) {
        fieldErrors.value = {
          ...fieldErrors.value,
          [fieldKey]: fieldError.message
        }
      } else {
        // No error for this field, clear it
        const newErrors = { ...fieldErrors.value }
        delete newErrors[fieldKey]
        fieldErrors.value = newErrors
      }
    }
  }

  const validateField = (field: keyof v.InferInput<T>) => {
    validateFieldByKey(String(field))
  }

  const debouncedValidateField = (field: keyof v.InferInput<T>) => {
    scheduleFieldValidation(String(field))
  }

  const validateAll = (): boolean => {
    const formData = getFormData()
    const result = v.safeParse(getSchema(), formData)

    if (result.success) {
      fieldErrors.value = {}
      return true
    }

    // Collect all errors
    const errors: Record<string, string> = {}
    for (const err of result.issues) {
      const fieldName = err.path?.[0] ? String(err.path[0].key) : ''
      if (fieldName && !errors[fieldName]) {
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

  const clearFieldError = (field: keyof v.InferInput<T>) => {
    const newErrors = { ...fieldErrors.value }
    delete newErrors[String(field)]
    fieldErrors.value = newErrors
  }

  const getFieldError = (field: keyof v.InferInput<T>): string | undefined => {
    return fieldErrors.value[String(field)]
  }

  const hasFieldError = (field: keyof v.InferInput<T>): boolean => {
    return String(field) in fieldErrors.value
  }

  const markTouched = (field: keyof v.InferInput<T>) => {
    touchedFields.value.add(String(field))
    debouncedValidateField(field)
  }

  const isFormValid = computed(() => {
    const formData = getFormData()
    const result = v.safeParse(getSchema(), formData)
    return result.success
  })

  // When schema changes (dynamic schemas), clear errors and touched state
  const stopWatchingSchema = watch(
    () => toValue(schemaSource),
    () => {
      fieldErrors.value = {}
      touchedFields.value = new Set()
    }
  )

  // Watch form data changes and validate touched fields
  const stopWatchingForm = watch(
    () => getFormData(),
    () => {
      // Re-validate all touched fields when form data changes
      for (const field of touchedFields.value) {
        scheduleFieldValidation(field)
      }
    },
    { deep: true, flush: 'sync' }
  )

  const cleanup = () => {
    stopWatchingSchema()
    stopWatchingForm()
    for (const field of Object.keys(debounceTimers)) {
      clearFieldDebounceTimer(field)
    }
  }

  if (getCurrentScope()) {
    onScopeDispose(cleanup)
  }

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
