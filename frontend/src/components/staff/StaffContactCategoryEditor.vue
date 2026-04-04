<script setup lang="ts">
import { ref, watch } from 'vue'
import AlertMessage from '@/components/ui/AlertMessage.vue'
import SettingsRow from '@/components/ui/SettingsRow.vue'
import SettingsSection from '@/components/ui/SettingsSection.vue'
import { buttonVariants } from '@/lib/ui/variants'
import {
  buildDeleteStaffContactCategoryConfirmMessage,
  extractStaffContactCategoryValidationMessage,
  type StaffContactCategory,
  useCreateStaffContactCategoryMutation,
  useDeleteStaffContactCategoryMutation,
  useUpdateStaffContactCategoryMutation
} from '@/features/staff/masters/contactCategories'

const { category } = defineProps<{
  category: StaffContactCategory | null
}>()

const emit = defineEmits<{
  saved: []
  deleted: []
}>()

const createMutation = useCreateStaffContactCategoryMutation()
const updateMutation = useUpdateStaffContactCategoryMutation()
const deleteMutation = useDeleteStaffContactCategoryMutation()
const name = ref('')
const email = ref('')
const errorMessage = ref('')
const successMessage = ref('')

watch(
  () => category,
  (value) => {
    name.value = value?.name ?? ''
    email.value = value?.email ?? ''
    errorMessage.value = ''
    successMessage.value = ''
  },
  { immediate: true }
)

async function handleSave() {
  errorMessage.value = ''
  successMessage.value = ''

  try {
    if (category) {
      await updateMutation.mutateAsync({
        ...category,
        name: name.value,
        email: email.value
      })
      successMessage.value = 'お問い合わせ受付設定を更新しました。'
    } else {
      await createMutation.mutateAsync({
        name: name.value,
        email: email.value
      })
      name.value = ''
      email.value = ''
      successMessage.value = 'お問い合わせ受付設定を作成しました。'
    }
    emit('saved')
  } catch (error) {
    errorMessage.value = extractStaffContactCategoryValidationMessage(error)
  }
}

async function handleDelete() {
  if (!category) {
    return
  }

  if (typeof window !== 'undefined' && !window.confirm(buildDeleteStaffContactCategoryConfirmMessage(category))) {
    return
  }

  errorMessage.value = ''
  successMessage.value = ''

  try {
    await deleteMutation.mutateAsync(category.id)
    emit('deleted')
  } catch (error) {
    errorMessage.value = extractStaffContactCategoryValidationMessage(error)
  }
}
</script>

<template>
  <div class="space-y-6 p-6">
    <header class="space-y-3">
      <h2 class="text-2xl font-semibold text-body">
        {{ category ? 'お問い合わせ受付設定を編集' : 'メールアドレスを追加' }}
      </h2>
      <div class="text-sm text-muted">ポータルからのお問い合わせを振り分けるカテゴリ名と送信先メールを設定します。</div>
    </header>

    <form class="space-y-6" @submit.prevent="handleSave">
      <SettingsSection title="お問い合わせ受付設定">
        <SettingsRow>
          <div class="grid gap-4">
            <label class="grid gap-2 text-sm text-body">
              <span class="font-medium">カテゴリ名</span>
              <input v-model="name" name="name" type="text" />
            </label>

            <label class="grid gap-2 text-sm text-body">
              <span class="font-medium">送信先メールアドレス</span>
              <input v-model="email" name="email" type="email" />
            </label>
          </div>
        </SettingsRow>

        <template #footer>
          <div class="space-y-4">
            <AlertMessage v-if="successMessage" tone="success">{{ successMessage }}</AlertMessage>
            <AlertMessage v-if="errorMessage">{{ errorMessage }}</AlertMessage>
            <div class="flex justify-between gap-3">
              <button
                v-if="category"
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
                      : category
                        ? '保存'
                        : '追加'
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
