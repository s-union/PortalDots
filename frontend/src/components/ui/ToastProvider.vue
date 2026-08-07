<script setup lang="ts">
import type { IconName } from '@fortawesome/fontawesome-svg-core'
import FaIcon from '@/components/ui/FaIcon.vue'
import { dismissToast, toasts, type ToastType } from './useToast'

const toastToneClass: Record<ToastType, string> = {
  success: 'border-success bg-success-light text-success',
  error: 'border-danger bg-danger-light text-danger',
  info: 'border-primary bg-primary-light text-primary'
}

const toastIconName: Record<ToastType, IconName> = {
  success: 'check-circle',
  error: 'exclamation-circle',
  info: 'info-circle'
}
</script>

<template>
  <slot />
  <TransitionGroup
    name="toast"
    tag="div"
    class="pointer-events-none fixed bottom-6 left-1/2 z-[9985] flex w-[min(calc(100vw-2rem),30rem)] -translate-x-1/2 flex-col gap-2 max-[1000px]:bottom-[calc(5rem+env(safe-area-inset-bottom))]"
  >
    <div
      v-for="toast in toasts"
      :key="toast.id"
      :role="toast.type === 'error' ? 'alert' : 'status'"
      :aria-live="toast.type === 'error' ? 'assertive' : 'polite'"
      class="pointer-events-auto flex items-start gap-3 rounded border px-4 py-3 shadow-lv2"
      :class="toastToneClass[toast.type]"
    >
      <FaIcon :name="toastIconName[toast.type]" class-name="mt-1 text-base" />
      <p class="my-0 min-w-0 grow break-words text-base">{{ toast.message }}</p>
      <button
        type="button"
        class="mt-0.5 rounded text-base leading-none opacity-60 transition hover:opacity-100"
        aria-label="通知を閉じる"
        @click="dismissToast(toast.id)"
      >
        <FaIcon name="times" class-name="text-sm" />
      </button>
    </div>
  </TransitionGroup>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(0.5rem);
}

@media (prefers-reduced-motion: reduce) {
  .toast-enter-active,
  .toast-leave-active {
    transition: none;
  }

  .toast-enter-from,
  .toast-leave-to {
    opacity: 1;
    transform: none;
  }
}
</style>
