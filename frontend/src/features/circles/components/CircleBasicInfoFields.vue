<script setup lang="ts">
import { watch } from 'vue'
import { Field, reset, type FormStore } from '@formisch/vue'
import type { CircleBasicInfoFormSchema } from '@/features/circles/circle-detail-form'
import type { CircleDetail } from '@/features/circles/api'
import FormField from '@/components/ui/FormField.vue'

const {
  form,
  detail,
  disabled,
  showLeader = true,
  namePlaceholder = '',
  notesPlaceholder = ''
} = defineProps<{
  form: FormStore<CircleBasicInfoFormSchema>
  detail: Pick<CircleDetail, 'leaderDisplayName' | 'canChangeGroupName' | 'groupName' | 'groupNameYomi'>
  disabled: boolean
  showLeader?: boolean
  namePlaceholder?: string
  notesPlaceholder?: string
}>()
watch(
  () => [form, detail] as const,
  ([form, detail]) => {
    if (detail.canChangeGroupName) return
    // Inherited names follow the server even after edits made under a previous participation type.
    reset(form, { path: ['basic', 'groupName'], initialInput: detail.groupName })
    reset(form, { path: ['basic', 'groupNameYomi'], initialInput: detail.groupNameYomi })
  },
  { immediate: true }
)
const textFields = [
  { key: 'name', label: '企画名', placeholder: '', groupName: false },
  { key: 'nameYomi', label: '企画名（よみ）', placeholder: 'ひらがなで入力', groupName: false },
  { key: 'groupName', label: '企画を出店する団体の名称', placeholder: '例: ○○サークル', groupName: true },
  { key: 'groupNameYomi', label: '企画を出店する団体の名称（よみ）', placeholder: 'ひらがなで入力', groupName: true }
] as const
</script>

<template>
  <div class="grid gap-4">
    <FormField v-if="showLeader" label="企画責任者" label-class="font-semibold">
      <input :value="detail.leaderDisplayName" disabled readonly name="leaderDisplayName" type="text" />
    </FormField>
    <Field v-for="item in textFields" :key="item.key" :of="form" :path="['basic', item.key]" v-slot="field">
      <FormField
        :label="item.label"
        label-class="font-semibold"
        :id="`circle-${item.key}`"
        :error="!disabled && (!item.groupName || detail.canChangeGroupName) && field.errors?.[0]"
        required
      >
        <input
          v-bind="field.props"
          v-model="field.input"
          :id="`circle-${item.key}`"
          :name="item.key"
          required
          type="text"
          :disabled="disabled || (item.groupName && !detail.canChangeGroupName)"
          :placeholder="item.key === 'name' ? namePlaceholder : item.placeholder"
          :class="{ 'border-danger': field.errors && !disabled && (!item.groupName || detail.canChangeGroupName) }"
          :aria-invalid="!!field.errors && !disabled && (!item.groupName || detail.canChangeGroupName)"
          :aria-describedby="
            field.errors && !disabled && (!item.groupName || detail.canChangeGroupName)
              ? `circle-${item.key}-error`
              : undefined
          "
        />
      </FormField>
    </Field>
    <p v-if="!detail.canChangeGroupName" class="text-base text-muted">
      <slot name="group-name-help">団体名は既存企画から引き継がれているため、この画面では変更できません。</slot>
    </p>
    <Field :of="form" :path="['basic', 'notes']" v-slot="field">
      <FormField label="備考" label-class="font-semibold" id="circle-notes" :error="!disabled && field.errors?.[0]">
        <textarea
          v-bind="field.props"
          v-model="field.input"
          :disabled="disabled"
          :aria-invalid="!!field.errors && !disabled"
          :aria-describedby="field.errors && !disabled ? 'circle-notes-error' : undefined"
          id="circle-notes"
          name="notes"
          rows="3"
          :placeholder="notesPlaceholder"
        />
      </FormField>
    </Field>
  </div>
</template>
