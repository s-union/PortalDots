<script setup lang="ts">
definePage({
  path: '/staff/contacts/categories',
  meta: {
    requiresAuth: true,
    requiresStaffRole: true,
    requiresStaffAuthorized: true,
    requiresCircle: true,
    staffCapability: 'contactCategories.read'
  }
})

import { computed, ref } from 'vue'
import AlertMessage from '@/components/ui/AlertMessage.vue'
import BackLink from '@/components/ui/BackLink.vue'
import SurfaceCard from '@/components/ui/SurfaceCard.vue'
import SurfaceHeader from '@/components/ui/SurfaceHeader.vue'
import PageHeader from '@/components/layouts/PageHeader.vue'
import PageLayout from '@/components/layouts/PageLayout.vue'
import { useStaffStatusQuery } from '@/features/staff/status/api'
import {
  buildDeleteStaffContactCategoryConfirmMessage,
  extractStaffContactCategoryValidationMessage,
  useCreateStaffContactCategoryMutation,
  useDeleteStaffContactCategoryMutation,
  useStaffContactCategoriesQuery,
  useUpdateStaffContactCategoryMutation,
  type StaffContactCategory
} from '@/features/staff/masters/contactCategories'
import { useSessionStore } from '@/features/session/store'

const sessionStore = useSessionStore()
const staffStatusQuery = useStaffStatusQuery(computed(() => sessionStore.isAuthenticated))
const enabled = computed(() => staffStatusQuery.data.value?.authorized === true && sessionStore.currentCircle !== null)
const categoriesQuery = useStaffContactCategoriesQuery(enabled)
const createMutation = useCreateStaffContactCategoryMutation()
const updateMutation = useUpdateStaffContactCategoryMutation()
const deleteMutation = useDeleteStaffContactCategoryMutation()
const errorMessage = ref('')
const form = ref<Omit<StaffContactCategory, 'id'>>({
  name: '',
  email: ''
})
const editing = ref<Record<string, StaffContactCategory>>({})

async function handleCreateCategory() {
  errorMessage.value = ''
  try {
    await createMutation.mutateAsync(form.value)
    form.value = { name: '', email: '' }
  } catch (error) {
    errorMessage.value = extractStaffContactCategoryValidationMessage(error)
  }
}

async function handleUpdateCategory(categoryId: string) {
  errorMessage.value = ''
  try {
    await updateMutation.mutateAsync(editing.value[categoryId])
  } catch (error) {
    errorMessage.value = extractStaffContactCategoryValidationMessage(error)
  }
}

async function handleDeleteCategory(categoryId: string) {
  const category = categoriesQuery.data.value?.find((value) => value.id === categoryId)
  if (
    category &&
    typeof window !== 'undefined' &&
    !window.confirm(buildDeleteStaffContactCategoryConfirmMessage(category))
  ) {
    return
  }

  await deleteMutation.mutateAsync(categoryId)
}
</script>

<template>
  <PageLayout>
    <PageHeader eyebrow="Staff Contacts" title="問い合わせカテゴリ管理">
      <template #actions>
        <BackLink to="/staff">Staff top へ戻る</BackLink>
      </template>
    </PageHeader>

    <SurfaceCard>
      <SurfaceHeader>
        <template #title>お問い合わせ受付設定</template>
        <template #description
          >ここでメールアドレスを設定するとポータルからのお問い合わせを振り分けることができます。</template
        >
      </SurfaceHeader>

      <form class="border-b border-border px-6 py-4" @submit.prevent="handleCreateCategory">
        <div class="grid gap-4 md:grid-cols-2">
          <input
            v-model="form.name"
            class="rounded border border-border bg-form-control px-4 py-3 text-body outline-none transition focus:border-primary focus:focus-ring-primary"
            name="name"
            type="text"
          />
          <input
            v-model="form.email"
            class="rounded border border-border bg-form-control px-4 py-3 text-body outline-none transition focus:border-primary focus:focus-ring-primary"
            name="email"
            type="email"
          />
        </div>
        <div class="mt-4">
          <button
            class="rounded bg-primary px-5 py-3 font-bold text-white transition hover:bg-primary-hover"
            type="submit"
          >
            メールアドレスを追加
          </button>
        </div>
        <AlertMessage v-if="errorMessage" class="mt-4">{{ errorMessage }}</AlertMessage>
      </form>

      <div class="divide-y divide-border">
        <article v-for="category in categoriesQuery.data.value" :key="category.id" class="px-6 py-5">
          <div class="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
            <input
              v-model="(editing[category.id] ??= { ...category }).name"
              class="rounded border border-border bg-form-control px-4 py-3 text-body outline-none transition focus:border-primary focus:focus-ring-primary"
              type="text"
            />
            <input
              v-model="(editing[category.id] ??= { ...category }).email"
              class="rounded border border-border bg-form-control px-4 py-3 text-body outline-none transition focus:border-primary focus:focus-ring-primary"
              type="email"
            />
            <div class="flex gap-2">
              <button
                class="rounded border border-border bg-surface px-4 py-2 text-sm text-body transition hover:bg-surface-light"
                type="button"
                @click="handleUpdateCategory(category.id)"
              >
                保存
              </button>
              <button
                class="rounded border border-danger px-4 py-2 text-sm text-danger transition hover:bg-danger-light"
                type="button"
                @click="handleDeleteCategory(category.id)"
              >
                削除
              </button>
            </div>
          </div>
          <p class="mt-3 text-sm text-muted">現在値: {{ category.name }} / {{ category.email }}</p>
        </article>
      </div>
    </SurfaceCard>
  </PageLayout>
</template>
