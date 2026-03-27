<script setup lang="ts">
definePage({
  meta: {
    requiresAuth: true,
    requiresCircle: true
  }
})

import { computed } from 'vue'
import { useRoute } from 'vue-router'
import ListItemLink from '@/components/ui/ListItemLink.vue'
import ListPanel from '@/components/ui/ListPanel.vue'
import PageContentContainer from '@/components/ui/PageContentContainer.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import TabStrip from '@/components/ui/TabStrip.vue'
import { useFormsQuery, type FormSummary } from '@/features/forms/api'
import { useSessionStore } from '@/features/session/store'
import type { TabStripItem } from '@/features/ui/tabStrip'

type FormStatusTab = 'open' | 'closed' | 'all'
type FormAvailability = 'open' | 'upcoming' | 'closed'

const route = useRoute()
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
const openForms = computed(() => allForms.value.filter((form) => getFormAvailability(form) === 'open'))
const closedForms = computed(() => allForms.value.filter((form) => getFormAvailability(form) === 'closed'))
const upcomingForms = computed(() => allForms.value.filter((form) => getFormAvailability(form) === 'upcoming'))
const visibleForms = computed(() => {
  if (formStatusTab.value === 'closed') {
    return closedForms.value
  }

  if (formStatusTab.value === 'all') {
    return allForms.value
  }

  return openForms.value
})

const tabs = computed<TabStripItem[]>(() => [
  { label: '受付中', to: { query: {} }, active: formStatusTab.value === 'open' },
  { label: '受付終了', to: { query: { status: 'closed' } }, active: formStatusTab.value === 'closed' },
  { label: '全て', to: { query: { status: 'all' } }, active: formStatusTab.value === 'all' }
])

function formMeta(form: FormSummary) {
  const availability = getFormAvailability(form)
  const schedule =
    availability === 'open'
      ? `${form.closeAt} まで受付`
      : availability === 'upcoming'
        ? `${form.openAt} から受付開始`
        : `${form.closeAt} で受付終了`
  return form.maxAnswers > 1 ? `${schedule} / 1企画あたり ${form.maxAnswers} 件まで` : schedule
}

function formHref(form: FormSummary) {
  return `/workspace/forms/${form.id}`
}

function getFormAvailability(form: FormSummary): FormAvailability {
  if (form.isOpen) {
    return 'open'
  }

  const openAt = Date.parse(form.openAt)
  if (!Number.isNaN(openAt) && openAt > Date.now()) {
    return 'upcoming'
  }

  return 'closed'
}

function isLimitedPublic(form: FormSummary) {
  return form.answerableTags.length > 0
}
</script>

<template>
  <PageContentContainer>
    <TabStrip :tabs="tabs" />

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
            <StatusBadge :tone="isLimitedPublic(form) ? 'primary' : 'muted'" appearance="outlined">
              {{ isLimitedPublic(form) ? '限定公開' : '全員に公開' }}
            </StatusBadge>
          </template>
          <template #suffix>
            <StatusBadge v-if="form.hasAnswer" tone="success">提出済</StatusBadge>
            <StatusBadge v-if="getFormAvailability(form) === 'upcoming'" tone="primary">受付開始前</StatusBadge>
            <StatusBadge v-else-if="getFormAvailability(form) === 'closed'" tone="muted">受付終了</StatusBadge>
          </template>
          <template #meta>
            {{ formMeta(form) }}
          </template>
          {{ form.description }}
        </ListItemLink>
      </div>

      <div
        v-if="closedForms.length > 0 || openForms.length > 0 || upcomingForms.length > 0"
        class="border-t border-border px-6 py-4 text-xs text-muted"
      >
        受付中 {{ openForms.length }} 件 / 受付開始前 {{ upcomingForms.length }} 件 / 受付終了
        {{ closedForms.length }} 件
      </div>
    </ListPanel>
  </PageContentContainer>
</template>
