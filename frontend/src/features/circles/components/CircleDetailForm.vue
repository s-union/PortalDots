<script setup lang="ts">
import { computed } from 'vue'
import * as v from 'valibot'
import type { FormStore } from '@formisch/vue'
import SchemaFormEditor from '@/features/forms/components/SchemaFormEditor.vue'
import {
  buildAnswerFormSchema,
  answerFormFieldPaths,
  answerFormStructureKey,
  type AnswerFormSchema
} from '@/features/forms/answer-form-schema'
import {
  buildCircleDetailFormInput,
  buildCircleDetailFormSchema,
  type CircleDetailFormSchema,
  type CircleDetailFormOutput
} from '@/features/circles/circle-detail-form'
import type { CircleDetail } from '@/features/circles/api'

const { detail, disabled, saveCircle } = defineProps<{
  detail: CircleDetail
  disabled: boolean
  saveCircle: (input: CircleDetailFormOutput, answers: AnswerFormSchema) => Promise<CircleDetail | null>
}>()
const emit = defineEmits<{ 'update:dirty': [dirty: boolean]; saved: [continueAfterSave: boolean] }>()
defineSlots<{ default(props: { schema: AnswerFormSchema; form: FormStore<CircleDetailFormSchema> }): unknown }>()
const answers = computed(() => buildAnswerFormSchema(detail.questions))
const schema = computed(() => buildCircleDetailFormSchema(answers.value))
const input = computed(() => buildCircleDetailFormInput(detail, answers.value))
const focusOrder = computed(() => [
  ...(['name', 'nameYomi', 'groupName', 'groupNameYomi', 'notes'] as const).map((key) => ['basic', key] as const),
  ...answerFormFieldPaths(answers.value)
])
let continueAfterSave = false
async function saveInput(input: CircleDetailFormOutput, event: SubmitEvent, schema: CircleDetailFormSchema) {
  continueAfterSave = event.submitter?.getAttribute('value') === 'continue'
  const answers = v.getMetadata(schema).answers
  const saved = await saveCircle(input, answers)
  return saved ? { input: buildCircleDetailFormInput(saved, answers), sourceKey: saved.id } : null
}
</script>

<template>
  <SchemaFormEditor
    :schema="schema"
    :input="input"
    :source="detail"
    :source-key="detail.id"
    :structure-key="answerFormStructureKey(answers)"
    :disabled="disabled"
    :focus-order="focusOrder"
    :save-input="saveInput"
    @update:dirty="emit('update:dirty', $event)"
    @saved="emit('saved', continueAfterSave)"
    v-slot="{ schema: activeSchema, form }"
  >
    <slot :schema="v.getMetadata(activeSchema).answers" :form="form" />
  </SchemaFormEditor>
</template>
