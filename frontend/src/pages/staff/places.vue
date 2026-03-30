<script setup lang="ts">
definePage({
  meta: {
    requiresAuth: true,
    requiresStaffRole: true,
    requiresStaffAuthorized: true,
    staffCapability: 'places.read'
  }
})

import { computed, ref } from 'vue'
import StaffPlaceEditor from '@/components/staff/StaffPlaceEditor.vue'
import StaffSideWindow from '@/components/staff/StaffSideWindow.vue'
import StaffSideWindowContainer from '@/components/staff/StaffSideWindowContainer.vue'
import SurfaceCard from '@/components/ui/SurfaceCard.vue'
import SurfaceHeader from '@/components/ui/SurfaceHeader.vue'
import PageHeader from '@/components/layouts/PageHeader.vue'
import PageLayout from '@/components/layouts/PageLayout.vue'
import { buildStaffPlacesExportUrl, useStaffPlacesQuery } from '@/features/staff/masters/places'
import { useStaffStatusQuery } from '@/features/staff/status/api'
import { useSessionStore } from '@/features/session/store'

const sessionStore = useSessionStore()
const staffStatusQuery = useStaffStatusQuery(computed(() => sessionStore.isAuthenticated))
const enabled = computed(() => staffStatusQuery.data.value?.authorized === true)
const placesQuery = useStaffPlacesQuery(enabled)
const exportHref = computed(() => buildStaffPlacesExportUrl())
const isEditorOpen = ref(false)
const selectedPlaceId = ref('')

const sortedPlaces = computed(() =>
  [...(placesQuery.data.value ?? [])].sort((left, right) => {
    if (left.id < right.id) {
      return -1
    }
    if (left.id > right.id) {
      return 1
    }
    return 0
  })
)

const selectedPlace = computed(() => sortedPlaces.value.find((place) => place.id === selectedPlaceId.value) ?? null)

function openCreateEditor() {
  selectedPlaceId.value = ''
  isEditorOpen.value = true
}

function openEditEditor(placeId: string) {
  selectedPlaceId.value = placeId
  isEditorOpen.value = true
}

function closeEditor() {
  isEditorOpen.value = false
}

function handleSaved() {
  closeEditor()
}

function handleDeleted() {
  selectedPlaceId.value = ''
  closeEditor()
}

function resolvePlaceTypeLabel(placeType: number) {
  switch (placeType) {
    case 1:
      return '屋内'
    case 2:
      return '屋外'
    case 3:
      return '特殊場所'
    default:
      return String(placeType)
  }
}
</script>

<template>
  <PageLayout>
    <PageHeader title="場所管理">
      <template #actions>
        <button
          class="rounded bg-primary px-5 py-3 text-sm font-bold text-white transition hover:bg-primary-hover"
          type="button"
          @click="openCreateEditor"
        >
          新規場所
        </button>
      </template>
    </PageHeader>

    <StaffSideWindowContainer :is-open="isEditorOpen">
      <SurfaceCard overflow-hidden>
        <SurfaceHeader>
          <template #title>場所一覧</template>
          <template #description>一覧から選んだ場所を右カラムで編集します。</template>
          <template #actions>
            <a
              class="rounded border border-border px-4 py-2 text-sm text-body transition hover:bg-surface-light"
              :href="exportHref"
            >
              CSVで出力(場所別企画一覧)
            </a>
          </template>
        </SurfaceHeader>

        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-border text-sm">
            <thead class="bg-surface-light text-left text-muted-2">
              <tr>
                <th class="px-5 py-3 font-medium">場所名</th>
                <th class="px-5 py-3 font-medium">タイプ</th>
                <th class="px-5 py-3 font-medium">スタッフ用メモ</th>
                <th class="px-5 py-3 font-medium text-right">操作</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <tr v-for="place in sortedPlaces" :key="place.id">
                <td class="px-5 py-4">
                  <p class="font-medium text-body">{{ place.name }}</p>
                </td>
                <td class="px-5 py-4">
                  <span class="text-body">{{ resolvePlaceTypeLabel(place.type) }}</span>
                </td>
                <td class="px-5 py-4">
                  <span class="text-body">{{ place.notes === '' ? '-' : place.notes }}</span>
                </td>
                <td class="px-5 py-4">
                  <div class="flex justify-end gap-2">
                    <button
                      class="rounded border border-border bg-surface px-4 py-2 text-sm text-body transition hover:bg-surface-light"
                      type="button"
                      @click="openEditEditor(place.id)"
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
        {{ selectedPlace ? '場所を編集' : '新規場所' }}
      </template>
      <StaffPlaceEditor :place="selectedPlace" @deleted="handleDeleted" @saved="handleSaved" />
    </StaffSideWindow>
  </PageLayout>
</template>
