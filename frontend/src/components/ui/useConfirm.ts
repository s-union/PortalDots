import { inject, type InjectionKey } from 'vue'

export interface ConfirmOptions {
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
}

export interface ConfirmApi {
  confirm: (options: ConfirmOptions) => Promise<boolean>
}

export const confirmInjectionKey: InjectionKey<ConfirmApi> = Symbol('confirm')

export function useConfirm(): ConfirmApi {
  const api = inject(confirmInjectionKey, null)
  if (!api) {
    throw new Error('useConfirm() must be called within a <ConfirmDialog> component')
  }
  return api
}
