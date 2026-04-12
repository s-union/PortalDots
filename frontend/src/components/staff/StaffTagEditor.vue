<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AlertMessage from '@/components/ui/AlertMessage.vue'
import SettingsRow from '@/components/ui/SettingsRow.vue'
import SettingsSection from '@/components/ui/SettingsSection.vue'
import { buttonVariants } from '@/lib/ui/variants'
import {
  buildDeleteStaffTagConfirmMessage,
  extractStaffTagValidationMessage,
  type StaffTag,
  useCreateStaffTagMutation,
  useDeleteStaffTagMutation,
  useUpdateStaffTagMutation
} from '@/features/staff/masters/tags'
import { useFormValidation, staffTagFormSchema } from '@/lib/form-validation'

const { tag } = defineProps<{
  tag: StaffTag | null
}>()

const emit = defineEmits<{
  saved: []
  deleted: []
}>()

const createMutation = useCreateStaffTagMutation()
const updateMutation = useUpdateStaffTagMutation()
const deleteMutation = useDeleteStaffTagMutation()
const name = ref('')
const errorMessage = ref('')
const successMessage = ref('')

const { getFieldError, validateAll, markTouched } = useFormValidation({
  schema: staffTagFormSchema,
  form: computed(() => ({ name: name.value }))
})

watch(
  () => tag,
  (value) => {
    name.value = value?.name ?? ''
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
    if (tag) {
      await updateMutation.mutateAsync({
        ...tag,
        name: name.value
      })
      successMessage.value = 'タグを更新しました。'
    } else {
      await createMutation.mutateAsync(name.value)
      name.value = ''
      successMessage.value = 'タグを作成しました。'
    }
    emit('saved')
  } catch (error) {
    errorMessage.value = extractStaffTagValidationMessage(error)
  }
}

async function handleDelete() {
  if (!tag) {
    return
  }

  if (typeof window !== 'undefined' && !window.confirm(buildDeleteStaffTagConfirmMessage(tag.name))) {
    return
  }

  errorMessage.value = ''
  successMessage.value = ''

  try {
    await deleteMutation.mutateAsync(tag.id)
    emit('deleted')
  } catch (error) {
    errorMessage.value = extractStaffTagValidationMessage(error)
  }
}
</script>

<template>
  <div class="space-y-6 p-6">
    <header class="space-y-3">
      <h2 class="text-2xl font-semibold text-body">{{ tag ? 'タグを編集' : '新規タグ' }}</h2>
      <div class="text-sm text-muted">
        {{ tag ? '企画分類や公開条件に使う既存タグを編集します。' : '企画分類や公開条件に使うタグを追加します。' }}
      </div>
    </header>

    <form class="space-y-6" @submit.prevent="handleSave">
      <SettingsSection title="タグ設定">
        <SettingsRow>
          <div class="grid gap-2 text-sm text-body">
            <span class="font-medium">タグ名</span>
            <input
              v-model="name"
              name="name"
              type="text"
              :class="{ 'border-danger': getFieldError('name') }"
              @blur="markTouched('name')"
              @input="markTouched('name')"
            />
            <p v-if="getFieldError('name')" class="text-xs text-danger">{{ getFieldError('name') }}</p>
          </div>
        </SettingsRow>

        <template #footer>
          <div class="space-y-4">
            <AlertMessage v-if="successMessage" tone="success">{{ successMessage }}</AlertMessage>
            <AlertMessage v-if="errorMessage">{{ errorMessage }}</AlertMessage>
            <div class="flex justify-between gap-3">
              <button
                v-if="tag"
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
                      : tag
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
