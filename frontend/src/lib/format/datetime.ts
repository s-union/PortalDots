import { getTemporal, type TemporalGlobal } from '@/lib/temporal'

const TIME_ZONE = 'Asia/Tokyo'

/**
 * Formats an ISO 8601 string as `2026年3月3日(火) 09:00`.
 * Returns a placeholder for empty or invalid input.
 */
export function formatDateTime(value: string): string {
  const zdt = toZonedDateTime(value)
  if (zdt === null) {
    return '-'
  }

  const weekday = weekdayName(zdt.dayOfWeek)
  return `${zdt.year}年${zdt.month}月${zdt.day}日(${weekday}) ${pad(zdt.hour)}:${pad(zdt.minute)}`
}

/**
 * Formats an ISO 8601 string as `2026/03/03 09:00:00` for staff tables.
 */
export function formatDateTimeTable(value: string): string {
  const zdt = toZonedDateTime(value)
  if (zdt === null) {
    return '-'
  }

  return `${zdt.year}/${pad(zdt.month)}/${pad(zdt.day)} ${pad(zdt.hour)}:${pad(zdt.minute)}:${pad(zdt.second)}`
}

/**
 * Formats an ISO 8601 string as a date-only value such as `2026年3月3日(火)`.
 */
export function formatDate(value: string): string {
  const zdt = toZonedDateTime(value)
  if (zdt === null) {
    return '-'
  }

  const weekday = weekdayName(zdt.dayOfWeek)
  return `${zdt.year}年${zdt.month}月${zdt.day}日(${weekday})`
}

/**
 * Formats an ISO 8601 string as `2026年3月3日(火) 09:00 更新`.
 */
export function formatDateTimeUpdated(value: string): string {
  const formatted = formatDateTime(value)
  return formatted === '-' ? '-' : `${formatted} 更新`
}

/**
 * Converts an ISO 8601 string to an HTML datetime-local value in Asia/Tokyo.
 * Returns an empty value when the input is invalid.
 */
export function formatDateTimeLocalValue(value: string): string {
  const zdt = toZonedDateTime(value)
  if (zdt === null) {
    return ''
  }

  return `${zdt.year}-${pad(zdt.month)}-${pad(zdt.day)}T${pad(zdt.hour)}:${pad(zdt.minute)}`
}

/**
 * Converts an HTML datetime-local value to an ISO 8601 string.
 * Preserves seconds and milliseconds when the previous value is valid.
 */
export function parseDateTimeLocalValue(value: string, previousISOValue = ''): string {
  if (value.trim().length === 0) {
    return ''
  }

  const Temporal = getTemporal()

  let second = 0
  let millisecond = 0

  if (previousISOValue.trim().length > 0) {
    const prevZdt = toZonedDateTime(previousISOValue)
    if (prevZdt !== null && formatDateTimeLocalValue(previousISOValue) === value) {
      second = prevZdt.second
      millisecond = prevZdt.millisecond
    }
  }

  try {
    const pdt = Temporal.PlainDateTime.from(value)
    const zdt = pdt.toZonedDateTime(TIME_ZONE)
    const adjusted = zdt.with({ second, millisecond })
    return adjusted.toInstant().toString()
  } catch {
    return toZonedDateTime(previousISOValue) === null ? '' : previousISOValue
  }
}

/**
 * 現在時刻から1時間後（分を0に切り上げ）のISO文字列を返す。
 */
export function nowPlusOneHourISO(): string {
  const Temporal = getTemporal()
  const now = Temporal.Now.zonedDateTimeISO(TIME_ZONE)
  const rounded = now.with({ minute: 0, second: 0, millisecond: 0, nanosecond: 0 })
  return rounded.add({ hours: 1 }).toInstant().toString()
}

/**
 * 指定日数後の 23:59:59 のISO文字列を返す。
 */
export function plusDaysEndOfDayISO(isoValue: string, days: number): string {
  const zdt = toZonedDateTime(isoValue)
  if (zdt === null) {
    return isoValue
  }

  const added = zdt.add({ days })
  return added.with({ hour: 23, minute: 59, second: 59, millisecond: 0, nanosecond: 0 }).toInstant().toString()
}

function toZonedDateTime(value: string): InstanceType<TemporalGlobal['ZonedDateTime']> | null {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null
  }

  try {
    const Temporal = getTemporal()
    const instant = Temporal.Instant.from(value)
    return instant.toZonedDateTimeISO(TIME_ZONE)
  } catch {
    return null
  }
}

const WEEKDAYS = ['月', '火', '水', '木', '金', '土', '日'] as const

function weekdayName(dayOfWeek: number): string {
  return WEEKDAYS[dayOfWeek - 1] ?? ''
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}
