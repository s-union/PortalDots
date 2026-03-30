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
import AlertMessage from '@/components/ui/AlertMessage.vue'
import SurfaceCard from '@/components/ui/SurfaceCard.vue'
import SurfaceHeader from '@/components/ui/SurfaceHeader.vue'
import PageHeader from '@/components/layouts/PageHeader.vue'
import PageLayout from '@/components/layouts/PageLayout.vue'
import { useStaffStatusQuery } from '@/features/staff/status/api'
import {
  buildStaffPlacesExportUrl,
  buildDeleteStaffPlaceConfirmMessage,
  extractStaffPlaceValidationMessage,
  placeTypeLabel,
  useCreateStaffPlaceMutation,
  useDeleteStaffPlaceMutation,
  useStaffPlacesQuery,
  useUpdateStaffPlaceMutation,
  type StaffPlace
} from '@/features/staff/masters/places'
import { useSessionStore } from '@/features/session/store'

const sessionStore = useSessionStore()
const staffStatusQuery = useStaffStatusQuery(computed(() => sessionStore.isAuthenticated))
const enabled = computed(() => staffStatusQuery.data.value?.authorized === true)
const placesQuery = useStaffPlacesQuery(enabled)
const createMutation = useCreateStaffPlaceMutation()
const updateMutation = useUpdateStaffPlaceMutation()
const deleteMutation = useDeleteStaffPlaceMutation()
const exportHref = buildStaffPlacesExportUrl()
const errorMessage = ref('')
const form = ref<Omit<StaffPlace, 'id'>>({
  name: '',
  type: 1,
  notes: ''
})
const editing = ref<Record<string, StaffPlace>>({})
const sortedPlaces = computed(() =>
  [...(placesQuery.data.value ?? [])].sort((left, right) => left.id.localeCompare(right.id))
)

async function handleCreatePlace() {
  errorMessage.value = ''
  try {
    await createMutation.mutateAsync(form.value)
    form.value = { name: '', type: 1, notes: '' }
  } catch (error) {
    errorMessage.value = extractStaffPlaceValidationMessage(error)
  }
}

async function handleUpdatePlace(placeId: string) {
  errorMessage.value = ''
  try {
    await updateMutation.mutateAsync(editing.value[placeId])
  } catch (error) {
    errorMessage.value = extractStaffPlaceValidationMessage(error)
  }
}

async function handleDeletePlace(placeId: string) {
  const placeName = placesQuery.data.value?.find((place) => place.id === placeId)?.name ?? 'この場所'
  if (typeof window !== 'undefined' && !window.confirm(buildDeleteStaffPlaceConfirmMessage(placeName))) {
    return
  }

  await deleteMutation.mutateAsync(placeId)
}
</script>

<template>
  <PageLayout>
    <PageHeader eyebrow="Staff Places" title="場所管理">
      <template #actions> </template>
    </PageHeader>

    <SurfaceCard overflow-hidden>
      <SurfaceHeader>
        <template #title>場所一覧</template>
        <template #description>場所名・タイプ・スタッフ用メモを一覧で管理します。</template>
        <template #actions>
          <a
            :href="exportHref"
            class="rounded border border-border bg-surface px-4 py-2 text-sm text-body transition hover:bg-surface-light"
          >
            CSVで出力(場所別企画一覧)
          </a>
        </template>
      </SurfaceHeader>

      <form class="border-b border-border px-5 py-4" @submit.prevent="handleCreatePlace">
        <div class="grid gap-4 md:grid-cols-3">
          <input
            v-model="form.name"
            class="rounded border border-border bg-form-control px-4 py-3 text-body outline-none transition focus:border-primary focus:focus-ring-primary"
            name="name"
            type="text"
          />
          <select
            v-model="form.type"
            class="rounded border border-border bg-form-control px-4 py-3 text-body outline-none transition focus:border-primary focus:focus-ring-primary"
            name="type"
          >
            <option :value="1">屋内</option>
            <option :value="2">屋外</option>
            <option :value="3">特殊場所</option>
          </select>
          <input
            v-model="form.notes"
            class="rounded border border-border bg-form-control px-4 py-3 text-body outline-none transition focus:border-primary focus:focus-ring-primary"
            name="notes"
            type="text"
          />
        </div>
        <div class="mt-4 flex items-center gap-4">
          <button
            class="rounded bg-primary px-5 py-3 font-bold text-white transition hover:bg-primary-hover"
            type="submit"
          >
            新規場所
          </button>
        </div>
        <AlertMessage v-if="errorMessage" class="mt-4">{{ errorMessage }}</AlertMessage>
      </form>

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
                <input
                  v-model="(editing[place.id] ??= { ...place }).name"
                  class="w-full rounded border border-border bg-form-control px-4 py-3 text-body outline-none transition focus:border-primary focus:focus-ring-primary"
                  type="text"
                />
                <p class="mt-2 text-xs text-muted">現在値: {{ (editing[place.id] ?? place).name }}</p>
              </td>
              <td class="px-5 py-4">
                <select
                  v-model="(editing[place.id] ??= { ...place }).type"
                  class="w-full rounded border border-border bg-form-control px-4 py-3 text-body outline-none transition focus:border-primary focus:focus-ring-primary"
                >
                  <option :value="1">屋内</option>
                  <option :value="2">屋外</option>
                  <option :value="3">特殊場所</option>
                </select>
                <p class="mt-2 text-xs text-muted">
                  {{ placeTypeLabel((editing[place.id] ?? place).type) }}
                </p>
              </td>
              <td class="px-5 py-4">
                <input
                  v-model="(editing[place.id] ??= { ...place }).notes"
                  class="w-full rounded border border-border bg-form-control px-4 py-3 text-body outline-none transition focus:border-primary focus:focus-ring-primary"
                  type="text"
                />
              </td>
              <td class="px-5 py-4">
                <div class="flex justify-end gap-2">
                  <button
                    class="rounded border border-border bg-surface px-4 py-2 text-sm text-body transition hover:bg-surface-light"
                    type="button"
                    @click="handleUpdatePlace(place.id)"
                  >
                    保存
                  </button>
                  <button
                    class="rounded border border-danger px-4 py-2 text-sm text-danger transition hover:bg-danger-light"
                    type="button"
                    @click="handleDeletePlace(place.id)"
                  >
                    削除
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </SurfaceCard>
  </PageLayout>
</template>
