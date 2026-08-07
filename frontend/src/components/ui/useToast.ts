import { ref } from 'vue'

export type ToastType = 'info' | 'success' | 'error'

export interface ToastOptions {
  duration?: number
}

export interface ToastItem {
  id: number
  type: ToastType
  message: string
  duration: number
}

export interface ToastApi {
  success: (message: string, options?: ToastOptions) => number
  error: (message: string, options?: ToastOptions) => number
  info: (message: string, options?: ToastOptions) => number
  dismiss: (id: number) => void
}

export const DEFAULT_TOAST_DURATION = 5000

// Module-scope store shared by `useToast()` and `<ToastProvider>`. Toasts are a
// singleton resource for the whole app, so the state lives here rather than in
// the provider component — this lets any component call `useToast()` no matter
// where `<ToastProvider>` is mounted.
export const toasts = ref<ToastItem[]>([])

const timers = new Map<number, ReturnType<typeof setTimeout>>()
let nextId = 1

function pushToast(type: ToastType, message: string, options?: ToastOptions): number {
  const duration = options?.duration ?? DEFAULT_TOAST_DURATION
  const id = nextId++
  toasts.value.push({ id, type, message, duration })
  if (duration > 0) {
    timers.set(
      id,
      setTimeout(() => dismissToast(id), duration)
    )
  }
  return id
}

export function dismissToast(id: number) {
  const timer = timers.get(id)
  if (timer) {
    clearTimeout(timer)
    timers.delete(id)
  }
  toasts.value = toasts.value.filter((toast) => toast.id !== id)
}

export function useToast(): ToastApi {
  return {
    success: (message, options) => pushToast('success', message, options),
    error: (message, options) => pushToast('error', message, options),
    info: (message, options) => pushToast('info', message, options),
    dismiss: dismissToast
  }
}
