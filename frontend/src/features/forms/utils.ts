import { formatDateTime } from '@/lib/format/datetime'
import type { FormSummary } from '@/features/forms/api'

export function isLimitedForm(form: FormSummary) {
  return form.answerableTags.length > 0
}

export function formatOpenFormMeta(form: FormSummary) {
  const schedule = `${formatDateTime(form.closeAt)} まで受付`
  return form.maxAnswers > 1 ? `${schedule} • 1企画あたり${form.maxAnswers}つ回答可能` : schedule
}
