<script setup lang="ts">
import { computed, ref } from "vue";
import { RouterLink } from "vue-router";
import BackLink from "@/components/ui/BackLink.vue";
import SurfaceCard from "@/components/ui/SurfaceCard.vue";
import SurfaceHeader from "@/components/ui/SurfaceHeader.vue";
import { formatFileSize } from "@/lib/format/fileSize";
import { useStaffStatusQuery } from "@/features/staff/status/api";
import {
  buildStaffDocumentsExportUrl,
  buildStaffDocumentDownloadUrl,
  extractStaffDocumentValidationMessage,
  useCreateStaffDocumentMutation,
  useStaffDocumentForm,
  useStaffDocumentsQuery,
} from "@/features/staff/documents/api";
import { useSessionStore } from "@/features/session/store";

const sessionStore = useSessionStore();
const staffStatusQuery = useStaffStatusQuery(computed(() => sessionStore.isAuthenticated));
const documentsQuery = useStaffDocumentsQuery(
  computed(
    () => staffStatusQuery.data.value?.authorized === true && sessionStore.currentCircle !== null,
  ),
);
const createDocumentMutation = useCreateStaffDocumentMutation();
const form = useStaffDocumentForm();
const errorMessage = ref("");

function handleFileChange(event: Event) {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) {
    return;
  }

  form.value.file = target.files?.[0] ?? target.files?.item(0) ?? null;
}

async function handleCreateDocument() {
  errorMessage.value = "";

  try {
    await createDocumentMutation.mutateAsync({
      name: form.value.name,
      description: form.value.description,
      notes: form.value.notes,
      isPublic: form.value.isPublic,
      isImportant: form.value.isImportant,
      file: form.value.file,
    });
    form.value = {
      name: "",
      description: "",
      notes: "",
      isPublic: true,
      isImportant: false,
      file: null,
    };
  } catch (error) {
    errorMessage.value = extractStaffDocumentValidationMessage(error);
  }
}
</script>

<template>
  <section class="space-y-6">
    <header class="flex items-end justify-between gap-4">
      <div>
        <h2 class="text-2xl font-semibold text-body">配布資料管理</h2>
        <p class="mt-2 text-sm text-muted">
          {{ sessionStore.currentCircle?.name ?? "企画未選択" }}
        </p>
      </div>
      <BackLink to="/staff"> Staff top へ戻る </BackLink>
    </header>

    <SurfaceCard>
      <SurfaceHeader>
        <template #actions>
          <span class="rounded bg-primary px-4 py-2 text-sm font-semibold text-white">
            新規配布資料
          </span>
          <a
            :href="buildStaffDocumentsExportUrl()"
            class="rounded border border-border px-4 py-2 text-sm text-muted transition hover:border-primary hover:text-primary"
          >
            CSVで出力
          </a>
        </template>
      </SurfaceHeader>

      <div v-if="documentsQuery.isPending.value" class="px-6 py-6 text-sm text-muted">
        読み込み中...
      </div>

      <div
        v-else-if="(documentsQuery.data.value?.length ?? 0) === 0"
        class="px-6 py-6 text-sm text-muted"
      >
        staff documents はまだありません。
      </div>

      <div v-else class="overflow-x-auto">
        <table class="min-w-full border-collapse text-sm">
          <thead class="bg-form-control">
            <tr class="text-left text-muted">
              <th class="border-b border-border px-4 py-3 font-semibold">配布資料ID</th>
              <th class="border-b border-border px-4 py-3 font-semibold">配布資料名</th>
              <th class="border-b border-border px-4 py-3 font-semibold">説明</th>
              <th class="border-b border-border px-4 py-3 font-semibold">スタッフ用メモ</th>
              <th class="border-b border-border px-4 py-3 font-semibold">重要</th>
              <th class="border-b border-border px-4 py-3 font-semibold">公開</th>
              <th class="border-b border-border px-4 py-3 font-semibold">ファイル名</th>
              <th class="border-b border-border px-4 py-3 font-semibold">サイズ</th>
              <th class="border-b border-border px-4 py-3 font-semibold">更新日時</th>
              <th class="border-b border-border px-4 py-3 font-semibold">ファイル</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="staffDocument in documentsQuery.data.value"
              :key="staffDocument.id"
              class="transition hover:bg-form-control"
            >
              <td class="border-b border-border px-4 py-4">{{ staffDocument.id }}</td>
              <td class="border-b border-border px-4 py-4 font-medium text-body">
                <RouterLink :to="`/staff/documents/${staffDocument.id}/edit`" class="text-primary">
                  {{ staffDocument.name }}
                </RouterLink>
              </td>
              <td class="border-b border-border px-4 py-4">{{ staffDocument.description }}</td>
              <td class="border-b border-border px-4 py-4">{{ staffDocument.notes }}</td>
              <td class="border-b border-border px-4 py-4">
                <strong v-if="staffDocument.isImportant">はい</strong>
                <span v-else>-</span>
              </td>
              <td class="border-b border-border px-4 py-4">
                <strong v-if="staffDocument.isPublic">はい</strong>
                <span v-else>-</span>
              </td>
              <td class="border-b border-border px-4 py-4">{{ staffDocument.filename }}</td>
              <td class="border-b border-border px-4 py-4">
                {{ formatFileSize(staffDocument.sizeBytes) }}
              </td>
              <td class="border-b border-border px-4 py-4">{{ staffDocument.updatedAt }}</td>
              <td class="border-b border-border px-4 py-4">
                <a
                  :href="buildStaffDocumentDownloadUrl(staffDocument.id)"
                  class="text-primary"
                  target="_blank"
                  rel="noreferrer"
                >
                  表示
                </a>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </SurfaceCard>

    <form
      class="rounded border border-border bg-surface p-6 shadow-lv1"
      @submit.prevent="handleCreateDocument"
    >
      <h3 class="text-lg font-semibold text-body">配布資料を新規作成</h3>
      <div class="mt-4 grid gap-4">
        <label class="grid gap-2 text-sm text-body">
          <span>配布資料名</span>
          <input v-model="form.name" name="name" type="text" />
        </label>

        <label class="grid gap-2 text-sm text-body">
          <span>説明</span>
          <textarea v-model="form.description" class="min-h-32" name="description" />
        </label>

        <label class="grid gap-2 text-sm text-body">
          <span>スタッフ用メモ</span>
          <textarea v-model="form.notes" class="min-h-24" name="notes" />
        </label>

        <label class="grid gap-2 text-sm text-body">
          <span>ファイル</span>
          <input name="file" type="file" @change="handleFileChange" />
        </label>

        <label class="flex items-center gap-3 text-sm text-body">
          <input v-model="form.isImportant" name="isImportant" type="checkbox" />
          重要資料として扱う
        </label>

        <label class="flex items-center gap-3 text-sm text-body">
          <input v-model="form.isPublic" name="isPublic" type="checkbox" />
          公開する
        </label>

        <p class="rounded border border-primary bg-primary-light px-4 py-3 text-sm text-primary">
          現在の upload は DB 保存です。外部ストレージ連携はまだ実装していません。
        </p>

        <p
          v-if="errorMessage"
          class="rounded border border-danger bg-danger-light px-4 py-3 text-sm text-danger"
        >
          {{ errorMessage }}
        </p>

        <div class="flex justify-end">
          <button
            class="rounded bg-primary px-6 py-3 font-bold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="createDocumentMutation.isPending.value"
            type="submit"
          >
            {{ createDocumentMutation.isPending.value ? "アップロード中..." : "保存" }}
          </button>
        </div>
      </div>
    </form>
  </section>
</template>
