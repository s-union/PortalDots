export const STALE_TIME = {
  MASTER_DATA: 5 * 60 * 1000,
  SESSION: 60 * 1000,
  PUBLIC_CONFIG: 10 * 60 * 1000,
  DYNAMIC: 30 * 1000
} as const

export const GC_TIME = 5 * 60 * 1000
