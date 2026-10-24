import { computed } from 'vue'
import { getInput } from '@formisch/vue'
import type { StaffFormQuestion, UpdateStaffFormQuestionPayload } from '@/features/staff/forms/api'
import { extractValidationMessage } from '@/lib/api/validation'
import { useServerSyncedForm } from '@/features/forms/composables/useServerSyncedForm'
import { buildQuestionEditInput, buildQuestionEditSchema } from './question-edit-schema'
import { normalizeOptions } from '@/lib/parseOptions'

export function useQuestionEditForm(options: {
  question: () => StaffFormQuestion
  paused: () => boolean
  save: (payload: UpdateStaffFormQuestionPayload) => Promise<StaffFormQuestion | null>
}) {
  const { form, submitEvent } = useServerSyncedForm({
    schema: () => buildQuestionEditSchema(options.question()),
    input: () => buildQuestionEditInput(options.question()),
    source: options.question,
    sourceKey: () => options.question().id,
    paused: options.paused,
    mode: 'autosave',
    errorMessage: (error) => extractValidationMessage(error, '設問の保存に失敗しました。'),
    saveInput: async (input) => {
      const question = options.question()
      const saved = await options.save({ ...input, id: question.id, type: question.type, priority: question.priority })
      return saved ? { input: buildQuestionEditInput(saved), sourceKey: saved.id } : null
    }
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
  return { form, edit, requestSave: () => submitEvent() }
}
