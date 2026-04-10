<script setup lang="ts">
definePage({
  path: '/staff/forms/:formId/answers/uploads',
  meta: {
    requiresAuth: true,
    requiresStaffRole: true,
    requiresStaffAuthorized: true,
    staffCapability: 'formAnswers.export'
  }
})

import { computed } from 'vue'
import { useRoute } from 'vue-router'
import TabStrip from '@/components/ui/TabStrip.vue'
import { useSessionStore } from '@/features/session/store'
import { useStaffStatusQuery } from '@/features/staff/status/api'
import { buildStaffFormAnswerUploadsZipUrl, useStaffFormAnswersIndexQuery } from '@/features/staff/forms/answers'
import { buildStaffFormTabs } from '@/features/ui/tabStrip'
import PageLayout from '@/components/layouts/PageLayout.vue'

const route = useRoute('/staff/forms/[formId]/answers/uploads')
const sessionStore = useSessionStore()
const formId = computed(() => String(route.params.formId ?? ''))
const zipUrl = computed(() => buildStaffFormAnswerUploadsZipUrl(formId.value))

const staffStatusQuery = useStaffStatusQuery(computed(() => sessionStore.isAuthenticated))
const answersQuery = useStaffFormAnswersIndexQuery(
  formId,
  computed(() => staffStatusQuery.data.value?.authorized === true)
)
const staffFormTabs = computed(() => buildStaffFormTabs(formId.value, 'answers'))
</script>

<template>
  <PageLayout>
    <TabStrip :tabs="staffFormTabs" />

    <div v-if="answersQuery.isPending.value" class="rounded border border-border bg-surface p-6 text-muted shadow-lv1">
      読み込み中...
    </div>

    <article v-else-if="answersQuery.data.value" class="space-y-6">
      <section class="rounded border border-border bg-surface p-6 shadow-lv1">
        <div class="space-y-4 text-sm leading-7 text-body">
          <h1 class="text-xl font-semibold text-body">アップロードファイルの一括ダウンロード</h1>
          <p class="text-sm text-muted">{{ answersQuery.data.value.form.name }}</p>
          <p>
            フォーム「{{ answersQuery.data.value.form.name }}」にてアップロードされたファイルを ZIP
            形式で一括ダウンロードします。
          </p>
          <p class="font-semibold">注意事項</p>
          <ul class="list-disc space-y-2 pl-5 text-muted">
            <li>CSV と ZIP を同じ階層に置くと、差し込みやデータ結合で扱いやすくなります。</li>
            <li>ファイル数が多い場合、ダウンロード完了まで時間がかかることがあります。</li>
            <li>本機能はベータ版のため、アップロード件数が多い場合は時間がかかることがあります。</li>
            <li>
              アップロード件数:
              {{ answersQuery.data.value.answers.reduce((sum, answer) => sum + answer.uploadCount, 0) }}
              件
            </li>
          </ul>
          <a
            :href="zipUrl"
            class="inline-flex rounded bg-primary px-4 py-3 font-bold text-white transition hover:bg-primary-hover"
          >
            ダウンロードする (ZIP)
          </a>
        </div>
      </section>
    </article>

    <div v-else class="rounded border border-danger bg-danger-light p-6 text-danger">
      アップロード管理画面を表示できませんでした。
    </div>
  </PageLayout>
</template>
