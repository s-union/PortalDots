<script setup lang="ts">
definePage({
  meta: {
    requiresAuth: true,
    requiresStaffRole: true,
    requiresStaffAuthorized: true,
    staffCapability: 'tags.read'
  }
})

import { computed, ref } from 'vue'
import StaffSideWindow from '@/components/staff/StaffSideWindow.vue'
import StaffSideWindowContainer from '@/components/staff/StaffSideWindowContainer.vue'
import StaffTagEditor from '@/components/staff/StaffTagEditor.vue'
import SurfaceCard from '@/components/ui/SurfaceCard.vue'
import SurfaceHeader from '@/components/ui/SurfaceHeader.vue'
import PageHeader from '@/components/layouts/PageHeader.vue'
import PageLayout from '@/components/layouts/PageLayout.vue'
import { buildApiUrl } from '@/lib/api/client'
import { useStaffStatusQuery } from '@/features/staff/status/api'
import { useStaffTagsQuery } from '@/features/staff/masters/tags'
import { useSessionStore } from '@/features/session/store'

const sessionStore = useSessionStore()
const staffStatusQuery = useStaffStatusQuery(computed(() => sessionStore.isAuthenticated))
const enabled = computed(() => staffStatusQuery.data.value?.authorized === true)
const tagsQuery = useStaffTagsQuery(enabled)
const exportHref = computed(() => buildApiUrl('/staff/tags/export'))
const isEditorOpen = ref(false)
const selectedTagId = ref('')

const sortedTags = computed(() =>
  [...(tagsQuery.data.value ?? [])].sort((left, right) => {
    if (left.id < right.id) {
      return -1
    }
    if (left.id > right.id) {
      return 1
    }
    return 0
  })
)

const selectedTag = computed(() => sortedTags.value.find((tag) => tag.id === selectedTagId.value) ?? null)

function openCreateEditor() {
  selectedTagId.value = ''
  isEditorOpen.value = true
}

function openEditEditor(tagId: string) {
  selectedTagId.value = tagId
  isEditorOpen.value = true
}

function closeEditor() {
  isEditorOpen.value = false
}

function handleSaved() {
  closeEditor()
}

function handleDeleted() {
  selectedTagId.value = ''
  closeEditor()
}
</script>

<template>
  <PageLayout>
    <PageHeader title="タグ管理">
      <template #actions>
        <button
          class="rounded bg-primary px-5 py-3 text-sm font-bold text-white transition hover:bg-primary-hover"
          type="button"
          @click="openCreateEditor"
        >
          新規タグ
        </button>
      </template>
    </PageHeader>

    <StaffSideWindowContainer :is-open="isEditorOpen">
      <SurfaceCard overflow-hidden>
        <SurfaceHeader>
          <template #title>企画タグ一覧</template>
          <template #description>一覧から選んだタグを右カラムで編集します。</template>
          <template #actions>
            <a
              class="rounded border border-border px-4 py-2 text-sm text-body transition hover:bg-surface-light"
              :href="exportHref"
            >
              CSVで出力(タグ別企画一覧)
            </a>
          </template>
        </SurfaceHeader>

        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-border text-sm">
            <thead class="bg-surface-light text-left text-muted-2">
              <tr>
                <th class="px-5 py-3 font-medium">タグ</th>
                <th class="px-5 py-3 font-medium text-right">操作</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <tr v-for="tag in sortedTags" :key="tag.id">
                <td class="px-5 py-4">
                  <p class="font-medium text-body">{{ tag.name }}</p>
                </td>
                <td class="px-5 py-4">
                  <div class="flex justify-end gap-2">
                    <button
                      class="rounded border border-border bg-surface px-4 py-2 text-sm text-body transition hover:bg-surface-light"
                      type="button"
                      @click="openEditEditor(tag.id)"
                    >
                      編集
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </SurfaceCard>
    </StaffSideWindowContainer>

    <StaffSideWindow :is-open="isEditorOpen" @click-close="closeEditor">
      <template #title>
        {{ selectedTag ? 'タグを編集' : '新規タグ' }}
      </template>
      <StaffTagEditor :tag="selectedTag" @deleted="handleDeleted" @saved="handleSaved" />
    </StaffSideWindow>
  </PageLayout>
</template>
