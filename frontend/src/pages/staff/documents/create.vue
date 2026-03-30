<script setup lang="ts">
definePage({
  meta: {
    requiresAuth: true,
    requiresStaffRole: true,
    requiresStaffAuthorized: true,
    staffCapability: 'documents.edit'
  }
})

import { ref } from 'vue'
import AlertMessage from '@/components/ui/AlertMessage.vue'
import PageHeader from '@/components/layouts/PageHeader.vue'
import PageLayout from '@/components/layouts/PageLayout.vue'
import SurfaceCard from '@/components/ui/SurfaceCard.vue'
import SurfaceHeader from '@/components/ui/SurfaceHeader.vue'
import { useManagedStaffCirclesQuery } from '@/features/staff/circles/api'
import {
  extractStaffDocumentValidationMessage,
  useCreateStaffDocumentMutation,
  useStaffDocumentForm
} from '@/features/staff/documents/api'

const createDocumentMutation = useCreateStaffDocumentMutation()
const circlesQuery = useManagedStaffCirclesQuery(true)
const form = useStaffDocumentForm()
const errorMessage = ref('')
const successMessage = ref('')

function handleFileChange(event: Event) {
  const target = event.target
  if (!(target instanceof HTMLInputElement)) {
    return
  }

  form.value.file = target.files?.[0] ?? target.files?.item(0) ?? null
}

async function handleCreateDocument() {
  errorMessage.value = ''
  successMessage.value = ''

  try {
    await createDocumentMutation.mutateAsync({
      circleId: form.value.circleId,
      name: form.value.name,
      description: form.value.description,
      notes: form.value.notes,
      isPublic: form.value.isPublic,
      isImportant: form.value.isImportant,
      file: form.value.file
    })
    form.value = {
      circleId: '',
      name: '',
      description: '',
      notes: '',
      isPublic: true,
      isImportant: false,
      file: null
    }
    successMessage.value = '配布資料を作成しました。'
  } catch (error) {
    errorMessage.value = extractStaffDocumentValidationMessage(error)
  }
}
</script>

<template>
  <PageLayout>
    <PageHeader title="配布資料を新規作成" />

    <SurfaceCard>
      <SurfaceHeader>
        <template #description>アップロードした配布資料を企画向けに公開します。</template>
      </SurfaceHeader>

      <form class="grid gap-4 px-6 py-6" @submit.prevent="handleCreateDocument">
        <label class="grid gap-2 text-sm text-body">
          <span>対象企画</span>
          <select v-model="form.circleId" name="circleId">
            <option value="">企画を選択してください</option>
            <option v-for="circle in circlesQuery.data.value ?? []" :key="circle.id" :value="circle.id">
              {{ circle.name }}
            </option>
          </select>
        </label>

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

        <AlertMessage tone="info">
          現在の upload は DB 保存です。外部ストレージ連携はまだ実装していません。
        </AlertMessage>

        <AlertMessage v-if="successMessage" tone="info">{{ successMessage }}</AlertMessage>
        <AlertMessage v-if="errorMessage">{{ errorMessage }}</AlertMessage>

        <div class="flex justify-end">
          <button
            class="rounded bg-primary px-6 py-3 font-bold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="createDocumentMutation.isPending.value"
            type="submit"
          >
            {{ createDocumentMutation.isPending.value ? 'アップロード中...' : '保存' }}
          </button>
        </div>
      </form>
    </SurfaceCard>
  </PageLayout>
</template>
