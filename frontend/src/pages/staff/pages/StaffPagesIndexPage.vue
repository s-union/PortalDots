<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import BackLink from "@/components/ui/BackLink.vue";
import SurfaceCard from "@/components/ui/SurfaceCard.vue";
import SurfaceHeader from "@/components/ui/SurfaceHeader.vue";
import { useStaffStatusQuery } from "@/features/staff/status/api";
import { useStaffDocumentsQuery } from "@/features/staff/documents/api";
import { useStaffTagsQuery } from "@/features/staff/masters/tags";
import {
  buildStaffPagesExportUrl,
  extractStaffPageValidationMessage,
  formatStaffPageTags,
  parseStaffPageTags,
  useCreateStaffPageMutation,
  useStaffPageForm,
  useStaffPagesQuery,
} from "@/features/staff/pages/api";
import { useSessionStore } from "@/features/session/store";

const route = useRoute();
const router = useRouter();
const sessionStore = useSessionStore();
const searchQuery = ref(String(route.query.query ?? ""));
const staffStatusQuery = useStaffStatusQuery(computed(() => sessionStore.isAuthenticated));
const pageFormEnabled = computed(
  () =>
    staffStatusQuery.data.value?.authorized === true &&
    sessionStore.currentCircle !== null,
);
const pagesQuery = useStaffPagesQuery(searchQuery, pageFormEnabled);
const tagsQuery = useStaffTagsQuery(pageFormEnabled);
const documentsQuery = useStaffDocumentsQuery(pageFormEnabled);
const createPageMutation = useCreateStaffPageMutation();
const form = useStaffPageForm();
const errorMessage = ref("");
const exportHref = computed(() => buildStaffPagesExportUrl());
const viewableTagsText = ref("");

watch(
  () => route.query.query,
  (value) => {
    searchQuery.value = String(value ?? "");
  },
);

watch(
  () => form.value.viewableTags,
  (value) => {
    viewableTagsText.value = formatStaffPageTags(value);
  },
  { immediate: true },
);

async function handleSearchSubmit() {
  const normalizedQuery = searchQuery.value.trim();
  await router.replace({
    query: normalizedQuery === "" ? {} : { query: normalizedQuery },
  });
}

async function handleCreatePage() {
  errorMessage.value = "";

  try {
    await createPageMutation.mutateAsync({
      title: form.value.title,
      body: form.value.body,
      notes: form.value.notes,
      isPinned: form.value.isPinned,
      isPublic: form.value.isPublic,
      viewableTags: form.value.viewableTags,
      documentIds: form.value.documentIds,
      sendEmails: form.value.sendEmails,
    });
    form.value = {
      title: "",
      body: "",
      notes: "",
      isPinned: false,
      isPublic: true,
      viewableTags: [],
      documentIds: [],
      sendEmails: false,
    };
    viewableTagsText.value = "";
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
    <header class="flex items-end justify-between gap-4">
      <div>
        <h2 class="text-2xl font-semibold text-body">お知らせ管理</h2>
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
            新規お知らせ
          </span>
          <span class="rounded border border-border px-4 py-2 text-sm text-muted">
            閲覧タグ・配布資料に対応
          </span>
          <a
            :href="exportHref"
            class="rounded border border-border px-4 py-2 text-sm text-body transition hover:bg-surface-light"
          >
            CSVで出力
          </a>
        </template>
      </SurfaceHeader>

      <form class="border-b border-border px-6 py-4" @submit.prevent="handleSearchSubmit">
        <div class="flex flex-wrap gap-3">
          <input
            v-model="searchQuery"
            class="min-w-64 flex-1"
            name="query"
            placeholder="お知らせを検索..."
            type="search"
          />
          <button
            class="rounded bg-primary px-4 py-3 text-sm font-bold text-white transition hover:bg-primary-hover"
            type="submit"
          >
            検索
          </button>
        </div>
      </form>

      <div v-if="pagesQuery.isPending.value" class="px-6 py-6 text-sm text-muted">
        読み込み中...
      </div>

      <div
        v-else-if="(pagesQuery.data.value?.length ?? 0) === 0"
        class="px-6 py-6 text-sm text-muted"
      >
        staff pages は見つかりませんでした。
      </div>

      <div v-else class="overflow-x-auto">
        <table class="min-w-full border-collapse text-sm">
          <thead class="bg-form-control">
            <tr class="text-left text-muted">
              <th class="border-b border-border px-4 py-3 font-semibold">お知らせID</th>
              <th class="border-b border-border px-4 py-3 font-semibold">タイトル</th>
              <th class="border-b border-border px-4 py-3 font-semibold">固定</th>
              <th class="border-b border-border px-4 py-3 font-semibold">公開</th>
              <th class="border-b border-border px-4 py-3 font-semibold">作成日時</th>
              <th class="border-b border-border px-4 py-3 font-semibold">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="page in pagesQuery.data.value"
              :key="page.id"
              class="transition hover:bg-form-control"
            >
              <td class="border-b border-border px-4 py-4">{{ page.id }}</td>
              <td class="border-b border-border px-4 py-4 font-medium text-body">
                <RouterLink :to="`/staff/pages/${page.id}`" class="text-primary hover:underline">
                  {{ page.title }}
                </RouterLink>
              </td>
              <td class="border-b border-border px-4 py-4">
                <strong v-if="page.isPinned">はい</strong>
                <span v-else>-</span>
              </td>
              <td class="border-b border-border px-4 py-4">
                <strong v-if="page.isPublic">はい</strong>
                <span v-else>-</span>
              </td>
              <td class="border-b border-border px-4 py-4">{{ page.publishedAt }}</td>
              <td class="border-b border-border px-4 py-4">
                <RouterLink :to="`/staff/pages/${page.id}`" class="text-primary hover:underline">
                  編集
                </RouterLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </SurfaceCard>

    <form
      class="rounded border border-border bg-surface p-6 shadow-lv1"
      @submit.prevent="handleCreatePage"
    >
      <h3 class="text-lg font-semibold text-body">お知らせを新規作成</h3>
      <div class="mt-4 grid gap-4">
        <label class="grid gap-2 text-sm text-body">
          <span>タイトル</span>
          <input v-model="form.title" name="title" type="text" />
        </label>

        <label class="grid gap-2 text-sm text-body">
          <span>本文</span>
          <textarea v-model="form.body" class="min-h-40" name="body" />
        </label>

        <label class="grid gap-2 text-sm text-body">
          <span>スタッフ用メモ</span>
          <textarea v-model="form.notes" class="min-h-24" name="notes" />
        </label>

        <label class="grid gap-2 text-sm text-body">
          <span>閲覧可能なタグ</span>
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
                <span
                  class="block text-xs text-muted"
                  >{{ document.description || "説明なし" }}</span
                >
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
          保存後にメール配信を予約する
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
            :disabled="createPageMutation.isPending.value"
            type="submit"
          >
            {{ createPageMutation.isPending.value ? "作成中..." : "保存" }}
          </button>
        </div>
      </div>
    </form>
  </section>
</template>
