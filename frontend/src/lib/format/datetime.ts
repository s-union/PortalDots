import { getTemporal, type TemporalGlobal } from '@/lib/temporal'

const TIME_ZONE = 'Asia/Tokyo'

/**
 * ISO 8601 文字列を「2026年3月3日(月) 09:00」形式にフォーマットする。
 * 空文字列や不正な値の場合はそのまま返す。
 */
export function formatDateTime(value: string): string {
  const zdt = toZonedDateTime(value)
  if (zdt === null) {
    return value
  }

  const weekday = weekdayName(zdt.dayOfWeek)
  return `${zdt.year}年${zdt.month}月${zdt.day}日(${weekday}) ${pad(zdt.hour)}:${pad(zdt.minute)}`
}

/**
 * ISO 8601 文字列を「2026年3月3日(月)」形式（日付のみ）にフォーマットする。
 */
export function formatDate(value: string): string {
  const zdt = toZonedDateTime(value)
  if (zdt === null) {
    return value
  }

  const weekday = weekdayName(zdt.dayOfWeek)
  return `${zdt.year}年${zdt.month}月${zdt.day}日(${weekday})`
}

/**
 * ISO 8601 文字列を「2026年3月3日(月) 09:00 更新」形式にフォーマットする。
 */
export function formatDateTimeUpdated(value: string): string {
  return `${formatDateTime(value)} 更新`
}

/**
 * ISO 8601 文字列を HTML の datetime-local input 用の値に変換する。
 * ローカルタイムゾーン (Asia/Tokyo) で「YYYY-MM-DDTHH:mm」形式を返す。
 */
export function formatDateTimeLocalValue(value: string): string {
  const zdt = toZonedDateTime(value)
  if (zdt === null) {
    return value
  }

  return `${zdt.year}-${pad(zdt.month)}-${pad(zdt.day)}T${pad(zdt.hour)}:${pad(zdt.minute)}`
}

/**
 * HTML datetime-local input の値を ISO 8601 文字列に変換する。
 * 前回の値が渡された場合、秒・ミリ秒を保持する。
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
    return value
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
