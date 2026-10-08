import { computed, shallowRef, watch } from 'vue'
import { getDeepErrorEntries, reset } from '@formisch/vue'
import {
  extractContactValidationMessage,
  extractContactFileValidationMessage,
  useContactCategoriesQuery,
  useSubmitContactMutation
} from '@/features/contact/api'
import { useSessionStore } from '@/features/session/store'
import { useUnsavedChangesGuard } from '@/features/forms/composables/useUnsavedChangesGuard'
import { useSubmitForm } from '@/features/forms/composables/useSubmitForm'
import { contactFormSchema } from '@/lib/form-validation'

export function useContactForm(options: { focusAttachment: () => void }) {
  const sessionStore = useSessionStore()
  const categoriesQuery = useContactCategoriesQuery()
  const submitContactMutation = useSubmitContactMutation()
  const selectedFile = shallowRef<File | null>(null)
  const fileError = shallowRef('')
  const serverFileError = shallowRef('')
  const {
    form,
    successMessage,
    errorMessage,
    submitEvent: submit
  } = useSubmitForm({
    schema: contactFormSchema,
    initialInput: { categoryId: '', ccSubleader: true, body: '' },
    disabled: () => categoriesQuery.isPending.value,
    errorMessage: extractContactValidationMessage,
    submit: async (input) => {
      if (fileError.value) return
      try {
        const result = await submitContactMutation.mutateAsync({
          ...input,
          subject:
            categoriesQuery.data.value?.find((category) => category.id === input.categoryId)?.name ?? 'お問い合わせ',
          file: selectedFile.value ?? undefined
        })
        reset(form)
        selectedFile.value = null
        return `「${result.categoryName}」に問い合わせを送信しました。`
      } catch (error) {
        serverFileError.value = extractContactFileValidationMessage(error)
        throw error
      }
    }
  })
  const submitErrorMessage = computed(() => (serverFileError.value ? '' : errorMessage.value))
  const inputDisabled = computed(() => submitContactMutation.isPending.value)
  useUnsavedChangesGuard(computed(() => form.isDirty || selectedFile.value !== null))
  watch(selectedFile, () => {
    serverFileError.value = ''
  })
  async function submitEvent(event: SubmitEvent) {
    event.preventDefault()
    if (form.isSubmitting || categoriesQuery.isPending.value) return
    await submit(event)
    if (!getDeepErrorEntries(form).some(({ path }) => path.length) && (fileError.value || serverFileError.value))
      options.focusAttachment()
  }
  return {
    sessionStore,
    categoriesQuery,
    form,
    inputDisabled,
    submitErrorMessage,
    successMessage,
    selectedFile,
    fileError,
    serverFileError,
    submitEvent
  }
}
