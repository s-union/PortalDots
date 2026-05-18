import { computed, reactive, ref, watch } from 'vue'
import { extractProfileValidationMessage, useUpdateProfileMutation } from '@/features/session/profile'
import { useFormValidation, profileUpdateFormSchema } from '@/lib/form-validation'
import { useUserSettingsTabs } from './useUserSettingsTabs'

export function useUserSettingsGeneralTab() {
  const { sessionStore, tabs } = useUserSettingsTabs('general')
  const updateProfileMutation = useUpdateProfileMutation()
  const form = reactive({
    name: '',
    nameYomi: '',
    contactEmail: '',
    phoneNumber: '',
    currentPassword: ''
  })
  const errorMessage = ref('')
  const successMessage = ref('')
  const studentId = computed(() => sessionStore.user?.studentId ?? '')
  const univemail = computed(() => sessionStore.user?.univemail ?? '')
  const forgotPasswordHref = computed(() => '/password/reset')

  const { fieldErrors, getFieldError, markTouched, validateAll } = useFormValidation({
    schema: profileUpdateFormSchema,
    form: computed(() => form)
  })

  watch(
    () => sessionStore.user,
    (value) => {
      form.name = [value?.lastName ?? '', value?.firstName ?? ''].filter((part) => part !== '').join(' ')
      form.nameYomi = [value?.lastNameReading ?? '', value?.firstNameReading ?? '']
        .filter((part) => part !== '')
        .join(' ')
      form.contactEmail = value?.contactEmail ?? ''
      form.phoneNumber = value?.phoneNumber ?? ''
    },
    { immediate: true }
  )

  async function saveProfile() {
    errorMessage.value = ''
    successMessage.value = ''

    if (!validateAll()) {
      return
    }

    try {
      await updateProfileMutation.mutateAsync({
        displayName: form.name,
        name: form.name,
        nameYomi: form.nameYomi,
        contactEmail: form.contactEmail,
        phoneNumber: form.phoneNumber,
        currentPassword: form.currentPassword
      })
      form.currentPassword = ''
      successMessage.value = 'プロフィールを更新しました。'
    } catch (error) {
      errorMessage.value = extractProfileValidationMessage(error)
    }
  }

  return {
    errorMessage,
    fieldErrors,
    forgotPasswordHref,
    form,
    getFieldError,
    markTouched,
    saveProfile,
    studentId,
    successMessage,
    tabs,
    univemail,
    updateProfileMutation
  }
}
