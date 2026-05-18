<script setup lang="ts">
import { computed } from 'vue'
import { cn } from '@/lib/ui/cn'
import { calculateTotalPages } from '@/lib/pagination'
import { buttonVariants } from '@/lib/ui/variants'

const {
  page,
  pageSize,
  total,
  bordered = true,
  class: className
} = defineProps<{
  page: number
  pageSize: number
  total: number
  bordered?: boolean
  class?: string
}>()

const emit = defineEmits<{
  'update:page': [page: number]
}>()

const totalPages = computed(() => calculateTotalPages(total, pageSize))
const startIndex = computed(() => (total === 0 ? 0 : (page - 1) * pageSize + 1))
const endIndex = computed(() => Math.min(page * pageSize, total))

function movePage(nextPage: number) {
  const normalized = Math.min(Math.max(nextPage, 1), totalPages.value)
  emit('update:page', normalized)
}
</script>

<template>
  <footer
    class="flex flex-wrap items-center justify-between gap-4 px-5 py-4 text-sm text-muted"
    :class="cn(bordered ? 'rounded border border-border bg-surface shadow-lv1' : 'border-t border-border', className)"
  >
    <p>
      {{ total }} 件中
      {{ startIndex }}
      -
      {{ endIndex }}
      件
    </p>
    <div class="flex items-center gap-3">
      <button
        :class="buttonVariants({ variant: 'secondary', size: 'md' })"
        :disabled="page <= 1"
        type="button"
        @click="movePage(page - 1)"
      >
        前へ
      </button>
      <span>{{ page }} / {{ totalPages }}</span>
      <button
        :class="buttonVariants({ variant: 'secondary', size: 'md' })"
        :disabled="page >= totalPages"
        type="button"
        @click="movePage(page + 1)"
      >
        次へ
      </button>
    </div>
  </footer>
</template>
