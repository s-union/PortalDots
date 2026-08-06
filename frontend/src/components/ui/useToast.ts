import { inject, type InjectionKey } from 'vue'

export type ToastType = 'info' | 'success' | 'error'

export interface ToastOptions {
  duration?: number
}

export interface ToastApi {
  success: (message: string, options?: ToastOptions) => number
  error: (message: string, options?: ToastOptions) => number
  info: (message: string, options?: ToastOptions) => number
  dismiss: (id: number) => void
}

export const DEFAULT_TOAST_DURATION = 5000

export const toastInjectionKey: InjectionKey<ToastApi> = Symbol('toast')

export function useToast(): ToastApi {
  const api = inject(toastInjectionKey, null)
  if (!api) {
    throw new Error('useToast() must be called within a <ToastProvider> component')
  }
  return api
}
