<script setup lang="ts">
definePage({
  path: '/staff/documents/create',
  meta: {
    requiresAuth: true,
    requiresStaffRole: true,
    requiresStaffAuthorized: true,
    staffCapability: 'documents.edit'
  }
})

import { ref } from 'vue'
import AlertMessage from '@/components/ui/AlertMessage.vue'
import PageLayout from '@/components/layouts/PageLayout.vue'
import SurfaceCard from '@/components/ui/SurfaceCard.vue'
import SurfaceHeader from '@/components/ui/SurfaceHeader.vue'
import { useManagedStaffCirclesQuery } from '@/features/staff/circles/api'
import BaseButton from '@/components/ui/BaseButton.vue'
import ActionsFooter from '@/components/ui/ActionsFooter.vue'
import FormField from '@/components/ui/FormField.vue'
import CheckboxField from '@/components/ui/CheckboxField.vue'
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
    <SurfaceCard>
      <SurfaceHeader>
        <template #title>配布資料を新規作成</template>
        <template #description>アップロードした配布資料を企画向けに公開します。</template>
      </SurfaceHeader>

      <form class="grid gap-4 px-6 py-6" @submit.prevent="handleCreateDocument">
        <FormField label="対象企画">
          <select v-model="form.circleId" name="circleId">
            <option value="">企画を選択してください</option>
            <option v-for="circle in circlesQuery.data.value ?? []" :key="circle.id" :value="circle.id">
              {{ circle.name }}
            </option>
          </select>
        </FormField>

        <FormField label="配布資料名">
          <input v-model="form.name" name="name" type="text" />
        </FormField>

        <FormField label="説明">
          <textarea v-model="form.description" class="min-h-32" name="description" />
        </FormField>

        <FormField label="スタッフ用メモ">
          <textarea v-model="form.notes" class="min-h-24" name="notes" />
        </FormField>

        <FormField label="ファイル">
          <input name="file" type="file" @change="handleFileChange" />
        </FormField>

        <CheckboxField v-model="form.isImportant" label="重要資料として扱う" name="isImportant" />

        <CheckboxField v-model="form.isPublic" label="公開する" name="isPublic" />

        <AlertMessage tone="info">
          現在の upload は DB 保存です。外部ストレージ連携はまだ実装していません。
        </AlertMessage>

        <AlertMessage v-if="successMessage" tone="info">{{ successMessage }}</AlertMessage>
        <AlertMessage v-if="errorMessage">{{ errorMessage }}</AlertMessage>

        <ActionsFooter align="end">
          <BaseButton
            variant="primary"
            size="wide"
            weight="bold"
            :disabled="createDocumentMutation.isPending.value"
            type="submit"
          >
            {{ createDocumentMutation.isPending.value ? 'アップロード中...' : '保存' }}
          </BaseButton>
        </ActionsFooter>
      </form>
    </SurfaceCard>
  </PageLayout>
</template>
