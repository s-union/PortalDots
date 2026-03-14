<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import BackLink from "@/components/ui/BackLink.vue";
import SurfaceCard from "@/components/ui/SurfaceCard.vue";
import SurfaceHeader from "@/components/ui/SurfaceHeader.vue";
import { useStaffStatusQuery } from "@/features/staff/status/api";
import {
  buildStaffFormsExportUrl,
  createDefaultStaffFormPayload,
  extractStaffFormValidationMessage,
  formatStaffFormTags,
  parseStaffFormTags,
  useCopyStaffFormMutation,
  useCreateStaffFormMutation,
  useDeleteStaffFormMutation,
  useStaffFormForm,
  useStaffFormsQuery,
} from "@/features/staff/forms/api";
import { useSessionStore } from "@/features/session/store";

const router = useRouter();
const sessionStore = useSessionStore();
const staffStatusQuery = useStaffStatusQuery(computed(() => sessionStore.isAuthenticated));
const formsQuery = useStaffFormsQuery(
  computed(
    () =>
      staffStatusQuery.data.value?.authorized === true && sessionStore.currentCircle !== null,
  ),
);
const createFormMutation = useCreateStaffFormMutation();
const copyFormMutation = useCopyStaffFormMutation();
const deleteFormMutation = useDeleteStaffFormMutation();
const form = useStaffFormForm();
const errorMessage = ref("");
const exportHref = computed(() => buildStaffFormsExportUrl());

function handleAnswerableTagsInput(event: Event) {
  const target = event.target;
  if (!(target instanceof HTMLTextAreaElement)) {
    return;
  }

  form.value.answerableTags = parseStaffFormTags(target.value);
}

async function handleCreateForm() {
  errorMessage.value = "";

  try {
    await createFormMutation.mutateAsync({
      name: form.value.name,
      description: form.value.description,
      openAt: form.value.openAt,
      closeAt: form.value.closeAt,
      maxAnswers: form.value.maxAnswers,
      answerableTags: form.value.answerableTags,
      confirmationMessage: form.value.confirmationMessage,
      isPublic: form.value.isPublic,
    });
    form.value = createDefaultStaffFormPayload();
  } catch (error) {
    errorMessage.value = extractStaffFormValidationMessage(error);
  }
}

async function handleCopyForm(formId: string) {
  try {
    const copied = await copyFormMutation.mutateAsync(formId);
    if (copied?.id) {
      await router.push(`/staff/forms/${encodeURIComponent(copied.id)}`);
    }
  } catch (error) {
    errorMessage.value = extractStaffFormValidationMessage(error);
  }
}

async function handleDeleteForm(formId: string) {
  try {
    await deleteFormMutation.mutateAsync(formId);
  } catch (error) {
    errorMessage.value = extractStaffFormValidationMessage(error);
  }
}
</script>

