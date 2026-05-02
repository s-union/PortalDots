<script setup lang="ts">
import AlertMessage from '@/components/ui/AlertMessage.vue'
import SettingsRow from '@/components/ui/SettingsRow.vue'
import SettingsSection from '@/components/ui/SettingsSection.vue'
import { cn } from '@/lib/ui/cn'
import { buttonVariants } from '@/lib/ui/variants'
import { getRoleDisplayName, manageableRoles, roleDescriptions } from '@/features/staff/users/api'
import { useStaffUserEditor } from '@/features/staff/users/composables/useStaffUserEditor'
import FormField from '@/components/ui/FormField.vue'

const { userId } = defineProps<{
  userId: string
}>()

const emit = defineEmits<{
  saved: []
  deleted: []
}>()

const {
  contactEmail,
  deleteUser,
  deleteUserMutation,
  displayName,
  editableRoles,
  errorMessage,
  firstName,
  firstNameReading,
  handleRoleChange,
  isRoleChecked,
  lastName,
  lastNameReading,
  loginIdsText,
  phoneNumber,
  saveRoles,
  saveUser,
  successMessage,
  updateRolesMutation,
  updateUserMutation,
  userQuery,
  verifyUser,
  verifyUserMutation
} = useStaffUserEditor(userId, {
  onDeleted: () => emit('deleted'),
  onSaved: () => emit('saved')
})

const primaryButtonClass = buttonVariants({ variant: 'primary', size: 'wide', weight: 'bold' })
const dangerButtonClass = buttonVariants({ variant: 'dangerOutline', size: 'lg', weight: 'semibold' })
</script>

<template>
  <div v-if="userQuery.isPending.value" class="p-6 text-muted">読み込み中...</div>

  <div v-else-if="userQuery.data.value" class="space-y-6 p-6">
    <header class="space-y-3">
      <h2 class="text-2xl font-semibold text-body">ユーザーを編集</h2>
      <div class="text-sm text-muted">ユーザーID : {{ userQuery.data.value.id }}</div>
      <div>
        <span
          class="inline-flex items-center rounded-full px-3 py-1 text-xs"
          :class="userQuery.data.value.isVerified ? 'bg-success-light text-success' : 'bg-surface-light text-muted-2'"
        >
          {{ userQuery.data.value.isVerified ? '本人確認済み' : '本人確認未完了' }}
        </span>
      </div>
    </header>

    <form class="space-y-6" @submit.prevent="saveUser">
      <SettingsSection title="一般設定">
        <SettingsRow>
          <div class="grid gap-4">
            <div class="grid gap-4 min-[861px]:grid-cols-2">
              <FormField label="姓" label-class="font-medium">
                <input v-model="lastName" name="lastName" type="text" />
              </FormField>
              <FormField label="名" label-class="font-medium">
                <input v-model="firstName" name="firstName" type="text" />
              </FormField>
            </div>
            <div class="grid gap-4 min-[861px]:grid-cols-2">
              <FormField label="姓よみ" label-class="font-medium">
                <input v-model="lastNameReading" name="lastNameReading" type="text" />
              </FormField>
              <FormField label="名よみ" label-class="font-medium">
                <input v-model="firstNameReading" name="firstNameReading" type="text" />
              </FormField>
            </div>
            <FormField label="表示名" label-class="font-medium">
              <input v-model="displayName" name="displayName" type="text" />
            </FormField>
            <FormField label="連絡先メールアドレス" label-class="font-medium">
              <input v-model="contactEmail" name="contactEmail" type="email" />
            </FormField>
            <FormField label="電話番号" label-class="font-medium">
              <input v-model="phoneNumber" name="phoneNumber" type="tel" />
            </FormField>
            <FormField label="ログイン ID" label-class="font-medium">
              <textarea
                v-model="loginIdsText"
                class="min-h-28"
                name="loginIds"
                placeholder="1 行に 1 つ、またはカンマ区切りで入力"
              />
              <span class="text-xs text-muted">
                メールアドレスと学籍番号など、利用するログイン ID を複数登録できます。
              </span>
            </FormField>
          </div>
        </SettingsRow>
        <template #footer>
          <button :class="primaryButtonClass" :disabled="updateUserMutation.isPending.value" type="submit">
            {{ updateUserMutation.isPending.value ? '保存中...' : 'ユーザー情報を保存' }}
          </button>
        </template>
      </SettingsSection>
    </form>

    <form @submit.prevent="saveRoles">
      <SettingsSection title="ユーザー種別">
        <SettingsRow>
          <div class="grid gap-3">
            <label v-for="role in manageableRoles" :key="role" class="flex items-start gap-3 text-sm text-body">
              <input
                :checked="isRoleChecked(role)"
                :name="role"
                type="checkbox"
                @change="(event) => handleRoleChange(event, role)"
              />
              <span class="grid gap-1">
                <span class="font-medium">{{ getRoleDisplayName(role) }}</span>
                <span class="text-xs leading-6 text-muted">{{ roleDescriptions[role] }}</span>
              </span>
            </label>
          </div>
        </SettingsRow>
        <template #footer>
          <button :class="primaryButtonClass" :disabled="updateRolesMutation.isPending.value" type="submit">
            {{ updateRolesMutation.isPending.value ? '保存中...' : 'ロールを保存' }}
          </button>
        </template>
      </SettingsSection>
    </form>

    <SettingsSection title="本人確認">
      <SettingsRow>
        <div class="space-y-3 text-sm text-body">
          <p>スタッフは本人確認を完了できます。</p>
          <p class="text-muted">
            現在の状態:
            {{ userQuery.data.value.isVerified ? '本人確認済み' : '本人確認未完了' }}
          </p>
        </div>
      </SettingsRow>
      <template #footer>
        <button
          :class="cn(primaryButtonClass, userQuery.data.value.isVerified && 'hidden')"
          :disabled="verifyUserMutation.isPending.value || userQuery.data.value.isVerified"
          type="button"
          @click="verifyUser"
        >
          {{ verifyUserMutation.isPending.value ? '確認中...' : '本人確認を完了する' }}
        </button>
      </template>
    </SettingsSection>

    <SettingsSection title="危険な操作">
      <SettingsRow>
        <div class="space-y-3 text-sm text-body">
          <p>このユーザーを削除すると、関連するデータにも影響する場合があります。</p>
          <p class="text-muted">削除前に本当に対象ユーザーであることを確認してください。</p>
        </div>
      </SettingsRow>
      <template #footer>
        <button
          :class="dangerButtonClass"
          :disabled="deleteUserMutation.isPending.value"
          type="button"
          @click="deleteUser"
        >
          {{ deleteUserMutation.isPending.value ? '削除中...' : 'ユーザーを削除' }}
        </button>
      </template>
    </SettingsSection>

    <AlertMessage v-if="successMessage" tone="success">{{ successMessage }}</AlertMessage>
    <AlertMessage v-if="errorMessage" tone="danger">{{ errorMessage }}</AlertMessage>
  </div>

  <AlertMessage v-else tone="danger" class="m-6">ユーザーを取得できませんでした。</AlertMessage>
</template>
