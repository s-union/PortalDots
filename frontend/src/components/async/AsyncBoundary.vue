<script setup lang="ts">
import { ref, onErrorCaptured } from 'vue'
import AlertMessage from '@/components/ui/AlertMessage.vue'

const { suspenseKey } = defineProps<{
  suspenseKey?: string | number
}>()

const error = ref<Error | null>(null)
const retryCount = ref(0)

onErrorCaptured((err) => {
  error.value = err instanceof Error ? err : new Error(String(err))
  return false
})

function retry() {
  error.value = null
  retryCount.value++
}
</script>

<template>
  <div v-if="error">
    <slot name="error" :error="error" :retry="retry">
      <AlertMessage tone="danger">
        {{ error.message || 'データの読み込みに失敗しました。' }}
      </AlertMessage>
      <button
        class="mt-3 rounded border border-border bg-surface px-4 py-2 text-sm text-body transition hover:bg-surface-light"
        type="button"
        @click="retry"
      >
        再試行
      </button>
    </slot>
  </div>
  <Suspense v-else :key="suspenseKey !== undefined ? `${suspenseKey}-${retryCount}` : retryCount">
    <template #default>
      <slot />
    </template>
    <template #fallback>
      <slot name="fallback">
        <div class="rounded border border-border bg-surface p-6 text-muted shadow-lv1">読み込み中...</div>
      </slot>
    </template>
  </Suspense>
</template>
