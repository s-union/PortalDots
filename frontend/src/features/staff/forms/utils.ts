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
    isPublic: false
  }
}

export function parseStaffFormTags(value: string) {
  return parseTagString(value)
}

export function formatStaffFormTags(tags: string[]) {
  return formatTags(tags)
}
