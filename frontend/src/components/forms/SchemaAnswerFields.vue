<script setup lang="ts">
import { computed } from 'vue'
import type { FormStore } from '@formisch/vue'
import { SchemaFormFields } from '@/features/forms/schema-form'
import type { FieldOverrides } from '@/features/forms/schema-form'
import UploadAnswerControl from './UploadAnswerControl.vue'
import type { FormAnswer } from '@/features/forms/answers'
import {
  getUploadAnswerElements,
  answerFormFieldPaths,
  type AnswerFormSchema,
  type AnswerFieldsSchema,
  type UploadAnswerElement
} from '@/features/forms/answer-form-schema'

const {
  schema,
  form,
  answer,
  disabled,
  selectedFiles,
  uploadPending,
  uploadErrorMessages,
  downloadHref,
  uploadButtonLabel = 'ファイルを追加',
  downloadLabel,
  wrapControls = false
} = defineProps<{
  schema: AnswerFormSchema
  // Loosely typed (not `FormStore<AnswerFormSchema>`): combined forms like circle registration pass
  // a wider store whose schema also has a `basic` group. Its `text`/`choices` groups still match
  // structurally, which is all Formisch's path-based `useField` needs at runtime.
  form: FormStore<AnswerFieldsSchema>
  answer: FormAnswer | null
  disabled: boolean
  selectedFiles: Record<string, File | null>
  uploadPending: boolean
  uploadErrorMessages: Record<string, string>
  downloadHref: (questionId: string) => string
  uploadButtonLabel?: string
  downloadLabel?: string
  wrapControls?: boolean
}>()

const emit = defineEmits<{
  upload: [questionId: string]
  fileChange: [questionId: string, file: File | null]
}>()
defineSlots<{ upload?(props: { element: UploadAnswerElement }): unknown }>()

const uploads = computed(() => getUploadAnswerElements(schema))
// See the `form` prop's comment: structurally compatible at runtime, but typed loosely to accept
// wider combined-schema stores, so `SchemaFormFields` needs the exact `AnswerFormSchema` store type.
const answerForm = computed(() => form as unknown as FormStore<AnswerFormSchema>)
const overrides = computed<FieldOverrides<AnswerFormSchema['entries']>>(() => {
  const result: FieldOverrides<AnswerFormSchema['entries']> = {}
  for (const [group, id] of answerFormFieldPaths(schema)) {
    result[`${group}.${id}`] = { wrapControl: wrapControls }
  }
  return result
})
</script>

<template>
  <!--
    'list' borders each top-level field/heading/upload like the original hand-written loop did;
    `requiredLabel="必須"` keeps that loop's required marker instead of the default `FormField` '*'.
  -->
  <SchemaFormFields
    :of="answerForm"
    :schema="schema"
    :disabled="disabled"
    :overrides="overrides"
    variant="list"
    required-label="必須"
  >
    <template v-for="element in uploads" :key="element.id" #[`slot:upload:${element.id}`]>
      <div class="grid min-w-0 gap-3">
        <div>
          <p class="text-base font-semibold text-body">
            {{ element.label }}
            <span v-if="element.required" class="ml-2 text-xs font-semibold text-danger">必須</span>
          </p>
          <p v-if="element.description" class="mt-2 whitespace-pre-wrap text-base leading-7 text-muted">
            {{ element.description }}
          </p>
        </div>
        <slot name="upload" :element="element">
          <UploadAnswerControl
            :element="element"
            :answer="answer"
            :disabled="disabled"
            :selected-file="selectedFiles[element.id]"
            :upload-button-label="uploadButtonLabel"
            :upload-pending="uploadPending"
            :upload-error-message="uploadErrorMessages[element.id]"
            :download-label="downloadLabel ?? (answer ? 'ダウンロード' : '表示')"
            :download-href="downloadHref"
            @upload="emit('upload', $event)"
            @file-change="(questionId, file) => emit('fileChange', questionId, file)"
          />
        </slot>
      </div>
    </template>
  </SchemaFormFields>
</template>