<template>
  <section class="space-y-6">
    <header class="flex items-end justify-between gap-4">
      <div>
        <h2 class="text-2xl font-semibold text-body">申請管理</h2>
        <p class="mt-2 text-sm text-muted">
          {{ sessionStore.currentCircle?.name ?? "企画未選択" }}
        </p>
      </div>
      <BackLink to="/staff"> Staff top へ戻る </BackLink>
    </header>

    <SurfaceCard>
      <SurfaceHeader>
        <template #description>Laravel の data-grid 構造に合わせた一覧</template>
        <template #actions>
          <span class="rounded bg-primary px-4 py-2 text-sm font-semibold text-white">
            新規フォーム
          </span>
          <a
            :href="exportHref"
            class="rounded border border-border px-4 py-2 text-sm text-body transition hover:bg-surface-light"
          >
            CSVで出力
          </a>
        </template>
      </SurfaceHeader>

      <div v-if="formsQuery.isPending.value" class="px-6 py-6 text-sm text-muted">
        読み込み中...
      </div>

      <div
        v-else-if="(formsQuery.data.value?.length ?? 0) === 0"
        class="px-6 py-6 text-sm text-muted"
      >
        staff forms は見つかりませんでした。
      </div>

      <div v-else class="overflow-x-auto">
        <table class="min-w-full border-collapse text-sm">
          <thead class="bg-form-control">
            <tr class="text-left text-muted">
              <th class="border-b border-border px-4 py-3 font-semibold">フォームID</th>
              <th class="border-b border-border px-4 py-3 font-semibold">フォーム名</th>
              <th class="border-b border-border px-4 py-3 font-semibold">公開</th>
              <th class="border-b border-border px-4 py-3 font-semibold">回答上限</th>
              <th class="border-b border-border px-4 py-3 font-semibold">受付開始日時</th>
              <th class="border-b border-border px-4 py-3 font-semibold">受付終了日時</th>
              <th class="border-b border-border px-4 py-3 font-semibold">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="staffForm in formsQuery.data.value"
              :key="staffForm.id"
              class="align-top transition hover:bg-form-control"
            >
              <td class="border-b border-border px-4 py-4">
                <RouterLink class="font-medium text-primary" :to="`/staff/forms/${staffForm.id}`">
                  {{ staffForm.id }}
                </RouterLink>
              </td>
              <td class="border-b border-border px-4 py-4">
                <RouterLink class="font-medium text-primary" :to="`/staff/forms/${staffForm.id}`">
                  {{ staffForm.name }}
                </RouterLink>
              </td>
              <td class="border-b border-border px-4 py-4">
                <strong v-if="staffForm.isPublic">はい</strong>
                <span v-else>-</span>
              </td>
              <td class="border-b border-border px-4 py-4 text-body">
                {{ staffForm.maxAnswers }} 件
              </td>
              <td class="border-b border-border px-4 py-4 text-body">
                {{ staffForm.openAt }}
              </td>
              <td class="border-b border-border px-4 py-4 text-body">
                {{ staffForm.closeAt }}
              </td>
              <td class="border-b border-border px-4 py-4">
                <div class="flex flex-wrap gap-2">
                  <RouterLink
                    class="rounded border border-border px-3 py-2 text-xs text-body transition hover:bg-surface-light"
                    :to="`/staff/forms/${staffForm.id}`"
                  >
                    回答一覧・設定
                  </RouterLink>
                  <button
                    class="rounded border border-border px-3 py-2 text-xs text-body transition hover:bg-surface-light"
                    type="button"
                    @click="handleCopyForm(staffForm.id)"
                  >
                    複製
                  </button>
                  <button
                    class="rounded border border-danger px-3 py-2 text-xs text-danger transition hover:bg-danger-light"
                    type="button"
                    @click="handleDeleteForm(staffForm.id)"
                  >
                    削除
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </SurfaceCard>

    <form
      class="rounded border border-border bg-surface p-6 shadow-lv1"
      @submit.prevent="handleCreateForm"
    >
      <h3 class="text-lg font-semibold text-body">フォームを新規作成</h3>
      <div class="mt-4 grid gap-4">
        <label class="grid gap-2 text-sm text-body">
          <span>
            フォーム名
            <span
              class="ml-2 rounded bg-danger-light px-2 py-0.5 text-xs font-semibold text-danger"
            >
              必須
            </span>
          </span>
          <input v-model="form.name" name="name" type="text" />
        </label>

        <label class="grid gap-2 text-sm text-body">
          <span>説明</span>
          <textarea v-model="form.description" class="min-h-32" name="description" />
        </label>

        <div class="grid gap-4 md:grid-cols-2">
          <label class="grid gap-2 text-sm text-body">
            <span>受付開始日時</span>
            <input v-model="form.openAt" name="openAt" type="text" />
          </label>

          <label class="grid gap-2 text-sm text-body">
            <span>受付終了日時</span>
            <input v-model="form.closeAt" name="closeAt" type="text" />
          </label>
        </div>

        <label class="grid gap-2 text-sm text-body">
          <span>最大回答数</span>
          <input v-model.number="form.maxAnswers" min="1" name="maxAnswers" type="number" />
        </label>

        <label class="grid gap-2 text-sm text-body">
          <span>回答可能タグ</span>
          <textarea
            class="min-h-24"
            name="answerableTags"
            :value="formatStaffFormTags(form.answerableTags)"
            @input="handleAnswerableTagsInput"
          />
        </label>

        <label class="grid gap-2 text-sm text-body">
          <span>回答完了メッセージ</span>
          <textarea
            v-model="form.confirmationMessage"
            class="min-h-24"
            name="confirmationMessage"
          />
        </label>

        <label class="flex items-center gap-3 text-sm text-body">
          <input v-model="form.isPublic" name="isPublic" type="checkbox" />
          公開する
        </label>

        <p
          v-if="errorMessage"
          class="rounded border border-danger bg-danger-light px-4 py-3 text-sm text-danger"
        >
          {{ errorMessage }}
        </p>

        <div class="flex justify-end">
          <button
            class="rounded bg-primary px-6 py-3 font-bold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="createFormMutation.isPending.value"
            type="submit"
          >
            {{ createFormMutation.isPending.value ? "作成中..." : "保存" }}
          </button>
        </div>
      </div>
    </form>
  </section>
</template>
