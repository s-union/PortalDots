<script setup lang="ts">
import { staffPageMeta } from '@/lib/pageMeta'
definePage({
  path: '/staff/contact-categories',
  meta: staffPageMeta('contactCategories.read')
})

import { computed, ref } from 'vue'
import PageLayout from '@/components/layouts/PageLayout.vue'
import StaffContactCategoryEditor from '@/components/staff/StaffContactCategoryEditor.vue'
import StaffSideWindow from '@/components/staff/StaffSideWindow.vue'
import StaffSideWindowContainer from '@/components/staff/StaffSideWindowContainer.vue'
import DataCard from '@/components/layouts/DataCard.vue'
import { type StaffContactCategory, useStaffContactCategoriesQuery } from '@/features/staff/masters/contactCategories'
import { useStaffStatusQuery } from '@/features/staff/status/api'
import { useSessionStore } from '@/features/session/store'
import FaIcon from '@/components/ui/FaIcon.vue'

const sessionStore = useSessionStore()
const staffStatusQuery = useStaffStatusQuery(computed(() => sessionStore.isAuthenticated))
const enabled = computed(() => staffStatusQuery.data.value?.authorized === true)
const categoriesQuery = useStaffContactCategoriesQuery(enabled)
const isEditorOpen = ref(false)
const selectedCategoryId = ref('')

const categories = computed(() => categoriesQuery.data.value ?? [])
const selectedCategory = computed<StaffContactCategory | null>(
  () => categories.value.find((category) => category.id === selectedCategoryId.value) ?? null
)

function openCreateEditor() {
  selectedCategoryId.value = ''
  isEditorOpen.value = true
}

function openEditEditor(categoryId: string) {
  selectedCategoryId.value = categoryId
  isEditorOpen.value = true
}

function closeEditor() {
  isEditorOpen.value = false
}

function handleSaved() {
  closeEditor()
}

function handleDeleted() {
  selectedCategoryId.value = ''
  closeEditor()
}
</script>

<template>
  <PageLayout>
    <StaffSideWindowContainer :is-open="isEditorOpen">
      <DataCard class="divide-y divide-border">
        <div class="px-6 py-5 text-sm leading-7 text-muted">
          ここでメールアドレスを設定するとポータルからのお問い合わせを振り分けることができます。
        </div>

        <button
          class="flex w-full items-center justify-between gap-4 px-6 py-5 text-left transition hover:bg-surface-light"
          type="button"
          @click="openCreateEditor"
        >
          <span class="inline-flex items-center gap-2 font-medium text-primary">
            <FaIcon name="plus" fixed-width />
            メールアドレスを追加
          </span>
        </button>

        <button
          v-for="category in categories"
          :key="category.id"
          class="flex w-full items-center justify-between gap-4 px-6 py-5 text-left transition hover:bg-surface-light"
          type="button"
          @click="openEditEditor(category.id)"
        >
          <div>
            <div class="font-medium text-body">{{ category.name }}</div>
            <div class="mt-1 text-sm text-muted">{{ category.email }}</div>
          </div>
          <span class="inline-flex h-8 w-8 items-center justify-center rounded text-body">
            <FaIcon name="pencil-alt" fixed-width />
          </span>
        </button>
      </DataCard>
    </StaffSideWindowContainer>

    <StaffSideWindow :is-open="isEditorOpen" @click-close="closeEditor">
      <template #title>
        {{ selectedCategory ? 'お問い合わせ受付設定を編集' : 'メールアドレスを追加' }}
      </template>
      <StaffContactCategoryEditor :category="selectedCategory" @deleted="handleDeleted" @saved="handleSaved" />
    </StaffSideWindow>
  </PageLayout>
</template>
