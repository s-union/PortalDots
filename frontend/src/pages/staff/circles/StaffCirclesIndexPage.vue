<script setup lang="ts">
import { computed, ref } from "vue";
import { useStaffStatusQuery } from "@/features/staff/status/api";
import {
  buildStaffCirclesExportUrl,
  extractStaffCircleValidationMessage,
  useAllStaffCirclesQuery,
  useCreateStaffCircleMutation,
  useStaffCircleForm,
  useStaffCirclesQuery,
} from "@/features/staff/circles/api";
import { useStaffParticipationTypesQuery } from "@/features/staff/participation-types/api";
import { useSessionStore } from "@/features/session/store";
import { calculateTotalPages } from "@/lib/pagination";

const sessionStore = useSessionStore();
const staffStatusQuery = useStaffStatusQuery(computed(() => sessionStore.isAuthenticated));
const page = ref(1);
const pageSize = 10;
const enabled = computed(() => staffStatusQuery.data.value?.authorized === true);
const circlesQuery = useStaffCirclesQuery(
  enabled,
  computed(() => ({
    page: page.value,
    pageSize,
  })),
);
const allCirclesQuery = useAllStaffCirclesQuery(enabled);
const participationTypesQuery = useStaffParticipationTypesQuery(enabled);
const createCircleMutation = useCreateStaffCircleMutation();
const form = useStaffCircleForm();
const errorMessage = ref("");
const totalPages = computed(() =>
  calculateTotalPages(
    circlesQuery.data.value?.total ?? 0,
    circlesQuery.data.value?.pageSize ?? pageSize,
  ),
);
const exportUrl = buildStaffCirclesExportUrl();

async function handleCreateCircle() {
  errorMessage.value = "";

  try {
    await createCircleMutation.mutateAsync({
      name: form.value.name,
      groupName: form.value.groupName,
      participationTypeId: form.value.participationTypeId,
    });
    form.value = {
      name: "",
      groupName: "",
      participationTypeId: "",
    };
  } catch (error) {
    errorMessage.value = extractStaffCircleValidationMessage(error);
  }
}

function movePage(nextPage: number) {
  page.value = Math.min(Math.max(nextPage, 1), totalPages.value);
}
</script>

