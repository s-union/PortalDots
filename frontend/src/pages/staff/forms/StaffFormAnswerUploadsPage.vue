<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import BackLink from "@/components/ui/BackLink.vue";
import SurfaceCard from "@/components/ui/SurfaceCard.vue";
import SurfaceHeader from "@/components/ui/SurfaceHeader.vue";
import { useSessionStore } from "@/features/session/store";
import { useStaffStatusQuery } from "@/features/staff/status/api";
import {
  buildStaffFormAnswerUploadsZipUrl,
  useStaffFormAnswersIndexQuery,
} from "@/features/staff/forms/answers";

const route = useRoute();
const sessionStore = useSessionStore();
const formId = computed(() => String(route.params.formId ?? ""));
const zipUrl = computed(() => buildStaffFormAnswerUploadsZipUrl(formId.value));

const staffStatusQuery = useStaffStatusQuery(computed(() => sessionStore.isAuthenticated));
const answersQuery = useStaffFormAnswersIndexQuery(
  formId,
  computed(
    () =>
      staffStatusQuery.data.value?.authorized === true &&
      sessionStore.currentCircle !== null,
  ),
);
</script>

<template>
  <section class="space-y-6">
    <BackLink :to="`/staff/forms/${formId}/answers`"> 回答一覧へ戻る </BackLink>

    <div
      v-if="answersQuery.isPending.value"
      class="rounded border border-border bg-surface p-6 text-muted shadow-lv1"
    >
      読み込み中...
    </div>

    <article v-else-if="answersQuery.data.value" class="space-y-6">
      <SurfaceCard tag="header">
        <p class="text-sm text-primary">Uploads</p>
        <SurfaceHeader>
          <template #title>アップロードファイルの一括ダウンロード</template>
          <template #description>{{ answersQuery.data.value.form.name }}</template>
        </SurfaceHeader>
      </SurfaceCard>

      <section class="rounded border border-border bg-surface p-6 shadow-lv1">
        <div class="space-y-4 text-sm leading-7 text-body">
          <p>
            フォーム「{{ answersQuery.data.value.form.name }}」にてアップロードされたファイルを ZIP
            形式で一括ダウンロードします。
          </p>
          <p class="font-semibold">注意事項</p>
          <ul class="list-disc space-y-2 pl-5 text-muted">
            <li>CSV と ZIP を同じ階層に置くと、差し込みやデータ結合で扱いやすくなります。</li>
            <li>ファイル数が多い場合、ダウンロード完了まで時間がかかることがあります。</li>
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
  </section>
</template>
