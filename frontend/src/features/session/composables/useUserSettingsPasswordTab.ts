import { reset } from '@formisch/vue'
import { extractPasswordValidationMessage, useUpdatePasswordMutation } from '@/features/session/password'
import { passwordChangeFormSchema } from '@/lib/form-validation'
import { useSubmitForm } from '@/features/forms/composables/useSubmitForm'
import { useUserSettingsTabs } from './useUserSettingsTabs'

export function useUserSettingsPasswordTab() {
  const { tabs } = useUserSettingsTabs('password')
  const updatePasswordMutation = useUpdatePasswordMutation()
  const { form, errorMessage, successMessage, submitEvent } = useSubmitForm({
    schema: passwordChangeFormSchema,
    initialInput: { currentPassword: '', newPassword: '', confirmPassword: '' },
    errorMessage: extractPasswordValidationMessage,
    submit: async (input) => {
      await updatePasswordMutation.mutateAsync(input)
      reset(form)
      return 'パスワードを更新しました。'
    }
  })
  return { form, errorMessage, successMessage, savePassword: submitEvent, tabs, updatePasswordMutation }
}
