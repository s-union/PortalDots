<script setup lang="ts">
definePage({
  meta: {
    requiresAuth: true,
    requiresStaffRole: true,
    requiresStaffAuthorized: true,
    staffCapability: 'formAnswers.read'
  }
})

import { computed } from 'vue'
import { useRoute } from 'vue-router'
import BackLink from '@/components/ui/BackLink.vue'
import ListPanel from '@/components/ui/ListPanel.vue'
import ListItemLink from '@/components/ui/ListItemLink.vue'
import SurfaceCard from '@/components/ui/SurfaceCard.vue'
import TabStrip from '@/components/ui/TabStrip.vue'
import { useSessionStore } from '@/features/session/store'
import { useStaffStatusQuery } from '@/features/staff/status/api'
import { useStaffFormAnswersIndexQuery } from '@/features/staff/forms/answers'
import { buildStaffFormTabs } from '@/features/ui/tabStrip'
import PageLayout from '@/components/layouts/PageLayout.vue'

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
    <BackLink v-if="formId.length > 0" :to="`/staff/forms/${formId}/answers`"> 回答一覧へ戻る </BackLink>

    <TabStrip v-if="formId.length > 0" :tabs="staffFormTabs" />

    <div v-if="answersQuery.isPending.value" class="rounded border border-border bg-surface p-6 text-muted shadow-lv1">
      読み込み中...
    </div>

    <article v-else-if="answersQuery.data.value" class="space-y-6">
      <SurfaceCard tag="header">
        <p class="text-sm text-primary">Not Answered Circles</p>
        <h2 class="mt-3 text-3xl font-semibold text-body">未回答企画一覧</h2>
        <p class="mt-3 text-sm leading-7 text-muted">
          {{ answersQuery.data.value.form.name }} に未回答の企画を確認します。
        </p>
      </SurfaceCard>

      <ListPanel
        :title="`未回答企画（${answersQuery.data.value.notAnsweredCircles.length}企画）`"
        description="必要に応じて企画詳細を開き、状況確認や個別連絡へ進めます。"
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
            <template #title>企画ID: {{ circle.id }} {{ circle.name }}</template>
            <template #meta> {{ circle.groupName }} / {{ circle.participationTypeName }} </template>
            企画詳細を開いて、担当企画の状況確認や連絡導線へ進めます。
          </ListItemLink>
        </div>
      </ListPanel>
    </article>

    <div v-else class="rounded border border-danger bg-danger-light p-6 text-danger">
      未回答企画一覧を取得できませんでした。
    </div>
  </PageLayout>
</template>
