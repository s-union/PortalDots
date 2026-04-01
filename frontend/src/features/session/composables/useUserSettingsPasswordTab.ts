import { computed, ref } from 'vue'
import { extractPasswordValidationMessage, useUpdatePasswordMutation } from '@/features/session/password'
import { useUserSettingsTabs } from './useUserSettingsTabs'

export function useUserSettingsPasswordTab() {
  const { tabs } = useUserSettingsTabs('password')
  const updatePasswordMutation = useUpdatePasswordMutation()
  const passwordForm = ref({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const errorMessage = ref('')
  const successMessage = ref('')
  const forgotPasswordHref = computed(() => '/password/reset')

  async function savePassword() {
    errorMessage.value = ''
    successMessage.value = ''

    if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
      errorMessage.value = '確認用パスワードが一致しません。'
      return
    }

    try {
      await updatePasswordMutation.mutateAsync({
        currentPassword: passwordForm.value.currentPassword,
        newPassword: passwordForm.value.newPassword
      })
      passwordForm.value = {
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }
      successMessage.value = 'パスワードを更新しました。'
    } catch (error) {
      errorMessage.value = extractPasswordValidationMessage(error)
    }
  }

  return {
    errorMessage,
    forgotPasswordHref,
    passwordForm,
    savePassword,
    successMessage,
    tabs,
    updatePasswordMutation
  }
}