<template>
  <section class="space-y-6">
    <header class="flex items-end justify-between gap-4">
      <div>
        <p class="text-sm text-primary">Staff Circles</p>
        <h2 class="mt-3 text-3xl font-semibold text-body">企画管理</h2>
        <p class="mt-3 text-sm leading-7 text-muted">
          企画名、企画グループ、参加種別、関連メール送信の導線を staff mode で管理します。
        </p>
      </div>
      <div class="flex flex-wrap gap-3">
        <a
          :href="exportUrl"
          class="rounded border border-border bg-surface px-4 py-2 text-sm text-body transition hover:bg-surface-light"
        >
          CSVで出力
        </a>
        <RouterLink
          class="rounded border border-border bg-surface px-4 py-2 text-sm text-body transition hover:bg-surface-light"
          to="/staff/participation-types"
        >
          参加種別管理
        </RouterLink>
        <RouterLink
          class="rounded border border-border bg-surface px-4 py-2 text-sm text-body transition hover:bg-surface-light"
          to="/staff"
        >
          Staff top へ戻る
        </RouterLink>
      </div>
    </header>

    <section class="rounded border border-border bg-surface shadow-lv1">
      <div class="border-b border-border px-6 py-4">
        <h3 class="text-lg font-semibold text-body">企画一覧</h3>
        <p class="mt-2 text-sm leading-7 text-muted">
          ページ送り付きの一覧に加え、全件数も同時に確認できます。
        </p>
      </div>

      <div class="grid gap-2 border-b border-border px-6 py-4 text-sm text-muted sm:grid-cols-2">
        <p>現在のページ件数: {{ circlesQuery.data.value?.items.length ?? 0 }}</p>
        <p>全企画数: {{ allCirclesQuery.data.value?.length ?? 0 }}</p>
      </div>

      <div v-if="circlesQuery.isPending.value" class="px-6 py-5 text-sm text-muted">
        読み込み中...
      </div>

      <div
        v-else-if="(circlesQuery.data.value?.items.length ?? 0) === 0"
        class="px-6 py-5 text-sm text-muted"
      >
        企画はまだありません。
      </div>

      <div v-else class="divide-y divide-border">
        <RouterLink
          v-for="circle in circlesQuery.data.value?.items"
          :key="circle.id"
          :to="`/staff/circles/${circle.id}`"
          class="block px-6 py-5 transition hover:bg-surface-light"
        >
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 class="text-lg font-medium text-body">{{ circle.name }}</h3>
              <p class="mt-1 text-sm text-muted">{{ circle.groupName }}</p>
              <p class="mt-1 text-xs text-muted">ID: {{ circle.id }}</p>
            </div>
            <span class="rounded-full bg-primary-light px-3 py-1 text-xs text-primary">
              {{ circle.participationTypeName }}
            </span>
          </div>
        </RouterLink>
      </div>

      <footer
        v-if="circlesQuery.data.value && circlesQuery.data.value.total > 0"
        class="flex flex-wrap items-center justify-between gap-4 border-t border-border px-6 py-4 text-sm text-muted"
      >
        <p>
          {{ circlesQuery.data.value.total }} 件中
          {{ (circlesQuery.data.value.page - 1) * circlesQuery.data.value.pageSize + 1 }} -
          {{
            Math.min(
              circlesQuery.data.value.page * circlesQuery.data.value.pageSize,
              circlesQuery.data.value.total,
            )
          }}
          件
        </p>
        <div class="flex items-center gap-3">
          <button
            class="rounded border border-border bg-surface px-4 py-2 text-sm text-body transition hover:bg-surface-light disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="page <= 1"
            type="button"
            @click="movePage(page - 1)"
          >
            前へ
          </button>
          <span>{{ page }} / {{ totalPages }}</span>
          <button
            class="rounded border border-border bg-surface px-4 py-2 text-sm text-body transition hover:bg-surface-light disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="page >= totalPages"
            type="button"
            @click="movePage(page + 1)"
          >
            次へ
          </button>
        </div>
      </footer>
    </section>

    <form
      class="rounded border border-border bg-surface shadow-lv1"
      @submit.prevent="handleCreateCircle"
    >
      <div class="border-b border-border px-6 py-4">
        <h3 class="text-lg font-semibold text-body">企画を新規作成</h3>
      </div>
      <div class="grid gap-4 px-6 py-5">
        <label class="grid gap-2 text-sm text-body">
          <span class="font-medium">企画名</span>
          <input
            v-model="form.name"
            class="rounded border border-border bg-form-control px-4 py-3 text-body outline-none transition focus:border-primary focus:focus-ring-primary"
            name="name"
            type="text"
          />
        </label>
        <label class="grid gap-2 text-sm text-body">
          <span class="font-medium">企画グループ名</span>
          <input
            v-model="form.groupName"
            class="rounded border border-border bg-form-control px-4 py-3 text-body outline-none transition focus:border-primary focus:focus-ring-primary"
            name="groupName"
            type="text"
          />
        </label>
        <label class="grid gap-2 text-sm text-body">
          <span class="font-medium">参加種別</span>
          <select
            v-model="form.participationTypeId"
            class="rounded border border-border bg-form-control px-4 py-3 text-body outline-none transition focus:border-primary focus:focus-ring-primary"
            name="participationTypeId"
          >
            <option value="">参加種別を選択してください</option>
            <option
              v-for="participationType in participationTypesQuery.data.value ?? []"
              :key="participationType.id"
              :value="participationType.id"
            >
              {{ participationType.name }}
            </option>
          </select>
        </label>

        <p
          v-if="errorMessage"
          class="rounded border border-danger bg-danger-light px-4 py-3 text-sm text-danger"
        >
          {{ errorMessage }}
        </p>
      </div>
      <div class="border-t border-border px-6 py-5">
        <button
          class="rounded bg-primary px-8 py-3 font-bold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="createCircleMutation.isPending.value"
          type="submit"
        >
          {{ createCircleMutation.isPending.value ? "作成中..." : "保存" }}
        </button>
      </div>
    </form>
  </section>
</template>
