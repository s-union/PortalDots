<script setup lang="ts">
import { computed, watch, type Component } from 'vue'
import { SchemaFormFields } from '@/features/forms/schema-form'
import type { StaffFormQuestion, UpdateStaffFormQuestionPayload } from '@/features/staff/forms/api'
import { getQuestionTypeMeta } from '@/features/staff/forms/editor/useQuestionTypeMeta'
import { useQuestionEditForm } from '@/features/staff/forms/editor/useQuestionEditForm'
import { buildQuestionEditSchema } from '@/features/staff/forms/editor/question-edit-schema'
import FormError from '@/components/ui/FormError.vue'
import { buttonVariants } from '@/lib/ui/variants'
import PreviewHeading from './previews/PreviewHeading.vue'
import PreviewText from './previews/PreviewText.vue'
import PreviewNumber from './previews/PreviewNumber.vue'
import PreviewTextarea from './previews/PreviewTextarea.vue'
import PreviewMarkdown from './previews/PreviewMarkdown.vue'
import PreviewRadio from './previews/PreviewRadio.vue'
import PreviewSelect from './previews/PreviewSelect.vue'
import PreviewCheckbox from './previews/PreviewCheckbox.vue'
import PreviewUpload from './previews/PreviewUpload.vue'

const {
  question,
  saveQuestion,
  paused = false,
  structureDisabled = false,
  isOpen,
  draggable = false,
  isDragging = false,
  isDropTarget = false
} = defineProps<{
  question: StaffFormQuestion
  saveQuestion?: (payload: UpdateStaffFormQuestionPayload) => Promise<StaffFormQuestion>
  paused?: boolean
  structureDisabled?: boolean
  isOpen: boolean
  draggable?: boolean
  isDragging?: boolean
  isDropTarget?: boolean
}>()

const emit = defineEmits<{
  toggle: []
  delete: []
  dragStart: [event: DragEvent]
  dragEnd: []
  dragOver: [event: DragEvent]
  drop: [event: DragEvent]
  'update:dirty': [value: boolean]
  'update:pending': [value: boolean]
}>()

const { form, edit, requestSave } = useQuestionEditForm({
  question: () => question,
  paused: () => paused,
  save: async (payload) => (saveQuestion ? saveQuestion(payload) : null)
})
watch(
  () => form.isDirty,
  (dirty) => emit('update:dirty', dirty),
  { immediate: true, flush: 'sync' }
)
watch(
  () => form.isSubmitting,
  (pending) => emit('update:pending', pending),
  { immediate: true, flush: 'sync' }
)

function handleDeleteClick() {
  if (structureDisabled) return
  if (window.confirm('設問を削除すると、この設問に対する回答も全て削除されます。本当に削除しますか？')) {
    emit('delete')
  }
}

function handleDragStart(event: DragEvent) {
  if (!draggable) {
    event.preventDefault()
    return
  }

  if (event.dataTransfer) {
    event.dataTransfer.setData('text/plain', edit.value.id)
    if (event.currentTarget instanceof HTMLElement) event.dataTransfer.setDragImage(event.currentTarget, 24, 12)
    event.dataTransfer.effectAllowed = 'move'
  }
  emit('dragStart', event)
}

const typeMeta = computed(() => getQuestionTypeMeta(edit.value.type))
const parsedOptions = computed(() => edit.value.options)
// Type-dependent fields/labels/helpers/placeholders and which fields apply to this question's
// type come from the schema itself (`fieldUi`/`formLayout`); this component only supplies the
// preview, drag & drop and delete-confirmation chrome around it.
const schema = computed(() => buildQuestionEditSchema(question))

const previewComponent = computed<Component>(() => {
  switch (edit.value.type) {
    case 'heading':
      return PreviewHeading
    case 'text':
      return PreviewText
    case 'number':
      return PreviewNumber
    case 'textarea':
      return PreviewTextarea
    case 'markdown':
      return PreviewMarkdown
    case 'radio':
      return PreviewRadio
    case 'select':
      return PreviewSelect
    case 'checkbox':
      return PreviewCheckbox
    case 'upload':
      return PreviewUpload
    default:
      return PreviewText
  }
})

