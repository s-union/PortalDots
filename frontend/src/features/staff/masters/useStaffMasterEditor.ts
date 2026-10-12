import { computed, ref, toValue, watch, type MaybeRefOrGetter } from 'vue'
import type * as v from 'valibot'
import { extractValidationMessage } from '@/lib/api/validation'
import {
  useServerSyncedForm,
  type SyncedFormSchema,
  type SchemaFormInput
} from '@/features/forms/composables/useServerSyncedForm'

export function useStaffMasterEditor<T extends SyncedFormSchema, TEntity extends { id: string }>(config: {
  entity: MaybeRefOrGetter<TEntity | null>
  schema: T
  input: (entity: TEntity | null) => SchemaFormInput<T>
  create: (input: v.InferOutput<T>) => Promise<TEntity>
  update: (entity: TEntity, input: v.InferOutput<T>) => Promise<TEntity>
  deleteMutation: { mutateAsync(id: string): Promise<unknown>; isPending: { value: boolean } }
  deleteConfirmMessage: (entity: TEntity) => string
  successCreateMessage: string
  successUpdateMessage: string
  errorFallbackMessage: string
  onSaved: () => void
  onDeleted: () => void
}) {
  const successMessage = ref('')
  const deleteError = ref('')
  const sourceKey = () => {
    const entity = toValue(config.entity)
    return entity ? `entity:${entity.id}` : 'new'
  }
  watch(sourceKey, () => {
    successMessage.value = ''
    deleteError.value = ''
  })
  const { form, submitEvent } = useServerSyncedForm({
    schema: config.schema,
    input: () => config.input(toValue(config.entity)),
    source: () => toValue(config.entity),
    sourceKey,
    disabled: () => config.deleteMutation.isPending.value,
    errorMessage: (error) => extractValidationMessage(error, config.errorFallbackMessage),
    saveInput: async (input) => {
      const entity = toValue(config.entity)
      const saved = entity ? await config.update(entity, input) : await config.create(input)
      return { input: config.input(entity ? saved : null), sourceKey: entity ? `entity:${entity.id}` : 'new' }
    },
    onSaved: () => {
      successMessage.value = toValue(config.entity) ? config.successUpdateMessage : config.successCreateMessage
      config.onSaved()
    }
  })
  async function handleSave() {
    deleteError.value = ''
    successMessage.value = ''
    await submitEvent()
  }
  async function handleDelete() {
    const entity = toValue(config.entity)
    if (!entity || form.isSubmitting || config.deleteMutation.isPending.value) return
    if (!window.confirm(config.deleteConfirmMessage(entity))) return
    deleteError.value = ''
    successMessage.value = ''
    try {
      await config.deleteMutation.mutateAsync(entity.id)
      if (toValue(config.entity)?.id !== entity.id) return
      config.onDeleted()
    } catch (error) {
      if (toValue(config.entity)?.id !== entity.id) return
      deleteError.value = extractValidationMessage(error, config.errorFallbackMessage)
    }
  }
  return {
    form,
    successMessage,
    handleSave,
    handleDelete,
    errorMessage: computed(() => deleteError.value || form.errors?.[0] || ''),
    isSaving: computed(() => form.isSubmitting),
    isDeleting: computed(() => config.deleteMutation.isPending.value)
  }
}
