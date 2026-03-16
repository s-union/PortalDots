<script setup lang="ts">
definePage({
  meta: {
    requiresAuth: true,
    requiresStaffRole: true,
    requiresStaffAuthorized: true,
    requiresCircle: true,
    staffCapability: "pages.edit",
  },
});

import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import BackLink from "@/components/ui/BackLink.vue";
import SettingsRow from "@/components/ui/SettingsRow.vue";
import SettingsSection from "@/components/ui/SettingsSection.vue";
import SurfaceCard from "@/components/ui/SurfaceCard.vue";
import { useStaffStatusQuery } from "@/features/staff/status/api";
import { useStaffDocumentsQuery } from "@/features/staff/documents/api";
import { useStaffTagsQuery } from "@/features/staff/masters/tags";
import {
  extractStaffPageValidationMessage,
  formatStaffPageTags,
  parseStaffPageTags,
  useDeleteStaffPageMutation,
  usePatchStaffPagePinMutation,
  useStaffPageDetailQuery,
  useStaffPageForm,
  useUpdateStaffPageMutation,
} from "@/features/staff/pages/api";
import { useSessionStore } from "@/features/session/store";

const route = useRoute("/staff/pages/[pageId]");
const router = useRouter();
const sessionStore = useSessionStore();
const pageId = computed(() => String(route.params.pageId ?? ""));
const staffStatusQuery = useStaffStatusQuery(computed(() => sessionStore.isAuthenticated));
const pageFormEnabled = computed(
  () => staffStatusQuery.data.value?.authorized === true && sessionStore.currentCircle !== null,
);
const pageQuery = useStaffPageDetailQuery(pageId, pageFormEnabled);
const tagsQuery = useStaffTagsQuery(pageFormEnabled);
const documentsQuery = useStaffDocumentsQuery(pageFormEnabled);
const updatePageMutation = useUpdateStaffPageMutation(pageId);
const deletePageMutation = useDeleteStaffPageMutation(pageId);
const patchPinMutation = usePatchStaffPagePinMutation(pageId);
const form = useStaffPageForm();
const errorMessage = ref("");
const successMessage = ref("");
const viewableTagsText = ref("");

watch(
  () => pageQuery.data.value,
  (page) => {
    if (!page) {
      return;
    }

    form.value = {
      title: page.title,
      body: page.body,
      notes: page.notes,
      isPinned: page.isPinned,
      isPublic: page.isPublic,
      viewableTags: [...page.viewableTags],
      documentIds: [...page.documentIds],
      sendEmails: false,
    };
  },
  { immediate: true },
);

watch(
  () => form.value.viewableTags,
  (value) => {
    viewableTagsText.value = formatStaffPageTags(value);
  },
  { immediate: true },
);

async function handleSavePage() {
  errorMessage.value = "";
  successMessage.value = "";

  try {
    await updatePageMutation.mutateAsync({
      title: form.value.title,
      body: form.value.body,
      notes: form.value.notes,
      isPinned: form.value.isPinned,
      isPublic: form.value.isPublic,
      viewableTags: form.value.viewableTags,
      documentIds: form.value.documentIds,
      sendEmails: form.value.sendEmails,
    });
    form.value.sendEmails = false;
    successMessage.value = "お知らせを更新しました。";
  } catch (error) {
    errorMessage.value = extractStaffPageValidationMessage(error);
  }
}

async function handleTogglePin() {
  if (!pageQuery.data.value) {
    return;
  }

  errorMessage.value = "";
  successMessage.value = "";

  try {
    const nextPinned = !pageQuery.data.value.isPinned;
    await patchPinMutation.mutateAsync(nextPinned);
    form.value.isPinned = nextPinned;
    successMessage.value = nextPinned
      ? "お知らせを固定表示しました。"
      : "お知らせの固定表示を解除しました。";
  } catch (error) {
    errorMessage.value = extractStaffPageValidationMessage(error);
  }
}

async function handleDeletePage() {
  if (typeof window !== "undefined" && !window.confirm("このお知らせを削除しますか？")) {
    return;
  }

  errorMessage.value = "";
  successMessage.value = "";

  try {
    await deletePageMutation.mutateAsync();
    await router.push("/staff/pages");
  } catch (error) {
    errorMessage.value = extractStaffPageValidationMessage(error);
  }
}

function handleViewableTagsInput(event: Event) {
  const target = event.target;
  if (!(target instanceof HTMLTextAreaElement)) {
    return;
  }

  form.value.viewableTags = parseStaffPageTags(target.value);
}

function handleDocumentChange(documentId: string, event: Event) {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) {
    return;
  }

  if (target.checked) {
    form.value.documentIds = [...new Set([...form.value.documentIds, documentId])];
    return;
  }

  form.value.documentIds = form.value.documentIds.filter((value) => value !== documentId);
}
</script>

