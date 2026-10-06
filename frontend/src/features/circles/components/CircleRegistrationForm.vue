<script setup lang="ts">
import { computed } from 'vue'
import * as v from 'valibot'
import type { FormStore } from '@formisch/vue'
import SchemaFormEditor from '@/features/forms/components/SchemaFormEditor.vue'
import {
  answerFormFieldPaths,
  answerFormStructureKey,
  buildAnswerFormInput,
  buildAnswerFormSchema,
  type AnswerFormSchema
} from '@/features/forms/answer-form-schema'
import {
  buildCircleRegistrationFormInput,
  buildCircleRegistrationFormSchema,
  type CircleRegistrationFormOutput,
  type CircleRegistrationFormSchema
} from '@/features/circles/circle-registration-form'
import type { CircleDetail } from '@/features/circles/api'

const { registration, participationTypeId, defaultParticipationTypeId, disabled, saveCircle } = defineProps<{
  registration: CircleDetail | null
  participationTypeId: string
  defaultParticipationTypeId: string
  disabled: boolean
  saveCircle: (input: CircleRegistrationFormOutput, answers: AnswerFormSchema) => Promise<CircleDetail | null>
}>()
const emit = defineEmits<{ 'update:dirty': [dirty: boolean] }>()
defineSlots<{ default(props: { schema: AnswerFormSchema; form: FormStore<CircleRegistrationFormSchema> }): unknown }>()
const answers = computed(() => buildAnswerFormSchema(registration?.questions ?? []))
const schema = computed(() => buildCircleRegistrationFormSchema(answers.value))
const input = computed(() => buildCircleRegistrationFormInput(registration, answers.value, defaultParticipationTypeId))
const focusOrder = computed(() => [
  ...(['participationTypeId', 'name', 'nameYomi', 'groupName', 'groupNameYomi', 'notes'] as const).map(
    (key) => ['basic', key] as const
  ),
  ...answerFormFieldPaths(answers.value)
])
async function saveInput(
  input: CircleRegistrationFormOutput,
  _event: SubmitEvent,
  schema: CircleRegistrationFormSchema
) {
  const answers = v.getMetadata(schema).answers
  const saved = await saveCircle(input, answers)
  return saved
    ? {
        input: {
          basic: {
            name: saved.name,
            nameYomi: saved.nameYomi,
            groupName: saved.groupName,
            groupNameYomi: saved.groupNameYomi,
            participationTypeId: saved.participationTypeId,
            notes: saved.notes
          },
          ...buildAnswerFormInput(answers, saved.answer)
        },
        sourceKey: saved.id
      }
    : null
}
</script>

<template>
  <SchemaFormEditor
    :schema="schema"
    :input="input"
    :source="registration"
    :source-key="null"
    :structure-key="`${participationTypeId}/${answerFormStructureKey(answers)}`"
    :disabled="disabled"
    :focus-order="focusOrder"
    :save-input="saveInput"
    validate-on="input"
    @update:dirty="emit('update:dirty', $event)"
    v-slot="{ schema: activeSchema, form }"
  >
    <slot :schema="v.getMetadata(activeSchema).answers" :form="form" />
  </SchemaFormEditor>
</template>
