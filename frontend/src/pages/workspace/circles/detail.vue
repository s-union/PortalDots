<script setup lang="ts">
definePage({
  meta: {
    requiresAuth: true,
    requiresCircle: true
  }
})

import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AlertMessage from '@/components/ui/AlertMessage.vue'
import BackLink from '@/components/ui/BackLink.vue'
import SettingsRow from '@/components/ui/SettingsRow.vue'
import SettingsSection from '@/components/ui/SettingsSection.vue'
import SurfaceCard from '@/components/ui/SurfaceCard.vue'
import {
  useCurrentCircleDetailQuery,
  useUpdateCircleMutation,
  useSubmitCircleMutation,
  useDeleteCircleMutation
} from '@/features/circles/api'
import { cn } from '@/lib/ui/cn'
import { buttonVariants } from '@/lib/ui/variants'

const router = useRouter()
const detailQuery = useCurrentCircleDetailQuery()
const updateMutation = useUpdateCircleMutation()
const submitMutation = useSubmitCircleMutation()
const deleteMutation = useDeleteCircleMutation()

const form = ref({
  name: '',
  nameYomi: '',
  groupName: '',
  groupNameYomi: '',
  notes: ''
})

const successMessage = ref('')
const errorMessage = ref('')

watch(
  () => detailQuery.data.value,
  (data) => {
    if (data) {
      form.value = {
        name: data.name,
        nameYomi: data.nameYomi,
        groupName: data.groupName,
        groupNameYomi: data.groupNameYomi,
        notes: data.notes
      }
    }
  },
  { immediate: true }
)

async function handleSave() {
  successMessage.value = ''
  errorMessage.value = ''

  try {
    await updateMutation.mutateAsync(form.value)
    successMessage.value = '企画情報を更新しました。'
  } catch {
    errorMessage.value = '企画情報の更新に失敗しました。'
  }
}

async function handleSubmit() {
  if (!confirm('参加登録を提出します。よろしいですか？')) {
    return
  }
  errorMessage.value = ''

  try {
    await submitMutation.mutateAsync()
    successMessage.value = '参加登録を提出しました。'
  } catch {
    errorMessage.value = '参加登録の提出に失敗しました。'
  }
}

async function handleDelete() {
  if (!confirm('企画を削除します。この操作は取り消せません。よろしいですか？')) {
    return
  }
  errorMessage.value = ''

  try {
    await deleteMutation.mutateAsync()
    await router.push('/workspace')
  } catch {
    errorMessage.value = '企画の削除に失敗しました。リーダーのみ削除できます。'
  }
}
</script>

<template>
  <section class="space-y-6">
    <BackLink to="/workspace"> ワークスペースへ戻る </BackLink>

    <SurfaceCard tag="header">
      <p class="text-sm text-primary">Circle Detail</p>
      <h2 class="mt-3 text-3xl font-semibold text-body">企画情報</h2>
      <p class="mt-3 text-sm leading-7 text-muted">企画の情報を確認・編集します。</p>
    </SurfaceCard>

    <div v-if="detailQuery.isPending.value" class="text-sm text-muted">読み込み中...</div>

    <template v-else-if="detailQuery.data.value">
      <!-- 提出状態 -->
      <div
        class="rounded border px-6 py-4"
        :class="
          detailQuery.data.value.submittedAt ? 'border-success bg-success-light' : 'border-warning bg-warning-light'
        "
      >
        <p class="text-sm font-semibold">
          {{
            detailQuery.data.value.submittedAt
              ? `提出済み (${new Date(detailQuery.data.value.submittedAt).toLocaleDateString('ja-JP')})`
              : '未提出'
          }}
        </p>
        <p class="mt-1 text-xs text-muted">参加種別: {{ detailQuery.data.value.participationTypeName }}</p>
      </div>

      <!-- 編集フォーム -->
      <SettingsSection title="企画情報を編集">
        <SettingsRow>
          <div class="grid gap-4">
            <label class="grid gap-2 text-sm text-body">
              <span class="font-semibold">企画名 <span class="text-danger">*</span></span>
              <input v-model="form.name" type="text" />
            </label>
            <label class="grid gap-2 text-sm text-body">
              <span class="font-semibold">企画名（よみ）</span>
              <input v-model="form.nameYomi" type="text" />
            </label>
            <label class="grid gap-2 text-sm text-body">
              <span class="font-semibold">団体名 <span class="text-danger">*</span></span>
              <input v-model="form.groupName" type="text" />
            </label>
            <label class="grid gap-2 text-sm text-body">
              <span class="font-semibold">団体名（よみ）</span>
              <input v-model="form.groupNameYomi" type="text" />
            </label>
            <label class="grid gap-2 text-sm text-body">
              <span class="font-semibold">備考</span>
              <textarea v-model="form.notes" rows="3" />
            </label>
          </div>
        </SettingsRow>

        <template #footer>
          <div class="space-y-4">
            <AlertMessage v-if="successMessage" tone="success">
              {{ successMessage }}
            </AlertMessage>
            <AlertMessage v-if="errorMessage" tone="danger">
              {{ errorMessage }}
            </AlertMessage>
            <div class="flex flex-wrap justify-between gap-3">
              <button
                :class="buttonVariants({ variant: 'danger', size: 'lg', weight: 'bold' })"
                :disabled="deleteMutation.isPending.value"
                type="button"
                @click="handleDelete"
              >
                企画を削除
              </button>
              <div class="flex gap-3">
                <button
                  v-if="!detailQuery.data.value.submittedAt"
                  :class="buttonVariants({ variant: 'primaryInverse', size: 'lg', weight: 'bold' })"
                  :disabled="submitMutation.isPending.value"
                  type="button"
                  @click="handleSubmit"
                >
                  {{ submitMutation.isPending.value ? '提出中...' : '参加登録を提出' }}
                </button>
                <button
                  :class="cn(buttonVariants({ variant: 'primary', size: 'lg', weight: 'bold' }))"
                  :disabled="updateMutation.isPending.value"
                  type="button"
                  @click="handleSave"
                >
                  {{ updateMutation.isPending.value ? '保存中...' : '変更を保存' }}
                </button>
              </div>
            </div>
          </div>
        </template>
      </SettingsSection>

      <!-- メンバー管理リンク -->
      <SurfaceCard>
        <div class="flex items-center justify-between">
          <div>
            <p class="font-semibold text-body">メンバー管理</p>
            <p class="mt-1 text-sm text-muted">招待リンクの確認・メンバーの管理を行います。</p>
          </div>
          <RouterLink
            class="rounded border border-primary px-4 py-2 text-sm font-bold text-primary transition hover:bg-primary-light"
            to="/workspace/circles/members"
          >
            メンバーを管理
          </RouterLink>
        </div>
      </SurfaceCard>
    </template>

    <div v-else class="rounded border border-border px-6 py-6 text-sm text-muted">企画情報を取得できませんでした。</div>
  </section>
</template>
