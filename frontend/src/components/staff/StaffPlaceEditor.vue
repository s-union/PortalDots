<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AlertMessage from '@/components/ui/AlertMessage.vue'
import SettingsRow from '@/components/ui/SettingsRow.vue'
import SettingsSection from '@/components/ui/SettingsSection.vue'
import { buttonVariants } from '@/lib/ui/variants'
import {
  buildDeleteStaffPlaceConfirmMessage,
  extractStaffPlaceValidationMessage,
  type StaffPlace,
  useCreateStaffPlaceMutation,
  useDeleteStaffPlaceMutation,
  useUpdateStaffPlaceMutation
} from '@/features/staff/masters/places'
import { useFormValidation, staffPlaceFormSchema } from '@/lib/form-validation'
import FormError from '@/components/ui/FormError.vue'
import FormField from '@/components/ui/FormField.vue'

const { place } = defineProps<{
  place: StaffPlace | null
}>()

const emit = defineEmits<{
  saved: []
  deleted: []
}>()

const createMutation = useCreateStaffPlaceMutation()
const updateMutation = useUpdateStaffPlaceMutation()
const deleteMutation = useDeleteStaffPlaceMutation()
const name = ref('')
const type = ref(1)
const notes = ref('')
const errorMessage = ref('')
const successMessage = ref('')

const { getFieldError, validateAll, markTouched } = useFormValidation({
  schema: staffPlaceFormSchema,
  form: computed(() => ({ name: name.value, type: type.value }))
})

watch(
  () => place,
  (value) => {
    name.value = value?.name ?? ''
    type.value = value?.type ?? 1
    notes.value = value?.notes ?? ''
    errorMessage.value = ''
    successMessage.value = ''
  },
  { immediate: true }
)

async function handleSave() {
  errorMessage.value = ''
  successMessage.value = ''

  if (!validateAll()) {
    return
  }

  try {
    if (place) {
      await updateMutation.mutateAsync({
        ...place,
        name: name.value,
        type: type.value,
        notes: notes.value
      })
      successMessage.value = '場所を更新しました。'
    } else {
      await createMutation.mutateAsync({
        name: name.value,
        type: type.value,
        notes: notes.value
      })
      name.value = ''
      type.value = 1
      notes.value = ''
      successMessage.value = '場所を作成しました。'
    }
    emit('saved')
  } catch (error) {
    errorMessage.value = extractStaffPlaceValidationMessage(error)
  }
}

async function handleDelete() {
  if (!place) {
    return
  }

  if (typeof window !== 'undefined' && !window.confirm(buildDeleteStaffPlaceConfirmMessage(place.name))) {
    return
  }

  errorMessage.value = ''
  successMessage.value = ''

  try {
    await deleteMutation.mutateAsync(place.id)
    emit('deleted')
  } catch (error) {
    errorMessage.value = extractStaffPlaceValidationMessage(error)
  }
}
</script>

<template>
  <div class="space-y-6 p-6">
    <header class="space-y-3">
      <h2 class="text-2xl font-semibold text-body">{{ place ? '場所を編集' : '新規場所' }}</h2>
      <div class="text-sm text-muted">
        {{ place ? '既存の場所情報を編集します。' : '企画で利用する場所情報を追加します。' }}
      </div>
    </header>

    <form class="space-y-6" @submit.prevent="handleSave">
      <SettingsSection title="場所設定">
        <SettingsRow>
          <div class="grid gap-4">
            <FormField label="場所名" label-class="font-medium" :error="getFieldError('name')">
              <input
                v-model="name"
                name="name"
                type="text"
                :class="{ 'border-danger': getFieldError('name') }"
                @blur="markTouched('name')"
                @input="markTouched('name')"
              />
            </FormField>

            <FormField label="タイプ" label-class="font-medium" :error="getFieldError('type')">
              <select
                v-model.number="type"
                name="type"
                :class="{ 'border-danger': getFieldError('type') }"
                @blur="markTouched('type')"
                @change="markTouched('type')"
              >
                <option :value="1">屋内</option>
                <option :value="2">屋外</option>
                <option :value="3">特殊場所</option>
              </select>
            </FormField>

            <FormField label="スタッフ用メモ" label-class="font-medium">
              <textarea v-model="notes" class="min-h-24" name="notes" />
            </FormField>
          </div>
        </SettingsRow>

        <template #footer>
          <div class="space-y-4">
            <AlertMessage v-if="successMessage" tone="success">{{ successMessage }}</AlertMessage>
            <AlertMessage v-if="errorMessage">{{ errorMessage }}</AlertMessage>
            <div class="flex justify-between gap-3">
              <button
                v-if="place"
                :class="buttonVariants({ variant: 'dangerOutline', size: 'lg', weight: 'bold' })"
                :disabled="deleteMutation.isPending.value"
                type="button"
                @click="handleDelete"
              >
                {{ deleteMutation.isPending.value ? '削除中...' : '削除' }}
              </button>
              <div class="ml-auto">
                <button
                  :class="buttonVariants({ variant: 'primary', size: 'lg', weight: 'bold' })"
                  :disabled="createMutation.isPending.value || updateMutation.isPending.value"
                  type="submit"
                >
                  {{
                    createMutation.isPending.value || updateMutation.isPending.value
                      ? '保存中...'
                      : place
                        ? '保存'
                        : '作成'
                  }}
                </button>
              </div>
            </div>
          </div>
        </template>
      </SettingsSection>
    </form>
  </div>
</template>
