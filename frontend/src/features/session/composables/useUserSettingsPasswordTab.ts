import { computed, reactive, ref } from 'vue'
import { extractPasswordValidationMessage, useUpdatePasswordMutation } from '@/features/session/password'
import { useFormValidation, passwordChangeFormSchema } from '@/lib/form-validation'
import { useUserSettingsTabs } from './useUserSettingsTabs'

export function useUserSettingsPasswordTab() {
  const { tabs } = useUserSettingsTabs('password')
  const updatePasswordMutation = useUpdatePasswordMutation()
  const passwordForm = reactive({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const errorMessage = ref('')
  const successMessage = ref('')
  const forgotPasswordHref = computed(() => '/password/reset')

  const { fieldErrors, getFieldError, markTouched, validateAll } = useFormValidation({
    schema: passwordChangeFormSchema,
    form: computed(() => passwordForm)
  })

  async function savePassword() {
    errorMessage.value = ''
    successMessage.value = ''

    if (!validateAll()) {
      return
    }

    try {
      await updatePasswordMutation.mutateAsync({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      })
      passwordForm.currentPassword = ''
      passwordForm.newPassword = ''
      passwordForm.confirmPassword = ''
      successMessage.value = 'パスワードを更新しました。'
    } catch (error) {
      errorMessage.value = extractPasswordValidationMessage(error)
    }
  }

  return {
    errorMessage,
    fieldErrors,
    forgotPasswordHref,
    getFieldError,
    markTouched,
    passwordForm,
    savePassword,
    successMessage,
    tabs,
    updatePasswordMutation
  }
}
