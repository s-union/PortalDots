import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { extractDeleteAccountValidationMessage, useDeleteOwnAccountMutation } from '@/features/session/deleteAccount'
import { useSessionStore } from '@/features/session/store'
import { hasStaffAccess } from '@/features/staff/access/capabilities'
import { useUserSettingsTabs } from './useUserSettingsTabs'

export function useUserSettingsDeleteTab() {
  const { tabs } = useUserSettingsTabs('delete')
  const router = useRouter()
  const sessionStore = useSessionStore()
  const deleteAccountMutation = useDeleteOwnAccountMutation()
  const errorMessage = ref('')

  const hasPrivilegedRole = computed(() => hasStaffAccess(sessionStore.roles, sessionStore.permissions))
  const belongsToCircle = computed(() => sessionStore.currentCircle !== null)
  const canDeleteAccountFromServer = computed(() => sessionStore.user?.canDeleteAccount === true)
  const canDeleteAccount = computed(() => canDeleteAccountFromServer.value)
  const blockedReason = computed(() => {
    if (canDeleteAccountFromServer.value) {
      return 'アカウントを削除した場合、申請の手続きなどができなくなります。'
    }
    if (hasPrivilegedRole.value) {
      return '管理者ユーザー・スタッフはアカウント削除できません。'
    }
    if (belongsToCircle.value) {
      return '企画に所属しているか、参加登録の途中のため、アカウント削除はできません。'
    }
    return '企画所属または権限状態のため、現在はアカウント削除できません。'
  })

  async function deleteAccount() {
    errorMessage.value = ''
    if (!canDeleteAccount.value) {
      return
    }
    if (typeof window !== 'undefined' && !window.confirm('本当にアカウントを削除しますか？')) {
      return
    }

    try {
      await deleteAccountMutation.mutateAsync()
      await router.replace('/')
    } catch (error) {
      errorMessage.value = extractDeleteAccountValidationMessage(error)
    }
  }

  return {
    belongsToCircle,
    blockedReason,
    canDeleteAccount,
    deleteAccount,
    deleteAccountMutation,
    errorMessage,
    tabs
  }
}
