<script setup lang="ts">
import { computed, onBeforeUnmount } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import Modal from '@/components/ui/Modal.vue'
import { dismissConfirm, pendingConfirm } from './useConfirm'

const modalOpen = computed({
  get: () => pendingConfirm.value !== null,
  set: (value) => {
    if (!value) {
      dismissConfirm(false)
    }
  }
})

onBeforeUnmount(() => {
  dismissConfirm(false)
})
</script>

<template>
  <Modal v-model:open="modalOpen" :title="pendingConfirm?.options.title">
    <p>{{ pendingConfirm?.options.message }}</p>
    <template #footer>
      <BaseButton variant="secondary" type="button" @click="dismissConfirm(false)">
        {{ pendingConfirm?.options.cancelText ?? 'キャンセル' }}
      </BaseButton>
      <BaseButton
        :variant="pendingConfirm?.options.danger ? 'danger' : 'primary'"
        type="button"
        @click="dismissConfirm(true)"
      >
        {{ pendingConfirm?.options.confirmText ?? 'OK' }}
      </BaseButton>
    </template>
  </Modal>
  <slot />
</template>
