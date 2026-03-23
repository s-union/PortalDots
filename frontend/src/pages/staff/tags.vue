<script setup lang="ts">
definePage({
  meta: {
    requiresAuth: true,
    requiresStaffRole: true,
    requiresStaffAuthorized: true,
    requiresCircle: true,
    staffCapability: 'tags.read'
  }
})

import { computed, ref } from 'vue'
import { buildApiUrl } from '@/lib/api/client'
import { useStaffStatusQuery } from '@/features/staff/status/api'
import {
  extractStaffTagValidationMessage,
  useCreateStaffTagMutation,
  useDeleteStaffTagMutation,
  useStaffTagsQuery,
  useUpdateStaffTagMutation
} from '@/features/staff/masters/tags'
import { useSessionStore } from '@/features/session/store'

const sessionStore = useSessionStore()
const staffStatusQuery = useStaffStatusQuery(computed(() => sessionStore.isAuthenticated))
const enabled = computed(() => staffStatusQuery.data.value?.authorized === true && sessionStore.currentCircle !== null)
const tagsQuery = useStaffTagsQuery(enabled)
const createMutation = useCreateStaffTagMutation()
const updateMutation = useUpdateStaffTagMutation()
const deleteMutation = useDeleteStaffTagMutation()
const exportHref = computed(() => buildApiUrl('/staff/tags/export'))
const newTagName = ref('')
const errorMessage = ref('')
const editingNames = ref<Record<string, string>>({})

function buildDeleteTagConfirmMessage(tagName: string) {
  return `本当に「${tagName}」タグを削除しますか？\n\n• 企画に紐付いている「${tagName}」タグは解除されます。企画自体は削除されません\n• お知らせの閲覧タグから「${tagName}」が外れ、このタグだけを指定していたお知らせは全ユーザー公開になります\n• 申請フォームの回答可能タグから「${tagName}」が外れ、このタグだけを指定していたフォームは全企画が回答可能になります`
}

async function handleCreateTag() {
  errorMessage.value = ''
  try {
    await createMutation.mutateAsync(newTagName.value)
    newTagName.value = ''
  } catch (error) {
    errorMessage.value = extractStaffTagValidationMessage(error)
  }
}

async function handleUpdateTag(tagId: string) {
  errorMessage.value = ''
  try {
    await updateMutation.mutateAsync({
      id: tagId,
      name: editingNames.value[tagId] ?? ''
    })
  } catch (error) {
    errorMessage.value = extractStaffTagValidationMessage(error)
  }
}

async function handleDeleteTag(tagId: string) {
  const tagName = tagsQuery.data.value?.find((tag) => tag.id === tagId)?.name ?? editingNames.value[tagId] ?? 'このタグ'
  if (typeof window !== 'undefined' && !window.confirm(buildDeleteTagConfirmMessage(tagName))) {
    return
  }

  await deleteMutation.mutateAsync(tagId)
}
</script>

<template>
  <section class="space-y-6">
    <header class="flex items-end justify-between gap-4">
      <div>
        <p class="text-sm text-primary">Staff Tags</p>
        <h2 class="mt-3 text-3xl font-semibold text-body">タグ管理</h2>
      </div>
      <RouterLink
        class="rounded border border-border bg-surface px-4 py-2 text-sm text-body transition hover:bg-surface-light"
        to="/staff"
      >
        Staff top へ戻る
      </RouterLink>
    </header>

    <section class="overflow-hidden rounded border border-border bg-surface shadow-lv1">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h3 class="text-base font-semibold text-body">企画タグ一覧</h3>
          <p class="mt-1 text-sm text-muted">タグの編集と削除を一覧上で行います。</p>
        </div>
        <a
          class="rounded border border-border px-4 py-2 text-sm text-body transition hover:bg-surface-light"
          :href="exportHref"
        >
          CSVで出力(タグ別企画一覧)
        </a>
      </div>

      <form class="border-b border-border px-5 py-4" @submit.prevent="handleCreateTag">
        <div class="flex flex-wrap gap-3">
          <input
            v-model="newTagName"
            class="min-w-64 flex-1 rounded border border-border bg-form-control px-4 py-3 text-body outline-none transition focus:border-primary focus:focus-ring-primary"
            name="name"
            type="text"
          />
          <button
            class="rounded bg-primary px-5 py-3 font-bold text-white transition hover:bg-primary-hover"
            type="submit"
          >
            新規タグ
          </button>
        </div>
        <p v-if="errorMessage" class="mt-4 rounded border border-danger bg-danger-light px-4 py-3 text-sm text-danger">
          {{ errorMessage }}
        </p>
      </form>

      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-border text-sm">
          <thead class="bg-surface-light text-left text-muted-2">
            <tr>
              <th class="px-5 py-3 font-medium">タグID</th>
              <th class="px-5 py-3 font-medium">タグ</th>
              <th class="px-5 py-3 font-medium text-right">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <tr v-for="tag in tagsQuery.data.value" :key="tag.id">
              <td class="px-5 py-4 text-muted">{{ tag.id }}</td>
              <td class="px-5 py-4">
                <input
                  v-model="editingNames[tag.id]"
                  :placeholder="tag.name"
                  class="w-full rounded border border-border bg-form-control px-4 py-3 text-body outline-none transition focus:border-primary focus:focus-ring-primary"
                  type="text"
                />
                <p class="mt-2 text-xs text-muted">現在値: {{ editingNames[tag.id] || tag.name }}</p>
              </td>
              <td class="px-5 py-4">
                <div class="flex justify-end gap-2">
                  <button
                    class="rounded border border-border bg-surface px-4 py-2 text-sm text-body transition hover:bg-surface-light"
                    type="button"
                    @click="handleUpdateTag(tag.id)"
                  >
                    保存
                  </button>
                  <button
                    class="rounded border border-danger px-4 py-2 text-sm text-danger transition hover:bg-danger-light"
                    type="button"
                    @click="handleDeleteTag(tag.id)"
                  >
                    削除
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </section>
</template>