<template>
  <section class="space-y-6">
    <BackLink to="/staff/pages"> お知らせ管理へ戻る </BackLink>

    <div
      v-if="pageQuery.isPending.value"
      class="rounded border border-border bg-surface p-6 text-muted shadow-lv1"
    >
      読み込み中...
    </div>

    <form v-else-if="pageQuery.data.value" class="space-y-6" @submit.prevent="handleSavePage">
      <SurfaceCard tag="header">
        <p class="text-sm text-primary">Page Detail</p>
        <h2 class="mt-3 text-3xl font-semibold text-body">お知らせを編集</h2>
        <div class="mt-3 text-sm text-muted">お知らせID : {{ pageQuery.data.value.id }}</div>
        <div class="mt-1 text-sm text-muted">{{ sessionStore.currentCircle?.name }}</div>
      </SurfaceCard>

      <SettingsSection title="お知らせ内容">
        <SettingsRow>
          <div class="grid gap-4">
            <label class="grid gap-2 text-sm text-body">
              <span class="font-medium">タイトル</span>
              <input v-model="form.title" name="title" type="text" />
            </label>

            <label class="grid gap-2 text-sm text-body">
              <span class="font-medium">本文</span>
              <textarea v-model="form.body" class="min-h-48" name="body" />
            </label>

            <label class="grid gap-2 text-sm text-body">
              <span class="font-medium">スタッフ用メモ</span>
              <textarea v-model="form.notes" class="min-h-24" name="notes" />
            </label>

            <label class="grid gap-2 text-sm text-body">
              <span class="font-medium">閲覧可能なタグ</span>
              <textarea
                :value="viewableTagsText"
                class="min-h-24"
                name="viewableTags"
                placeholder="1 行に 1 つ、またはカンマ区切りで入力"
                @input="handleViewableTagsInput"
              />
              <span class="text-xs text-muted">
                登録済みタグ:
                {{ (tagsQuery.data.value ?? []).map((tag) => tag.name).join(" / ") || "-" }}
              </span>
            </label>

            <fieldset class="grid gap-2 text-sm text-body">
              <legend>関連する配布資料</legend>
              <div
                v-if="documentsQuery.isPending.value"
                class="rounded border border-border bg-surface-light px-4 py-3 text-muted"
              >
                配布資料を読み込み中...
              </div>
              <div
                v-else-if="(documentsQuery.data.value?.length ?? 0) === 0"
                class="rounded border border-border bg-surface-light px-4 py-3 text-muted"
              >
                選択できる配布資料はありません。
              </div>
              <div v-else class="grid gap-2 rounded border border-border bg-surface-light p-4">
                <label
                  v-for="document in documentsQuery.data.value"
                  :key="document.id"
                  class="flex items-start gap-3"
                >
                  <input
                    :checked="form.documentIds.includes(document.id)"
                    type="checkbox"
                    @change="handleDocumentChange(document.id, $event)"
                  />
                  <span>
                    <strong class="text-body">{{ document.name }}</strong>
                    <span class="block text-xs text-muted">{{
                      document.description || "説明なし"
                    }}</span>
                  </span>
                </label>
              </div>
            </fieldset>

            <label class="flex items-center gap-3 text-sm text-body">
              <input v-model="form.isPinned" name="isPinned" type="checkbox" />
              固定表示する
            </label>

            <label class="flex items-center gap-3 text-sm text-body">
              <input v-model="form.isPublic" name="isPublic" type="checkbox" />
              公開する
            </label>

            <label class="flex items-center gap-3 text-sm text-body">
              <input v-model="form.sendEmails" name="sendEmails" type="checkbox" />
              保存時にモックメール配信を予約する
            </label>
            <p class="text-sm text-muted">
              予約された通知はモックキューに積まれ、実メールは送信しません。
            </p>
          </div>
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="補足">
        <SettingsRow>
          <div
            class="rounded border border-border bg-surface-light px-4 py-4 text-sm leading-7 text-muted"
          >
            閲覧タグを空にすると全体公開、タグを指定すると一致する企画タグだけが参加者画面で閲覧できます。
            関連配布資料は参加者画面でもお知らせ詳細に表示されます。
          </div>

          <p class="mt-4 text-sm text-muted">公開日時: {{ pageQuery.data.value.publishedAt }}</p>

          <ul
            v-if="pageQuery.data.value.documents.length > 0"
            class="mt-4 space-y-2 rounded border border-border bg-surface-light px-4 py-4 text-sm text-muted"
          >
            <li v-for="document in pageQuery.data.value.documents" :key="document.id">
              <span>{{ document.name }}</span>
              <span v-if="document.description"> - {{ document.description }}</span>
            </li>
          </ul>

          <p
            v-if="successMessage"
            class="mt-4 rounded border border-success bg-success-light px-4 py-3 text-sm text-success"
          >
            {{ successMessage }}
          </p>
          <p
            v-if="errorMessage"
            class="mt-4 rounded border border-danger bg-danger-light px-4 py-3 text-sm text-danger"
          >
            {{ errorMessage }}
          </p>
        </SettingsRow>
        <template #footer>
          <div class="flex flex-wrap items-center justify-between gap-3">
            <button
              class="rounded border border-danger bg-danger-light px-6 py-3 font-bold text-danger transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="deletePageMutation.isPending.value"
              type="button"
              @click="handleDeletePage"
            >
              {{ deletePageMutation.isPending.value ? "削除中..." : "削除" }}
            </button>

            <div class="flex flex-wrap gap-3">
              <button
                class="rounded border border-border bg-surface px-6 py-3 font-bold text-body transition hover:bg-surface-light disabled:cursor-not-allowed disabled:opacity-60"
                :disabled="patchPinMutation.isPending.value"
                type="button"
                @click="handleTogglePin"
              >
                {{
                  patchPinMutation.isPending.value
                    ? "更新中..."
                    : pageQuery.data.value.isPinned
                      ? "固定表示を解除"
                      : "固定表示"
                }}
              </button>
              <button
                class="rounded bg-primary px-8 py-3 font-bold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
                :disabled="updatePageMutation.isPending.value"
                type="submit"
              >
                {{ updatePageMutation.isPending.value ? "更新中..." : "保存" }}
              </button>
            </div>
          </div>
        </template>
      </SettingsSection>
    </form>

    <div v-else class="rounded border border-danger bg-danger-light p-6 text-danger">
      お知らせを取得できませんでした。
    </div>
  </section>
</template>
