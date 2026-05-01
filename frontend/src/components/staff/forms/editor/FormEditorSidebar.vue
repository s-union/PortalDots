<script setup lang="ts">
import { allowedQuestionTypes } from '@/features/staff/forms/api'
import { QUESTION_TYPE_META, type AllowedQuestionType } from '@/features/staff/forms/editor/useQuestionTypeMeta'

const emit = defineEmits<{
  addQuestion: [type: AllowedQuestionType]
}>()
</script>

<template>
  <div class="flex h-full min-h-0 flex-col bg-surface-2">
    <div class="border-b border-border bg-surface px-4 py-4">
      <p class="text-sm font-medium text-body">設問を追加</p>
    </div>

    <div class="flex-1 overflow-y-auto">
      <button
        v-for="type in allowedQuestionTypes"
        :key="type"
        class="relative flex w-full items-center gap-3 border-0 bg-transparent px-4 py-3 text-left text-sm text-body transition-colors hover:bg-surface-light"
        type="button"
        @click="emit('addQuestion', type)"
      >
        <span class="w-5 shrink-0 text-center text-muted-2" style="font-size: 1.1rem; line-height: 1">
          {{ QUESTION_TYPE_META[type].icon }}
        </span>
        <span>{{ QUESTION_TYPE_META[type].label }}</span>
        <span class="pointer-events-none absolute inset-x-4 bottom-0 border-b border-border" aria-hidden="true" />
      </button>
    </div>
  </div>
</template>
