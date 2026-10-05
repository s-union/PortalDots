import { focus, getErrors, getInput, handleSubmit, isDirty, reset, setInput, useForm } from '@formisch/vue'
import { onScopeDispose, toValue, watch, type MaybeRefOrGetter } from 'vue'
import {
  answerFormInputToDraft,
  buildAnswerFormInput,
  getAnswerFormElements,
  type AnswerFormSchema
} from '@/features/forms/answer-form-schema'
import type { FormAnswer, FormAnswerDraft } from '@/features/forms/answers'

interface UseAnswerFormOptions {
  schema: MaybeRefOrGetter<AnswerFormSchema>
  answer: MaybeRefOrGetter<FormAnswer | null>
  disabled: MaybeRefOrGetter<boolean>
  saveAnswer: (draft: FormAnswerDraft) => Promise<FormAnswer | null>
  initialState?: AnswerFormSnapshot
}

export interface AnswerFormSnapshot {
  answer: FormAnswer | null
  dirtyDraft: FormAnswerDraft
}

function equalValue(a: string | string[], b: string | string[] | undefined): boolean {
  if (Array.isArray(a))
    return Array.isArray(b) && a.length === b.length && a.every((value, index) => value === b[index])
  return a === b
}

export function useAnswerForm(options: UseAnswerFormOptions) {
  const schema = () => toValue(options.schema)
  let baselineAnswer = options.initialState ? options.initialState.answer : toValue(options.answer)
  const form = useForm({
    get schema() {
      return schema()
    },
    initialInput: buildAnswerFormInput(schema(), baselineAnswer),
    validate: 'blur',
    revalidate: 'input'
  })
  let answerRevision = 0
  let disposed = false
  onScopeDispose(() => (disposed = true))

  // Only restore edits whose question ID and value kind still match the new schema.
  for (const element of getAnswerFormElements(schema())) {
    const value = options.initialState?.dirtyDraft[element.id]
    if (element.control === 'checkbox' && Array.isArray(value)) {
      setInput(form, { path: ['choices', element.id], input: [...value] })
    } else if (
      element.control !== 'heading' &&
      element.control !== 'upload' &&
      element.control !== 'checkbox' &&
      typeof value === 'string'
    ) {
      setInput(form, { path: ['text', element.id], input: value })
    }
  }

  function currentDraft() {
    return answerFormInputToDraft(schema(), getInput(form))
  }

  function getDirtyDraft(): FormAnswerDraft {
    const draft = currentDraft()
    for (const [id, value] of Object.entries(draft)) {
      if (!isDirty(form, { path: [Array.isArray(value) ? 'choices' : 'text', id] })) delete draft[id]
    }
    return draft
  }

  function resetAnswer(nextAnswer: FormAnswer | null, preserved: FormAnswerDraft = {}, changedAnswer = false) {
    baselineAnswer = nextAnswer
    const initialInput = buildAnswerFormInput(schema(), nextAnswer)
    if (changedAnswer && !form.isSubmitting) {
      reset(form, { initialInput })
      return
    }
    // Field resets retain the submission lifecycle while updating each field's baseline.
    for (const [id, input] of Object.entries(initialInput.text)) {
      const keepInput = typeof preserved[id] === 'string'
      reset(form, {
        path: ['text', id],
        initialInput: input,
        keepInput,
        keepErrors: keepInput,
        keepTouched: keepInput,
        keepEdited: keepInput
      })
    }
    for (const [id, input] of Object.entries(initialInput.choices)) {
      const keepInput = Array.isArray(preserved[id])
      reset(form, {
        path: ['choices', id],
        initialInput: input,
        keepInput,
        keepErrors: keepInput,
        keepTouched: keepInput,
        keepEdited: keepInput
      })
    }
  }

  watch(
    () => toValue(options.answer),
    (nextAnswer) => {
      const changedAnswer = !!baselineAnswer && nextAnswer?.id !== baselineAnswer.id
      if (changedAnswer) answerRevision++
      resetAnswer(nextAnswer, changedAnswer ? {} : getDirtyDraft(), changedAnswer)
    }
  )

  const submit = handleSubmit(form, async (input) => {
    const submittedAnswerId = toValue(options.answer)?.id
    const submittedRevision = answerRevision
    const submittedDraft = answerFormInputToDraft(schema(), input)
    const savedAnswer = await options.saveAnswer(submittedDraft)
    const currentAnswerId = toValue(options.answer)?.id
    const isCurrentAnswer =
      currentAnswerId === submittedAnswerId || (!submittedAnswerId && currentAnswerId === savedAnswer?.id)
    if (!savedAnswer || disposed || submittedRevision !== answerRevision || !isCurrentAnswer) return

    const preserved = currentDraft()
    for (const [id, value] of Object.entries(preserved)) {
      if (equalValue(value, submittedDraft[id])) delete preserved[id]
    }
    resetAnswer(savedAnswer, preserved)
  })

  async function submitEvent(event: SubmitEvent) {
    event.preventDefault()
    if (toValue(options.disabled) || form.isSubmitting) return
    await submit()
    if (disposed || form.isSubmitting) return
    // The grouped storage order must not override the visible question order.
    for (const element of getAnswerFormElements(schema())) {
      if (element.control === 'heading' || element.control === 'upload') continue
      const path = [element.control === 'checkbox' ? 'choices' : 'text', element.id] as const
      if (getErrors(form, { path })) {
        focus(form, { path })
        break
      }
    }
  }

  function getSnapshot(): AnswerFormSnapshot {
    return { answer: baselineAnswer, dirtyDraft: getDirtyDraft() }
  }

  return { form, getSnapshot, submitEvent }
}
