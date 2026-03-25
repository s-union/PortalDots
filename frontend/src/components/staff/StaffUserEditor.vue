<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AlertMessage from '@/components/ui/AlertMessage.vue'
import SettingsRow from '@/components/ui/SettingsRow.vue'
import SettingsSection from '@/components/ui/SettingsSection.vue'
import {
  createEditableLoginIds,
  createEditableRoles,
  extractStaffUserValidationMessage,
  formatStaffUserLoginIds,
  getRoleDisplayName,
  manageableRoles,
  normalizeSelectedRoles,
  parseStaffUserLoginIds,
  roleDescriptions,
  useDeleteStaffUserMutation,
  useStaffUserDetailQuery,
  useUpdateStaffUserMutation,
  useUpdateStaffUserRolesMutation,
  useVerifyStaffUserMutation
} from '@/features/staff/users/api'
import { useAuthorizedStaffContext } from '@/features/staff/hooks/useAuthorizedStaffContext'

const { userId } = defineProps<{
  userId: string
}>()

const emit = defineEmits<{
  saved: []
  deleted: []
}>()

const { enabled } = useAuthorizedStaffContext({ capability: 'users.edit' })
const userQuery = useStaffUserDetailQuery(
  computed(() => userId),
  enabled
)
const updateUserMutation = useUpdateStaffUserMutation()
const updateRolesMutation = useUpdateStaffUserRolesMutation()
const verifyUserMutation = useVerifyStaffUserMutation(computed(() => userId))
const deleteUserMutation = useDeleteStaffUserMutation(computed(() => userId))
const editableRoles = createEditableRoles([])
const loginIdsText = createEditableLoginIds([])
const lastName = ref('')
const lastNameReading = ref('')
const firstName = ref('')
const firstNameReading = ref('')
const displayName = ref('')
const contactEmail = ref('')
const phoneNumber = ref('')
const errorMessage = ref('')
const successMessage = ref('')

watch(
  () => userQuery.data.value,
  (user) => {
    if (!user) {
      return
    }

    lastName.value = user.lastName
    lastNameReading.value = user.lastNameReading
    firstName.value = user.firstName
    firstNameReading.value = user.firstNameReading
    displayName.value = user.displayName
    loginIdsText.value = formatStaffUserLoginIds(user.loginIds)
    contactEmail.value = user.contactEmail
    phoneNumber.value = user.phoneNumber
    editableRoles.value = [...user.roles]
    errorMessage.value = ''
    successMessage.value = ''
  },
  { immediate: true }
)

async function handleSaveUser() {
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const updatedUser = await updateUserMutation.mutateAsync({
      userId,
      lastName: lastName.value,
      lastNameReading: lastNameReading.value,
      firstName: firstName.value,
      firstNameReading: firstNameReading.value,
      displayName: displayName.value,
      loginIds: parseStaffUserLoginIds(loginIdsText.value),
      contactEmail: contactEmail.value,
      phoneNumber: phoneNumber.value
    })
    lastName.value = updatedUser.lastName
    lastNameReading.value = updatedUser.lastNameReading
    firstName.value = updatedUser.firstName
    firstNameReading.value = updatedUser.firstNameReading
    displayName.value = updatedUser.displayName
    loginIdsText.value = formatStaffUserLoginIds(updatedUser.loginIds)
    contactEmail.value = updatedUser.contactEmail
    phoneNumber.value = updatedUser.phoneNumber
    successMessage.value = 'ユーザー情報を更新しました。'
    emit('saved')
  } catch (error) {
    errorMessage.value = extractStaffUserValidationMessage(error)
  }
}

async function handleSaveRoles() {
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const updatedUser = await updateRolesMutation.mutateAsync({
      userId,
      roles: normalizeSelectedRoles(editableRoles.value)
    })
    editableRoles.value = [...updatedUser.roles]
    successMessage.value = 'ロールを更新しました。'
    emit('saved')
  } catch (error) {
    errorMessage.value = extractStaffUserValidationMessage(error)
  }
}

async function handleVerifyUser() {
  errorMessage.value = ''
  successMessage.value = ''

  try {
    await verifyUserMutation.mutateAsync()
    successMessage.value = '本人確認を完了しました。'
    emit('saved')
  } catch (error) {
    errorMessage.value = extractStaffUserValidationMessage(error)
  }
}

async function handleDeleteUser() {
  if (typeof window !== 'undefined' && !window.confirm('このユーザーを削除しますか？')) {
    return
  }

  errorMessage.value = ''
  successMessage.value = ''

  try {
    await deleteUserMutation.mutateAsync()
    emit('deleted')
  } catch (error) {
    errorMessage.value = extractStaffUserValidationMessage(error)
  }
}

function isRoleChecked(role: string) {
  return editableRoles.value.includes(role)
}

function toggleRole(role: string, checked: boolean) {
  if (checked) {
    if (!editableRoles.value.includes(role)) {
      editableRoles.value = [...editableRoles.value, role]
    }
    return
  }

  editableRoles.value = editableRoles.value.filter((currentRole) => currentRole !== role)
}

