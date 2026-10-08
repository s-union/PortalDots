import { nowPlusOneHourISO, plusDaysEndOfDayISO } from '@/lib/format/datetime'
import { parseTagString, formatTags } from '@/lib/tags'
import type { CreateStaffFormPayload } from './api'

export function createDefaultStaffFormPayload(): CreateStaffFormPayload {
  const openAtISO = nowPlusOneHourISO()
  const closeAtISO = plusDaysEndOfDayISO(openAtISO, 14)

  return {
    name: '',
    description: '',
    openAt: openAtISO,
    closeAt: closeAtISO,
    maxAnswers: 1,
    answerableTags: [],
    confirmationMessage: '',
    staffNotificationUserIds: [],
    isPublic: false
  }
}

export function parseStaffFormTags(value: string) {
  return parseTagString(value)
}

export function formatStaffFormTags(tags: string[]) {
  return formatTags(tags)
}

export function staffFormSettingsInput(form?: CreateStaffFormPayload): CreateStaffFormPayload {
  return {
    name: form?.name ?? '',
    description: form?.description ?? '',
    openAt: form?.openAt ?? '',
    closeAt: form?.closeAt ?? '',
    maxAnswers: form?.maxAnswers ?? 1,
    answerableTags: [...(form?.answerableTags ?? [])],
    confirmationMessage: form?.confirmationMessage ?? '',
    staffNotificationUserIds: [...(form?.staffNotificationUserIds ?? [])],
    isPublic: form?.isPublic ?? false
  }
}
