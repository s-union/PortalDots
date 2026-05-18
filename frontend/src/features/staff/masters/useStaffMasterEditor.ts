import { type ComputedRef, type Ref, computed, ref, watch } from 'vue'
import { extractValidationMessage } from '@/lib/api/validation'

export interface StaffMasterEditorConfig<TEntity extends { id: string }> {
  entity: ComputedRef<TEntity | null> | Ref<TEntity | null>
  createMutation: {
    mutateAsync(variables: unknown): Promise<unknown>
    isPending: { value: boolean }
  }
  updateMutation: {
    mutateAsync(variables: unknown): Promise<unknown>
    isPending: { value: boolean }
  }
  deleteMutation: {
    mutateAsync(id: string): Promise<unknown>
    isPending: { value: boolean }
  }
  resetFields: () => void
  validate: () => boolean
  buildCreatePayload: () => unknown
  buildUpdatePayload: () => TEntity
  deleteConfirmMessage: string | ((entity: TEntity) => string)
  successCreateMessage: string
  successUpdateMessage: string
  errorFallbackMessage: string
  onSaved: () => void
  onDeleted: () => void
}

export function useStaffMasterEditor<TEntity extends { id: string }>(config: StaffMasterEditorConfig<TEntity>) {
  const errorMessage = ref('')
  const successMessage = ref('')

  watch(
    () => config.entity.value,
    () => {
      config.resetFields()
      errorMessage.value = ''
      successMessage.value = ''
    },
    { immediate: true }
  )

  async function handleSave() {
    errorMessage.value = ''
    successMessage.value = ''

    if (!config.validate()) {
      return
    }

    try {
      if (config.entity.value) {
        await config.updateMutation.mutateAsync(config.buildUpdatePayload())
        successMessage.value = config.successUpdateMessage
      } else {
        await config.createMutation.mutateAsync(config.buildCreatePayload())
        config.resetFields()
        successMessage.value = config.successCreateMessage
      }
      config.onSaved()
    } catch (error) {
      errorMessage.value = extractValidationMessage(error, config.errorFallbackMessage)
    }
  }

  async function handleDelete() {
    const entity = config.entity.value
    if (!entity) {
      return
    }

    const message =
      typeof config.deleteConfirmMessage === 'function'
        ? config.deleteConfirmMessage(entity)
        : config.deleteConfirmMessage

    if (typeof window !== 'undefined' && !window.confirm(message)) {
      return
    }

    errorMessage.value = ''
    successMessage.value = ''

    try {
      await config.deleteMutation.mutateAsync(entity.id)
      config.onDeleted()
    } catch (error) {
      errorMessage.value = extractValidationMessage(error, config.errorFallbackMessage)
    }
  }

  const isSaving = computed(() => config.createMutation.isPending.value || config.updateMutation.isPending.value)

  const isDeleting = computed(() => config.deleteMutation.isPending.value)

  return { errorMessage, successMessage, handleSave, handleDelete, isSaving, isDeleting }
}
