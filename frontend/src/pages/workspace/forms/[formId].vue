<script setup lang="ts">
definePage({
  meta: {
    requiresAuth: true,
    requiresCircle: true
  }
})

import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import WorkspaceFormDetailContent from '@/features/forms/components/WorkspaceFormDetailContent.vue'
import { routeString } from '@/lib/routeQuery'

const route = useRoute('/workspace/forms/[formId]')
const router = useRouter()
const formId = computed(() => String(route.params.formId ?? ''))
const selectedAnswerId = computed(() => routeString(route.query.answer))

async function handleSelectAnswer(answerId: string) {
  await router.replace({
    query: {
      ...route.query,
      answer: answerId
    }
  })
}

async function handleClearSelectedAnswer() {
  const nextQuery = { ...route.query }
  delete nextQuery.answer
  await router.replace({ query: nextQuery })
}
</script>

<template>
  <WorkspaceFormDetailContent
    :form-id="formId"
    :selected-answer-id="selectedAnswerId"
    @select-answer="handleSelectAnswer"
    @clear-selected-answer="handleClearSelectedAnswer"
  />
</template>
