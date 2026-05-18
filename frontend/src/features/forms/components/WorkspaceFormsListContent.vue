<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BaseButton from '@/components/ui/BaseButton.vue'
import ListItemLink from '@/components/ui/ListItemLink.vue'
import ListPanel from '@/components/ui/ListPanel.vue'
import PaginationFooter from '@/components/ui/PaginationFooter.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import { useSuspenseFormsQuery, type FormSummary } from '@/features/forms/api'
import { formatDateTime } from '@/lib/format/datetime'
import { parseFormStatusTab, type FormStatusTab } from '@/features/forms/formStatusSchema'
import { routeString } from '@/lib/routeQuery'

type FormAvailability = 'open' | 'upcoming' | 'closed'

const route = useRoute()
const router = useRouter()
const searchQuery = ref(routeString(route.query.query))
const page = shallowRef(1)
const pageSize = 20
const formStatusTab = computed(() => parseFormStatusTab(route.query.status))
const formsQuery = useSuspenseFormsQuery(
  computed(() => ({
    page: page.value,
    pageSize,
    status: resolveRequestStatus(formStatusTab.value),
    query: searchQuery.value
  }))
)
await formsQuery.suspense()

const visibleForms = computed(() => formsQuery.data.value?.items ?? [])
const totalForms = computed(() => formsQuery.data.value?.total ?? 0)
const currentPage = computed(() => formsQuery.data.value?.page ?? page.value)
const currentPageSize = computed(() => formsQuery.data.value?.pageSize ?? pageSize)

watch(formStatusTab, () => {
  page.value = 1
})

watch(
  () => route.query.query,
  (value) => {
    searchQuery.value = routeString(value)
    page.value = 1
  }
)

async function handleSearchSubmit() {
  const normalizedQuery = searchQuery.value.trim()
  await router.replace({
    query: {
      ...(formStatusTab.value === 'open' ? {} : { status: formStatusTab.value }),
      ...(normalizedQuery === '' ? {} : { query: normalizedQuery })
    }
  })
}

async function handleSearchReset() {
  searchQuery.value = ''
  await router.replace({
    query: formStatusTab.value === 'open' ? {} : { status: formStatusTab.value }
  })
}

function formMeta(form: FormSummary) {
  const availability = getFormAvailability(form)
  const schedule =
    availability === 'open'
      ? `${formatDateTime(form.closeAt)} まで受付`
      : availability === 'upcoming'
        ? `${formatDateTime(form.openAt)} から受付開始`
        : `${formatDateTime(form.closeAt)} で受付終了`
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

function resolveRequestStatus(status: FormStatusTab) {
  if (status === 'closed') {
    return 'closed'
  }
  if (status === 'all') {
    return 'all'
  }
  return 'open'
}
</script>

<template>
  <div class="mb-4 rounded border border-border bg-surface p-6 shadow-lv1">
    <form class="flex flex-wrap gap-3" @submit.prevent="handleSearchSubmit">
      <input
        v-model="searchQuery"
        class="min-w-64 flex-1"
        name="query"
        placeholder="申請フォームを検索..."
        type="search"
      />
      <BaseButton variant="primary" size="lg" weight="bold" type="submit">検索</BaseButton>
    </form>

    <div v-if="searchQuery.trim() !== ''" class="mt-3">
      <button class="text-sm font-semibold text-muted" type="button" @click="handleSearchReset">検索をリセット</button>
    </div>
  </div>

  <div
    v-if="visibleForms.length === 0"
    class="rounded border border-border bg-surface p-10 text-center text-muted shadow-lv1"
  >
    <p class="text-base">{{ searchQuery.trim() === '' ? 'このリストは空です' : '検索結果が見つかりませんでした' }}</p>
    <p class="mt-2 text-sm">
      {{
        searchQuery.trim() !== ''
          ? '入力するキーワードを変えて、再度検索をお試しください。'
          : formStatusTab === 'open'
            ? '現在受付中の申請はありません。'
            : formStatusTab === 'closed'
              ? '受付終了した申請はありません。'
              : '表示できる申請はありません。'
      }}
    </p>
  </div>

  <template v-else>
    <ListPanel legacy overflow-hidden>
      <div class="divide-y divide-border">
        <ListItemLink v-for="form in visibleForms" :key="form.id" legacy :to="formHref(form)">
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
    </ListPanel>
    <PaginationFooter
      v-if="totalForms > currentPageSize"
      :page="currentPage"
      :page-size="currentPageSize"
      :total="totalForms"
      class="mt-4"
      @update:page="page = $event"
    />
  </template>
</template>
