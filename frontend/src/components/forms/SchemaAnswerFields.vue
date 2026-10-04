<script setup lang="ts">
import { Field, type FormStore } from '@formisch/vue'
import { computed } from 'vue'
import FormAnswerControl from './FormAnswerControl.vue'
import FormError from '@/components/ui/FormError.vue'
import type { FormAnswer } from '@/features/forms/answers'
import { getAnswerFormElements, type AnswerFormSchema } from '@/features/forms/answer-form-schema'

const { schema, form, answer, disabled, selectedFiles, uploadPending, uploadErrorMessages, downloadHref } =
  defineProps<{
    schema: AnswerFormSchema
    form: FormStore<AnswerFormSchema>
    answer: FormAnswer | null
    disabled: boolean
    selectedFiles: Record<string, File | null>
    uploadPending: boolean
    uploadErrorMessages: Record<string, string>
    downloadHref: (questionId: string) => string
  }>()

const emit = defineEmits<{
  upload: [questionId: string]
  fileChange: [questionId: string, file: File | null]
}>()

const elements = computed(() => getAnswerFormElements(schema))

function fieldValue(input: unknown): string | string[] {
  if (typeof input === 'string') {
    return input
  }
  return Array.isArray(input) ? input.filter((item): item is string => typeof item === 'string') : ''
}
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

        <FormAnswerControl
          v-if="element.control === 'upload'"
          model-value=""
          :element="element"
          :answer="answer"
          :disabled="disabled"
          :selected-file="selectedFiles[element.id]"
          upload-button-label="ファイルを追加"
          :upload-pending="uploadPending"
          :upload-error-message="uploadErrorMessages[element.id]"
          :download-label="answer ? 'ダウンロード' : '表示'"
          :download-href="downloadHref"
          @upload="emit('upload', $event)"
          @file-change="(questionId, file) => emit('fileChange', questionId, file)"
        />

        <Field v-else :of="form" :path="[element.id]" v-slot="field">
          <div @focusin="field.props.onFocus" @focusout="field.props.onBlur" @change="field.props.onChange">
            <FormAnswerControl
              :model-value="fieldValue(field.input)"
              :element="element"
              :answer="answer"
              :disabled="disabled"
              :download-href="downloadHref"
              :register-input="field.props.ref"
              :aria-invalid="!!field.errors"
              :aria-described-by="
                [element.description && `${element.id}-description`, field.errors && `${element.id}-error`]
                  .filter(Boolean)
                  .join(' ') || undefined
              "
              @update:model-value="field.input = $event"
            />
          </div>
          <FormError v-if="field.errors" :id="`${element.id}-error`" :message="field.errors[0]" role="alert" />
        </Field>
      </div>
    </div>
  </div>
</template>
