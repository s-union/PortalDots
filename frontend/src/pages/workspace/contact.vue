<script setup lang="ts">
definePage({
  meta: {
    requiresAuth: true,
    requiresCircle: true
  }
})

import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import AlertMessage from '@/components/ui/AlertMessage.vue'
import ListPanel from '@/components/ui/ListPanel.vue'
import LoadingMessage from '@/components/ui/LoadingMessage.vue'
import PageLayout from '@/components/layouts/PageLayout.vue'
import SettingsRow from '@/components/ui/SettingsRow.vue'
import SettingsSection from '@/components/ui/SettingsSection.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import SurfaceCard from '@/components/ui/SurfaceCard.vue'
import {
  extractContactValidationMessage,
  useContactCategoriesQuery,
  useContactHistoryQuery,
  useSubmitContactMutation
} from '@/features/contact/api'
import { useSessionStore } from '@/features/session/store'
import { formatDateTime } from '@/lib/format/datetime'
import { cn } from '@/lib/ui/cn'
import { buttonVariants } from '@/lib/ui/variants'

const route = useRoute()
const sessionStore = useSessionStore()
const categoriesQuery = useContactCategoriesQuery()
const historyQuery = useContactHistoryQuery()
const submitContactMutation = useSubmitContactMutation()
const form = ref({
  categoryId: '',
  subject: '',
  body: ''
})
const errorMessage = ref('')
const successMessage = ref('')
const selectedCategoryName = computed(
  () => categoriesQuery.data.value?.find((category) => category.id === form.value.categoryId)?.name ?? ''
)
const circleSelectorLink = computed(() => `/circles/select?redirect=${encodeURIComponent(route.fullPath)}`)

async function handleSubmit() {
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const result = await submitContactMutation.mutateAsync({
      categoryId: form.value.categoryId,
      subject: form.value.subject,
      body: form.value.body
    })
    successMessage.value = `「${result.categoryName}」に問い合わせを送信しました。`
    form.value = {
      categoryId: '',
      subject: '',
      body: ''
    }
  } catch (error) {
    errorMessage.value = extractContactValidationMessage(error)
  }
}
</script>

<template>
  <PageLayout>
    <SurfaceCard tag="header">
      <p class="text-sm text-primary">Contact</p>
      <h2 class="mt-3 text-3xl font-semibold text-body">お問い合わせ</h2>
      <p class="mt-3 text-sm leading-7 text-muted">問い合わせ内容を確認し、順次対応します。</p>
    </SurfaceCard>

    <SettingsSection title="お問い合わせ前の確認">
      <SettingsRow>
        <div class="grid gap-3 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-6">
          <p class="text-sm font-semibold text-body">現在の企画</p>
          <div class="flex flex-wrap items-center gap-3">
            <p class="text-sm text-body">{{ sessionStore.currentCircle?.name ?? '企画未選択' }}</p>
            <RouterLink
              :to="circleSelectorLink"
              class="inline-flex rounded border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-body transition hover:bg-surface-light"
            >
              企画を変更
            </RouterLink>
          </div>
        </div>
      </SettingsRow>
      <SettingsRow>
        <div class="grid gap-3 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-6">
          <p class="text-sm font-semibold text-body">ログイン中ユーザー</p>
          <p class="text-sm text-body">
            {{ sessionStore.user?.displayName ?? '未ログイン' }}
          </p>
        </div>
      </SettingsRow>
      <SettingsRow>
        <div class="grid gap-3 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-6">
          <p class="text-sm font-semibold text-body">送信先カテゴリ</p>
          <p class="text-sm leading-7 text-muted">
            {{ selectedCategoryName || 'カテゴリを選択してください' }}
          </p>
        </div>
      </SettingsRow>
    </SettingsSection>

    <form class="rounded border border-border bg-surface p-6 shadow-lv1" @submit.prevent="handleSubmit">
      <h3 class="text-lg font-semibold text-body">お問い合わせ</h3>
      <div class="mt-4 grid gap-4">
        <label class="grid gap-2 text-sm text-body">
          <span>問い合わせカテゴリ</span>
          <select v-model="form.categoryId" name="categoryId">
            <option value="">選択してください</option>
            <option v-for="category in categoriesQuery.data.value ?? []" :key="category.id" :value="category.id">
              {{ category.name }}
            </option>
          </select>
        </label>

        <label class="grid gap-2 text-sm text-body">
          <span>件名</span>
          <input v-model="form.subject" name="subject" type="text" />
        </label>

        <label class="grid gap-2 text-sm text-body">
          <span>本文</span>
          <textarea v-model="form.body" class="min-h-40" name="body" />
        </label>

        <AlertMessage v-if="successMessage" tone="success">
          {{ successMessage }}
        </AlertMessage>
        <AlertMessage v-if="errorMessage" tone="danger">
          {{ errorMessage }}
        </AlertMessage>

        <div class="flex justify-end">
          <button
            :class="cn(buttonVariants({ variant: 'primary', size: 'lg', weight: 'bold' }))"
            :disabled="submitContactMutation.isPending.value || categoriesQuery.isPending.value"
            type="submit"
          >
            {{ submitContactMutation.isPending.value ? '送信中...' : '送信する' }}
          </button>
        </div>
      </div>
    </form>

    <ListPanel title="送信履歴" description="この企画で送信したお問い合わせの履歴です。" overflow-hidden>
      <LoadingMessage v-if="historyQuery.isPending.value" />
      <div v-else-if="(historyQuery.data.value?.length ?? 0) === 0" class="px-6 py-6 text-sm text-muted">
        まだお問い合わせは送信していません。
      </div>
      <div v-else class="divide-y divide-border">
        <div v-for="item in historyQuery.data.value" :key="item.id" class="px-6 py-5">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p class="text-sm font-semibold text-body">{{ item.subject }}</p>
              <p class="mt-2 text-xs text-muted">{{ item.categoryName }} / {{ formatDateTime(item.createdAt) }}</p>
            </div>
            <StatusBadge tone="primary">
              {{ item.status }}
            </StatusBadge>
          </div>
        </div>
      </div>
    </ListPanel>
  </PageLayout>
</template>
