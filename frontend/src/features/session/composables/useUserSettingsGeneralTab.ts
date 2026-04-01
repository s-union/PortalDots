import { ref, watch } from 'vue'
import { extractProfileValidationMessage, useUpdateProfileMutation } from '@/features/session/profile'
import { useUserSettingsTabs } from './useUserSettingsTabs'

export function useUserSettingsGeneralTab() {
  const { sessionStore, tabs } = useUserSettingsTabs('general')
  const updateProfileMutation = useUpdateProfileMutation()
  const displayName = ref(sessionStore.user?.displayName ?? '')
  const errorMessage = ref('')
  const successMessage = ref('')

  watch(
    () => sessionStore.user?.displayName,
    (value) => {
      displayName.value = value ?? ''
    },
    { immediate: true }
  )

  async function saveProfile() {
    errorMessage.value = ''
    successMessage.value = ''

    try {
      await updateProfileMutation.mutateAsync({ displayName: displayName.value })
      displayName.value = sessionStore.user?.displayName ?? displayName.value
      successMessage.value = '表示名を更新しました。'
    } catch (error) {
      errorMessage.value = extractProfileValidationMessage(error)
    }
  }

  return {
    displayName,
    errorMessage,
    saveProfile,
    sessionStore,
    successMessage,
    tabs,
    updateProfileMutation
  }
}
