<script setup lang="ts">
definePage({
  path: '/staff/forms/:formId/not_answered',
  meta: staffPageMeta('formAnswers.read')
})

import { staffPageMeta } from '@/lib/pageMeta'

import { computed } from 'vue'
import { useRoute } from 'vue-router'
import ListPanel from '@/components/ui/ListPanel.vue'
import ListItemLink from '@/components/ui/ListItemLink.vue'
import TabStrip from '@/components/ui/TabStrip.vue'
import { useSessionStore } from '@/features/session/store'
import { useStaffStatusQuery } from '@/features/staff/status/api'
import { useStaffFormAnswersIndexQuery } from '@/features/staff/forms/answers'
import { buildStaffFormTabs } from '@/lib/ui/tabStrip'
import PageLayout from '@/components/layouts/PageLayout.vue'
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
</script>

<template>
  <PageLayout>
    <TabStrip v-if="formId.length > 0" :tabs="staffFormTabs" />

    <LoadingState v-if="answersQuery.isPending.value" />

    <article v-else-if="answersQuery.data.value" class="space-y-6">
      <div class="space-y-1 px-1">
        <h1 class="text-2xl font-semibold text-body">未回答企画一覧</h1>
      </div>
      <ListPanel
        :title="`未回答企画（${answersQuery.data.value.notAnsweredCircles.length}企画）`"
        :description="`${answersQuery.data.value.form.name} に未回答の企画を確認します。`"
        overflow-hidden
      >
        <div v-if="answersQuery.data.value.notAnsweredCircles.length === 0" class="px-6 py-5 text-sm text-muted-2">
          未回答企画はありません。
        </div>

        <div v-else class="divide-y divide-border">
          <ListItemLink
            v-for="circle in answersQuery.data.value.notAnsweredCircles"
            :key="circle.id"
            :to="`/staff/circles/${circle.id}`"
          >
            <template #title>{{ circle.name }}</template>
            <template #meta> {{ circle.groupName }} / {{ circle.participationTypeName }} </template>
            企画詳細を開いて、担当企画の状況確認や連絡導線へ進めます。
          </ListItemLink>
        </div>
      </ListPanel>
    </article>

    <ErrorState v-else message="未回答企画一覧を取得できませんでした。" />
  </PageLayout>
</template>
