<script setup lang="ts">
import { computed, watch } from 'vue'
import * as v from 'valibot'
import { reset, type FormStore } from '@formisch/vue'
import { SchemaFormFields, type FieldOverrides, type LayoutItem } from '@/features/forms/schema-form'
import { circleBasicInfoSchema, type CircleBasicInfoFormSchema } from '@/features/circles/circle-detail-form'
import type { CircleDetail } from '@/features/circles/api'

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

defineSlots<{ 'group-name-help'?(): unknown }>()

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

// `circleBasicInfoSchema` alone (always "required") is the rendering schema in both the editable
// and the locked-group-name cases: label/placeholder/id metadata is identical either way, and the
// *validation* schema that actually differs when locked lives in `circle-detail-form.ts`'s
// `lockedGroupNameEntries` (used to build the real combined form schema, not this component's).
const schema = v.object({ basic: circleBasicInfoSchema })
// The real form's schema also carries a `participationTypeId`/answers group this component
// doesn't render; structurally compatible at runtime for the `basic.*` fields below (mirrors
// `SchemaAnswerFields.vue`'s `form`-widening pattern).
const widenedForm = computed(() => form as unknown as FormStore<typeof schema>)

const overrides = computed<FieldOverrides<typeof schema.entries>>(() => ({
  'basic.name': { placeholder: namePlaceholder },
  'basic.groupName': { disabled: !detail.canChangeGroupName },
  'basic.groupNameYomi': { disabled: !detail.canChangeGroupName },
  'basic.notes': { placeholder: notesPlaceholder }
}))

const layoutItems = computed<readonly LayoutItem[]>(() => [
  ...(showLeader ? [{ display: 'leaderDisplayName', label: '企画責任者' }] : []),
  'basic.name',
  'basic.nameYomi',
  'basic.groupName',
  'basic.groupNameYomi',
  { slot: 'group-name-help' },
  'basic.notes'
])
</script>

<template>
  <div class="grid gap-4">
    <SchemaFormFields
      :of="widenedForm"
      :schema="schema"
      :disabled="disabled"
      :overrides="overrides"
      :display-values="{ leaderDisplayName: detail.leaderDisplayName }"
      :layout="layoutItems"
    >
      <template #[`slot:group-name-help`]>
        <p v-if="!detail.canChangeGroupName" class="text-base text-muted">
          <slot name="group-name-help">団体名は既存企画から引き継がれているため、この画面では変更できません。</slot>
        </p>
      </template>
    </SchemaFormFields>
  </div>
</template>
