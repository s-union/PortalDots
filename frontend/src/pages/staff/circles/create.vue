<script setup lang="ts">
definePage({
  path: '/staff/circles/create',
  meta: staffPageMeta('circles.edit')
})

import { staffPageMeta } from '@/lib/pageMeta'

import { ref } from 'vue'
import { useRouter } from 'vue-router'
import PageLayout from '@/components/layouts/PageLayout.vue'
import { buttonVariants } from '@/lib/ui/variants'
import StaffCircleCreateCard from '@/features/staff/circles/components/StaffCircleCreateCard.vue'
import {
  extractStaffCircleValidationMessage,
  useCreateStaffCircleMutation,
  useStaffCircleForm
} from '@/features/staff/circles/api'
import { useStaffPlacesQuery } from '@/features/staff/masters/places'
import { useStaffParticipationTypesQuery } from '@/features/staff/participation-types/api'
import FaIcon from '@/components/ui/FaIcon.vue'

const router = useRouter()
const createCircleMutation = useCreateStaffCircleMutation()
const participationTypesQuery = useStaffParticipationTypesQuery(true)
const placesQuery = useStaffPlacesQuery(true)
const form = useStaffCircleForm()
const errorMessage = ref('')

async function handleCreateCircle() {
  errorMessage.value = ''

  try {
    const circle = await createCircleMutation.mutateAsync({
      name: form.value.name,
      nameYomi: form.value.nameYomi,
      groupName: form.value.groupName,
      groupNameYomi: form.value.groupNameYomi,
      participationTypeId: form.value.participationTypeId,
      notes: form.value.notes,
      status: form.value.status,
      statusReason: form.value.statusReason,
      placeIds: form.value.placeIds
    })
    await router.push(`/staff/circles/${encodeURIComponent(circle.id)}`)
  } catch (error) {
    errorMessage.value = extractStaffCircleValidationMessage(error)
  }
}
</script>

<template>
  <PageLayout spacious>
    <div>
      <RouterLink :class="buttonVariants({ variant: 'secondary', size: 'sm' })" to="/staff/circles/all">
        <FaIcon name="chevron-left" fixed-width />
        全企画一覧へ戻る
      </RouterLink>
    </div>

    <StaffCircleCreateCard
      v-model:form="form"
      :participation-types="participationTypesQuery.data.value ?? []"
      :places="placesQuery.data.value ?? []"
      :error-message="errorMessage"
      :is-pending="createCircleMutation.isPending.value"
      @submit="handleCreateCircle"
    />
  </PageLayout>
</template>
