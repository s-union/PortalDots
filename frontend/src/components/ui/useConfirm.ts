import { ref } from 'vue'

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

export interface PendingConfirm {
  options: ConfirmOptions
  resolve: (value: boolean) => void
}

// Module-scope store shared by `useConfirm()` and `<ConfirmDialog>`. Confirmations
// are a singleton resource for the whole app, so the pending state lives here
// rather than in the component — this lets any component call `useConfirm()` no
// matter where `<ConfirmDialog>` is mounted.
export const pendingConfirm = ref<PendingConfirm | null>(null)

export function requestConfirm(options: ConfirmOptions): Promise<boolean> {
  const previous = pendingConfirm.value
  if (previous) {
    pendingConfirm.value = null
    previous.resolve(false)
  }
  return new Promise((resolve) => {
    pendingConfirm.value = { options, resolve }
  })
}

export function dismissConfirm(result: boolean) {
  const current = pendingConfirm.value
  if (!current) {
    return
  }
  pendingConfirm.value = null
  current.resolve(result)
}

export function useConfirm(): ConfirmApi {
  return {
    confirm: requestConfirm
  }
}