const previewProps = computed<Record<string, unknown>>(() => {
  const base = {
    name: edit.value.name,
    description: edit.value.description
  }
  switch (edit.value.type) {
    case 'heading':
      return base
    case 'text':
      return { ...base, isRequired: edit.value.isRequired, type: edit.value.type }
    case 'number':
      return {
        ...base,
        isRequired: edit.value.isRequired,
        numberMin: edit.value.numberMin,
        numberMax: edit.value.numberMax
      }
    case 'textarea':
    case 'markdown':
      return { ...base, isRequired: edit.value.isRequired }
    case 'radio':
    case 'select':
    case 'checkbox':
      return { ...base, isRequired: edit.value.isRequired, options: parsedOptions.value }
    case 'upload':
      return { ...base, isRequired: edit.value.isRequired, allowedTypes: edit.value.allowedTypes }
    default:
      return { ...base, isRequired: edit.value.isRequired, type: 'text' as const }
  }
})
</script>

<template>
  <article
    class="group relative border border-transparent bg-surface transition-[border-color,box-shadow,opacity] duration-200"
    style="border-left-width: 5px"
    :class="{
      'cursor-pointer hover:border-primary hover:rounded-[5px] hover:z-20': !isOpen,
      'z-[15] rounded-[5px] border-primary shadow-none': isOpen,
      'opacity-60': isDragging,
      'ring-2 ring-primary/30': isDropTarget
    }"
    @dragover.prevent="emit('dragOver', $event)"
    @drop.prevent="emit('drop', $event)"
  >
    <div
      :role="isOpen ? undefined : 'button'"
      :tabindex="isOpen ? undefined : 0"
      :aria-expanded="isOpen ? undefined : false"
      class="px-6 py-4"
      :class="{ 'cursor-pointer': !isOpen }"
      @click="!isOpen && emit('toggle')"
      @keydown.enter.prevent="!isOpen && emit('toggle')"
      @keydown.space.prevent="!isOpen && emit('toggle')"
    >
      <div class="absolute inset-x-0 top-0 flex justify-center">
        <span
          class="cursor-move select-none px-2 py-0.5 text-sm leading-none text-muted-2 opacity-0 transition-opacity group-hover:opacity-100"
          :draggable="draggable"
          title="ドラッグで並び替え"
          @dragstart="handleDragStart"
          @dragend="emit('dragEnd')"
        >
          ⠿⠿
        </span>
      </div>

      <div class="mb-3 flex items-center justify-between gap-4">
        <span class="text-xs text-muted-2">{{ typeMeta.label }}</span>
        <button v-if="isOpen" class="text-xs text-muted-2 hover:text-body" type="button" @click.stop="emit('toggle')">
          ▲ 閉じる
        </button>
      </div>

      <div class="pointer-events-none select-none">
        <component :is="previewComponent" v-bind="previewProps" />
      </div>
    </div>

    <form
      v-show="isOpen"
      novalidate
      class="border-t border-border px-6 py-4"
      style="background: var(--color-surface-light); box-shadow: inset 0 0.2rem 0.8rem -0.6rem var(--color-box-shadow)"
      @submit.prevent="requestSave"
    >
      <p class="mb-4 border-b border-border pb-2 text-base font-bold text-body">{{ typeMeta.label }}</p>
      <FormError v-for="error in form.errors" :key="error" :message="error" role="alert" />

      <div class="space-y-3">
        <!--
          Text-like fields autosave on blur; the `isRequired` checkbox autosaves immediately on
          change instead (there is no "commit on blur" moment for a checkbox click). `@vue/test-utils`'s
          `setValue()` fires both `input` and `change` (for `v-model.lazy` support) on every kind of
          control, so `@field-change` must stay scoped to `isRequired` to avoid an extra premature
          save on every text-field edit.
        -->
        <SchemaFormFields
          :of="form"
          :schema="schema"
          @field-blur="(key) => key !== 'isRequired' && requestSave()"
          @field-change="(key) => key === 'isRequired' && requestSave()"
        />

        <div class="grid items-center gap-x-4 border-t border-border pt-3 sm:grid-cols-[8rem_1fr]">
          <span></span>
          <div class="flex items-center justify-between gap-4">
            <div class="flex flex-wrap gap-2">
              <slot name="move-actions" />
            </div>
            <div class="flex items-center gap-4">
              <button
                :class="buttonVariants({ variant: 'secondary', size: 'xs' })"
                type="submit"
                :disabled="form.isSubmitting"
              >
                {{ form.isSubmitting ? '保存中...' : '保存' }}
              </button>
              <button
                class="text-base text-danger hover:underline"
                type="button"
                :disabled="structureDisabled"
                @click="handleDeleteClick"
              >
                この項目を削除
              </button>
            </div>
          </div>
        </div>
      </div>
    </form>
  </article>
</template>
