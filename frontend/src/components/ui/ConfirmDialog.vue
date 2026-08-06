<script setup lang="ts">
import { computed, provide, ref } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import Modal from '@/components/ui/Modal.vue'
import { confirmInjectionKey, type ConfirmOptions } from './useConfirm'

interface PendingConfirm {
  options: ConfirmOptions
  resolve: (value: boolean) => void
}

const pending = ref<PendingConfirm | null>(null)

const modalOpen = computed({
  get: () => pending.value !== null,
  set: (value) => {
    if (!value) {
      dismiss(false)
    }
  }
})

function confirm(options: ConfirmOptions): Promise<boolean> {
  const previous = pending.value
  if (previous) {
    pending.value = null
    previous.resolve(false)
  }
  return new Promise((resolve) => {
    pending.value = { options, resolve }
  })
}

function dismiss(result: boolean) {
  const current = pending.value
  if (!current) {
    return
  }
  pending.value = null
  current.resolve(result)
}

provide(confirmInjectionKey, { confirm })
</script>

<template>
  <Modal v-model:open="modalOpen" :title="pending?.options.title">
    <p>{{ pending?.options.message }}</p>
    <template #footer>
      <BaseButton variant="secondary" type="button" @click="dismiss(false)">
        {{ pending?.options.cancelText ?? 'キャンセル' }}
      </BaseButton>
      <BaseButton :variant="pending?.options.danger ? 'danger' : 'primary'" type="button" @click="dismiss(true)">
        {{ pending?.options.confirmText ?? 'OK' }}
      </BaseButton>
    </template>
  </Modal>
  <slot />
</template>
