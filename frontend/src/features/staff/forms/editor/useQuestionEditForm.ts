import { computed, onScopeDispose, watch } from 'vue'
import { getInput, handleSubmit, isDirty, reset, setErrors, useForm, validate } from '@formisch/vue'
import type { StaffFormQuestion, UpdateStaffFormQuestionPayload } from '@/features/staff/forms/api'
import { extractValidationMessage, unwrapValidationError } from '@/lib/api/validation'
import {
  buildQuestionEditInput,
  buildQuestionEditSchema,
  questionEditFields,
  type QuestionEditInput
} from './question-edit-schema'
import { normalizeOptions } from '@/lib/parseOptions'

export function useQuestionEditForm(options: {
  question: () => StaffFormQuestion
  paused: () => boolean
  save: (payload: UpdateStaffFormQuestionPayload) => Promise<StaffFormQuestion | null>
}) {
  const form = useForm({
    get schema() {
      return buildQuestionEditSchema(options.question().type)
    },
    initialInput: buildQuestionEditInput(options.question()),
    validate: 'blur',
    revalidate: 'input'
  })
  let disposed = false
  let queued = false
  let saving = false
  let failed = false
  let submitted: Partial<QuestionEditInput> = {}
  onScopeDispose(() => {
    disposed = true
  })

  function accept(question: StaffFormQuestion, submitted?: Partial<QuestionEditInput>) {
    const input = buildQuestionEditInput(question)
    for (const key of questionEditFields) {
      const path = [key] as const
      const keepInput = submitted ? !Object.is(getInput(form, { path }), submitted[key]) : isDirty(form, { path })
      reset(form, {
        path,
        initialInput: input[key],
        keepInput,
        keepErrors: keepInput,
        keepTouched: keepInput,
        keepEdited: keepInput
      })
    }
    // Cross-field rules can change when a clean field accepts a server value.
    if (form.isSubmitted && form.isDirty && !failed) void validate(form, { shouldFocus: false })
  }
  watch(options.question, (question) => {
    // A field reset invalidates pending validation, so retry the requested save.
    if (form.isSubmitting && !saving) queued = true
    accept(question)
  })

  const submit = handleSubmit(form, async (input) => {
    const question = options.question()
    saving = true
    try {
      const result = await options.save({ ...input, id: question.id, type: question.type, priority: question.priority })
      if (!result || disposed) return
      accept(result, submitted)
    } catch (error) {
      failed = true
      if (disposed) return
      setErrors(form, { errors: [extractValidationMessage(error, '設問の保存に失敗しました。')] })
      const validation = unwrapValidationError(error)
      for (const key of questionEditFields) {
        const errors = validation?.errors[key]
        const first = errors?.[0]
        if (errors && first && Object.is(getInput(form, { path: [key] }), submitted[key])) {
          setErrors(form, { path: [key], errors: [first, ...errors.slice(1)] })
        }
      }
    } finally {
      saving = false
    }
  })

  async function requestSave() {
    if (disposed) return
    if (form.isSubmitting || options.paused()) {
      queued = true
      return
    }
    do {
      queued = false
      if (!form.isDirty) return
      failed = false
      submitted = getInput(form)
      setErrors(form, { errors: null })
      await submit()
      // Failed requests require an explicit retry; later blur events queue the latest input.
      if (disposed || failed) {
        queued = false
        return
      }
    } while (queued && !options.paused())
  }
  watch(options.paused, (paused) => {
    if (!paused && queued) void requestSave()
  })

  const edit = computed(() => {
    const question = options.question()
    const input = getInput(form)
    return {
      ...question,
      name: input.name ?? '',
      description: input.description ?? '',
      isRequired: input.isRequired ?? false,
      numberMin: input.numberMin ? Number(input.numberMin) : null,
      numberMax: input.numberMax ? Number(input.numberMax) : null,
      allowedTypes: input.allowedTypes ?? '',
      options: normalizeOptions(input.options ?? '')
    }
  })
  return { form, edit, requestSave }
}
