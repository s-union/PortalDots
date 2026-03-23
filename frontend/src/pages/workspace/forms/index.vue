<script setup lang="ts">
definePage({
  meta: {
    requiresAuth: true,
    requiresCircle: true
  }
})

import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ListItemLink from '@/components/ui/ListItemLink.vue'
import ListPanel from '@/components/ui/ListPanel.vue'
import PageContentContainer from '@/components/ui/PageContentContainer.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import { useFormsQuery, type FormSummary } from '@/features/forms/api'
import { useSessionStore } from '@/features/session/store'

type FormStatusTab = 'open' | 'closed' | 'all'

const route = useRoute()
const router = useRouter()
const sessionStore = useSessionStore()
const formsQuery = useFormsQuery()
const formStatusTab = computed<FormStatusTab>(() => {
  const status = route.query.status

  if (status === 'closed' || status === 'all') {
    return status
  }

  return 'open'
})
const allForms = computed(() => formsQuery.data.value ?? [])
const openForms = computed(() => allForms.value.filter((form) => form.isOpen))
const closedForms = computed(() => allForms.value.filter((form) => !form.isOpen))
const visibleForms = computed(() => {
  if (formStatusTab.value === 'closed') {
    return closedForms.value
  }

  if (formStatusTab.value === 'all') {
    return allForms.value
  }

  return openForms.value
})

const tabs = computed(() => [
  {
    key: 'open' as const,
    label: '受付中'
  },
  {
    key: 'closed' as const,
    label: '受付終了'
  },
  {
    key: 'all' as const,
    label: '全て'
  }
])

function formMeta(form: FormSummary) {
  const schedule = form.isOpen ? `${form.closeAt} まで受付` : `${form.openAt} から受付開始`
  return form.maxAnswers > 1 ? `${schedule} / 1企画あたり ${form.maxAnswers} 件まで` : schedule
}

function formHref(form: FormSummary) {
  return `/workspace/forms/${form.id}`
}

async function selectTab(nextStatus: FormStatusTab) {
  await router.replace({
    query: nextStatus === 'open' ? {} : { status: nextStatus }
  })
}
</script>

<template>
  <PageContentContainer>
    <nav class="flex overflow-x-auto border-b border-border">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="border-b-2 px-4 py-3 text-sm whitespace-nowrap"
        :class="
          tab.key === formStatusTab ? 'border-primary font-semibold text-primary' : 'border-transparent text-muted'
        "
        type="button"
        :aria-pressed="tab.key === formStatusTab"
        @click="selectTab(tab.key)"
      >
        {{ tab.label }}
      </button>
    </nav>

    <div v-if="formsQuery.isPending.value" class="rounded border border-border bg-surface p-6 text-muted shadow-lv1">
      読み込み中...
    </div>

    <div
      v-else-if="visibleForms.length === 0"
      class="rounded border border-border bg-surface p-10 text-center text-muted shadow-lv1"
    >
      <p class="text-base">このリストは空です</p>
      <p class="mt-2 text-sm">
        {{
          formStatusTab === 'open'
            ? '現在受付中の申請はありません。'
            : formStatusTab === 'closed'
              ? '受付終了した申請はありません。'
              : '表示できる申請はありません。'
        }}
      </p>
    </div>

    <ListPanel v-else title="申請" :description="sessionStore.currentCircle?.name ?? '企画未選択'" overflow-hidden>
      <div class="divide-y divide-border">
        <ListItemLink v-for="form in visibleForms" :key="form.id" :to="formHref(form)">
          <template #title>{{ form.name }}</template>
          <template #prefix>
            <StatusBadge :tone="form.isPublic ? 'muted' : 'primary'" appearance="outlined">
              {{ form.isPublic ? '全員に公開' : '限定公開' }}
            </StatusBadge>
          </template>
          <template #suffix>
            <StatusBadge v-if="form.hasAnswer" tone="success">提出済</StatusBadge>
            <StatusBadge v-if="!form.isOpen" tone="muted">受付終了</StatusBadge>
          </template>
          <template #meta>
            {{ formMeta(form) }}
          </template>
          {{ form.description }}
        </ListItemLink>
      </div>

      <div
        v-if="closedForms.length > 0 || openForms.length > 0"
        class="border-t border-border px-6 py-4 text-xs text-muted"
      >
        受付中 {{ openForms.length }} 件 / 受付終了 {{ closedForms.length }} 件
      </div>
    </ListPanel>
  </PageContentContainer>
</template>
