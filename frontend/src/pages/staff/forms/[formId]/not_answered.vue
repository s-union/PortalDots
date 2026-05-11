<script setup lang="ts">
import { staffPageMeta } from '@/lib/pageMeta'
definePage({
  path: '/staff/forms/:formId/not_answered',
  meta: staffPageMeta('formAnswers.read')
})

import { computed } from 'vue'
import { useRoute } from 'vue-router'
import IconActionButton from '@/components/ui/IconActionButton.vue'
import FaIcon from '@/components/ui/FaIcon.vue'
import SurfaceCard from '@/components/ui/SurfaceCard.vue'
import SurfaceHeader from '@/components/ui/SurfaceHeader.vue'
import TabbedSettingsPage from '@/components/layouts/TabbedSettingsPage.vue'
import StaffDataGrid, { type StaffDataGridColumn, type StaffDataGridRow } from '@/components/staff/StaffDataGrid.vue'
import { useSessionStore } from '@/features/session/store'
import { useStaffStatusQuery } from '@/features/staff/status/api'
import { useStaffFormAnswersIndexQuery } from '@/features/staff/forms/answers'
import { buildStaffFormTabs } from '@/lib/ui/tabStrip'
import LoadingState from '@/components/ui/LoadingState.vue'
import ErrorState from '@/components/ui/ErrorState.vue'

const route = useRoute('/staff/forms/[formId]/not_answered')
const sessionStore = useSessionStore()
const formId = computed(() => String(route.params.formId ?? ''))
const staffStatusQuery = useStaffStatusQuery(computed(() => sessionStore.isAuthenticated))
const answersQuery = useStaffFormAnswersIndexQuery(
  formId,
  computed(() => staffStatusQuery.data.value?.authorized === true)
)
const staffFormTabs = computed(() => (formId.value.length > 0 ? buildStaffFormTabs(formId.value, 'answers') : []))

const columns: StaffDataGridColumn[] = [
  { key: 'name', label: '企画名', sortable: true },
  { key: 'groupName', label: '企画グループ名', sortable: true },
  { key: 'participationTypeName', label: '参加種別', sortable: true }
]

const rows = computed<StaffDataGridRow[]>(() =>
  (answersQuery.data.value?.notAnsweredCircles ?? []).map((circle) => ({
    id: circle.id,
    name: circle.name,
    groupName: circle.groupName,
    participationTypeName: circle.participationTypeName
  }))
)
</script>

<template>
  <TabbedSettingsPage :tabs="staffFormTabs">
    <LoadingState v-if="answersQuery.isPending.value" />

    <article v-else-if="answersQuery.data.value" class="space-y-6">
      <div class="space-y-1 px-1">
        <h1 class="text-2xl font-semibold text-body">未回答企画一覧</h1>
      </div>

      <SurfaceCard>
        <SurfaceHeader>
          <template #title>未回答企画（{{ answersQuery.data.value.notAnsweredCircles.length }}企画）</template>
        </SurfaceHeader>

        <StaffDataGrid
          :rows="rows"
          :columns="columns"
          :page="1"
          :page-size="rows.length"
          :total="rows.length"
          :loading="answersQuery.isFetching.value"
          table-label="未回答企画一覧"
          empty-message="未回答企画はありません。"
        >
          <template #actions="{ row }">
            <IconActionButton title="企画を開く" @click="$router.push(`/staff/circles/${String(row.id)}`)">
              <FaIcon name="external-link-alt" fixed-width />
            </IconActionButton>
          </template>

          <template #cell-name="{ value }">
            <span class="font-semibold text-body">{{ value }}</span>
          </template>
        </StaffDataGrid>
      </SurfaceCard>
    </article>

    <ErrorState v-else message="未回答企画一覧を取得できませんでした。" />
  </TabbedSettingsPage>
</template>
