import { computed, ref } from 'vue'
import { extractProfileValidationMessage, useUpdateProfileMutation } from '@/features/session/profile'
import { profileUpdateFormSchema } from '@/lib/form-validation'
import { useServerSyncedForm } from '@/features/forms/composables/useServerSyncedForm'
import { useUserSettingsTabs } from './useUserSettingsTabs'

export function useUserSettingsGeneralTab() {
  const { sessionStore, tabs } = useUserSettingsTabs('general')
  const updateProfileMutation = useUpdateProfileMutation()
  const successMessage = ref('')
  const initialInput = computed(() => {
    const user = sessionStore.user
    return {
      name: [user?.lastName ?? '', user?.firstName ?? ''].filter(Boolean).join(' '),
      nameYomi: [user?.lastNameReading ?? '', user?.firstNameReading ?? ''].filter(Boolean).join(' '),
      contactEmail: user?.contactEmail ?? '',
      phoneNumber: user?.phoneNumber ?? '',
      currentPassword: ''
    }
  })
  const { form, submitEvent } = useServerSyncedForm({
    schema: profileUpdateFormSchema,
    input: initialInput,
    source: () => sessionStore.user,
    sourceKey: () => sessionStore.user?.id ?? null,
    errorMessage: extractProfileValidationMessage,
    saveInput: async (input) => {
      await updateProfileMutation.mutateAsync({ ...input, displayName: input.name })
      return { input: initialInput.value, sourceKey: sessionStore.user?.id ?? null }
    },
    onSaved: () => {
      successMessage.value = 'プロフィールを更新しました。'
    }
  })
  async function saveProfile(event?: Event) {
    event?.preventDefault()
    successMessage.value = ''
    await submitEvent()
  }
  return {
    form,
    saveProfile,
    successMessage,
    tabs,
    updateProfileMutation,
    errorMessage: computed(() => form.errors?.[0] ?? ''),
    studentId: computed(() => sessionStore.user?.studentId ?? ''),
    univemail: computed(() => sessionStore.user?.univemail ?? '')
  }
}
