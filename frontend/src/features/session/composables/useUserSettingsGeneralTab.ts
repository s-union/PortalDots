import { computed, ref, watch } from 'vue'
import { extractProfileValidationMessage, useUpdateProfileMutation } from '@/features/session/profile'
import { useUserSettingsTabs } from './useUserSettingsTabs'

export function useUserSettingsGeneralTab() {
  const { sessionStore, tabs } = useUserSettingsTabs('general')
  const updateProfileMutation = useUpdateProfileMutation()
  const name = ref('')
  const nameYomi = ref('')
  const contactEmail = ref('')
  const phoneNumber = ref('')
  const currentPassword = ref('')
  const errorMessage = ref('')
  const successMessage = ref('')
  const studentId = computed(() => sessionStore.user?.studentId ?? '')
  const univemail = computed(() => sessionStore.user?.univemail ?? '')
  const forgotPasswordHref = computed(() => '/password/reset')

  watch(
    () => sessionStore.user,
    (value) => {
      name.value = [value?.lastName ?? '', value?.firstName ?? ''].filter((part) => part !== '').join(' ')
      nameYomi.value = [value?.lastNameReading ?? '', value?.firstNameReading ?? '']
        .filter((part) => part !== '')
        .join(' ')
      contactEmail.value = value?.contactEmail ?? ''
      phoneNumber.value = value?.phoneNumber ?? ''
    },
    { immediate: true }
  )

  async function saveProfile() {
    errorMessage.value = ''
    successMessage.value = ''

    try {
      await updateProfileMutation.mutateAsync({
        displayName: name.value,
        name: name.value,
        nameYomi: nameYomi.value,
        contactEmail: contactEmail.value,
        phoneNumber: phoneNumber.value,
        currentPassword: currentPassword.value
      })
      currentPassword.value = ''
      successMessage.value = 'プロフィールを更新しました。'
    } catch (error) {
      errorMessage.value = extractProfileValidationMessage(error)
    }
  }

  return {
    contactEmail,
    currentPassword,
    errorMessage,
    forgotPasswordHref,
    name,
    nameYomi,
    phoneNumber,
    saveProfile,
    studentId,
    successMessage,
    tabs,
    univemail,
    updateProfileMutation
  }
}
