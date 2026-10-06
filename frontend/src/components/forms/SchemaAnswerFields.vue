<script setup lang="ts">
import { Field, type FormStore } from '@formisch/vue'
import { computed } from 'vue'
import CheckboxAnswerControl from './CheckboxAnswerControl.vue'
import TextAnswerControl from './TextAnswerControl.vue'
import UploadAnswerControl from './UploadAnswerControl.vue'
import FormError from '@/components/ui/FormError.vue'
import type { FormAnswer } from '@/features/forms/answers'
import {
  getAnswerFormElements,
  type AnswerFormSchema,
  type UploadAnswerFormElement
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
  downloadLabel
} = defineProps<{
  schema: AnswerFormSchema
  form: FormStore<AnswerFormSchema>
  answer: FormAnswer | null
  disabled: boolean
  selectedFiles: Record<string, File | null>
  uploadPending: boolean
  uploadErrorMessages: Record<string, string>
  downloadHref: (questionId: string) => string
  uploadButtonLabel?: string
  downloadLabel?: string
}>()

const emit = defineEmits<{
  upload: [questionId: string]
  fileChange: [questionId: string, file: File | null]
}>()
defineSlots<{ upload?(props: { element: UploadAnswerFormElement }): unknown }>()

const elements = computed(() => getAnswerFormElements(schema))
</script>

<template>
  <div class="grid gap-0">
    <div v-for="element in elements" :key="element.id" class="border-b border-border px-6 py-5 last:border-b-0">
      <template v-if="element.control === 'heading'">
        <h2 class="text-lg font-semibold text-body">{{ element.label }}</h2>
        <p v-if="element.description" class="mt-3 whitespace-pre-wrap text-base leading-7 text-muted">
          {{ element.description }}
        </p>
      </template>

      <div v-else class="grid gap-3">
        <div>
          <label :for="element.id" class="text-base font-semibold text-body">
            {{ element.label }}
            <span v-if="element.required" class="ml-2 text-xs font-semibold text-danger">必須</span>
          </label>
          <p
            v-if="element.description"
            :id="`${element.id}-description`"
            class="mt-2 whitespace-pre-wrap text-base leading-7 text-muted"
          >
            {{ element.description }}
          </p>
        </div>

        <slot v-if="element.control === 'upload'" name="upload" :element="element">
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

        <Field v-else-if="element.control === 'checkbox'" :of="form" :path="['choices', element.id]" v-slot="field">
          <CheckboxAnswerControl
            v-model="field.input"
            :element="element"
            :disabled="disabled"
            :field-props="field.props"
            :aria-invalid="!!field.errors"
            :aria-described-by="
              [element.description && `${element.id}-description`, field.errors && `${element.id}-error`]
                .filter(Boolean)
                .join(' ') || undefined
            "
          />
          <FormError v-if="field.errors" :id="`${element.id}-error`" :message="field.errors[0]" role="alert" />
        </Field>

        <Field v-else :of="form" :path="['text', element.id]" v-slot="field">
          <TextAnswerControl
            v-model="field.input"
            :element="element"
            :disabled="disabled"
            :field-props="field.props"
            :aria-invalid="!!field.errors"
            :aria-described-by="
              [element.description && `${element.id}-description`, field.errors && `${element.id}-error`]
                .filter(Boolean)
                .join(' ') || undefined
            "
          />
          <FormError v-if="field.errors" :id="`${element.id}-error`" :message="field.errors[0]" role="alert" />
        </Field>
      </div>
    </div>
  </div>
</template>