function handleRoleChange(event: Event, role: string) {
  const target = event.target
  if (!(target instanceof HTMLInputElement)) {
    return
  }

  toggleRole(role, target.checked)
}
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

    <form class="space-y-6" @submit.prevent="handleSaveUser">
      <SettingsSection title="一般設定">
        <SettingsRow>
          <div class="grid gap-4">
            <div class="grid gap-4 min-[861px]:grid-cols-2">
              <label class="grid gap-2 text-sm text-body">
                <span class="font-medium">姓</span>
                <input v-model="lastName" name="lastName" type="text" />
              </label>
              <label class="grid gap-2 text-sm text-body">
                <span class="font-medium">名</span>
                <input v-model="firstName" name="firstName" type="text" />
              </label>
            </div>
            <div class="grid gap-4 min-[861px]:grid-cols-2">
              <label class="grid gap-2 text-sm text-body">
                <span class="font-medium">姓よみ</span>
                <input v-model="lastNameReading" name="lastNameReading" type="text" />
              </label>
              <label class="grid gap-2 text-sm text-body">
                <span class="font-medium">名よみ</span>
                <input v-model="firstNameReading" name="firstNameReading" type="text" />
              </label>
            </div>
            <label class="grid gap-2 text-sm text-body">
              <span class="font-medium">表示名</span>
              <input v-model="displayName" name="displayName" type="text" />
            </label>
            <label class="grid gap-2 text-sm text-body">
              <span class="font-medium">連絡先メールアドレス</span>
              <input v-model="contactEmail" name="contactEmail" type="email" />
            </label>
            <label class="grid gap-2 text-sm text-body">
              <span class="font-medium">電話番号</span>
              <input v-model="phoneNumber" name="phoneNumber" type="tel" />
            </label>
            <label class="grid gap-2 text-sm text-body">
              <span class="font-medium">ログイン ID</span>
              <textarea
                v-model="loginIdsText"
                class="min-h-28"
                name="loginIds"
                placeholder="1 行に 1 つ、またはカンマ区切りで入力"
              />
              <span class="text-xs text-muted">
                メールアドレスと学籍番号など、利用するログイン ID を複数登録できます。
              </span>
            </label>
          </div>
        </SettingsRow>
        <template #footer>
          <button
            class="rounded bg-primary px-8 py-3 font-bold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="updateUserMutation.isPending.value"
            type="submit"
          >
            {{ updateUserMutation.isPending.value ? '保存中...' : 'ユーザー情報を保存' }}
          </button>
        </template>
      </SettingsSection>
    </form>

    <form @submit.prevent="handleSaveRoles">
      <SettingsSection title="ユーザー種別">
        <SettingsRow>
          <div class="grid gap-3">
            <label
              v-for="role in manageableRoles"
              :key="role"
              class="flex items-start gap-3 rounded border border-border px-4 py-4 text-sm text-body"
            >
              <input
                :checked="isRoleChecked(role)"
                :name="role"
                class="mt-1"
                type="checkbox"
                @change="handleRoleChange($event, role)"
              />
              <span class="grid gap-1">
                <span class="font-medium">{{ getRoleDisplayName(role) }}</span>
                <span class="text-xs leading-6 text-muted">
                  {{ roleDescriptions[role] ?? 'このロールに紐づく staff 機能を利用できます。' }}
                </span>
              </span>
            </label>
          </div>

          <div class="mt-4 rounded border border-border bg-surface-light px-4 py-4 text-sm text-muted">
            user_manager または admin を持つユーザーだけがこの画面を操作できます。
          </div>
        </SettingsRow>
        <template #footer>
          <button
            class="rounded bg-primary px-8 py-3 font-bold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="updateRolesMutation.isPending.value"
            type="submit"
          >
            {{ updateRolesMutation.isPending.value ? '更新中...' : 'ロールを保存' }}
          </button>
        </template>
      </SettingsSection>
    </form>

    <SettingsSection title="本人確認と削除">
      <SettingsRow>
        <div class="flex flex-wrap gap-3">
          <button
            class="rounded border border-success px-5 py-3 font-semibold text-success transition hover:bg-success-light disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="userQuery.data.value.isVerified || verifyUserMutation.isPending.value"
            type="button"
            @click="handleVerifyUser"
          >
            {{ verifyUserMutation.isPending.value ? '処理中...' : '本人確認を完了する' }}
          </button>
          <button
            class="rounded border border-danger px-5 py-3 font-semibold text-danger transition hover:bg-danger-light disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="deleteUserMutation.isPending.value"
            type="button"
            @click="handleDeleteUser"
          >
            {{ deleteUserMutation.isPending.value ? '削除中...' : 'ユーザーを削除' }}
          </button>
        </div>
      </SettingsRow>
    </SettingsSection>

    <AlertMessage v-if="successMessage" tone="success">{{ successMessage }}</AlertMessage>
    <AlertMessage v-if="errorMessage">{{ errorMessage }}</AlertMessage>
  </div>

  <div v-else class="rounded border border-danger bg-danger-light p-6 text-danger">
    ユーザーを取得できませんでした。
  </div>
</template>
