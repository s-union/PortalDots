<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import type { StaffFormQuestion } from '@/features/staff/forms/api'
import { getQuestionTypeMeta } from '@/features/staff/forms/editor/useQuestionTypeMeta'
import { inputValue, textareaValue } from '@/lib/dom'

const {
  question: _question,
  edit,
  isOpen,
  draggable = false,
  isDragging = false,
  isDropTarget = false
} = defineProps<{
  question: StaffFormQuestion
  edit: StaffFormQuestion
  isOpen: boolean
  draggable?: boolean
  isDragging?: boolean
  isDropTarget?: boolean
}>()

const emit = defineEmits<{
  toggle: []
  save: []
  delete: []
  dragStart: [event: DragEvent]
  dragEnd: []
  dragOver: [event: DragEvent]
  drop: [event: DragEvent]
  'update:edit': [value: StaffFormQuestion]
}>()

function buildEditValue(patch: Partial<StaffFormQuestion>) {
  return {
    ...edit,
    ...(showOptions.value ? { options: normalizeOptions(optionsDraft.value) } : {}),
    ...patch
  }
}

function update<K extends keyof StaffFormQuestion>(field: K, value: StaffFormQuestion[K]) {
  emit('update:edit', buildEditValue({ [field]: value }))
}

const optionsDraft = ref('')

function normalizeOptions(raw: string) {
  return [
    ...new Set(
      raw
        .split('\n')
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
    )
  ]
}

function updateOptions(raw: string) {
  optionsDraft.value = raw
}

function updateNumber(field: 'numberMin' | 'numberMax', event: Event) {
  const target = event.target
  if (!(target instanceof HTMLInputElement)) {
    return
  }

  emit(
    'update:edit',
    buildEditValue({
      [field]: target.value === '' ? null : Number(target.value)
    })
  )
}

async function handleOptionsBlur(event: Event) {
  const target = event.target
  if (!(target instanceof HTMLTextAreaElement)) {
    return
  }

  const nextOptions = normalizeOptions(target.value)
  optionsDraft.value = nextOptions.join('\n')
  emit('update:edit', buildEditValue({ options: nextOptions }))
  await nextTick()
  emit('save')
}

function handleDeleteClick() {
  if (window.confirm('設問を削除すると、この設問に対する回答も全て削除されます。本当に削除しますか？')) {
    emit('delete')
  }
}

function handleRequiredChange(event: Event) {
  const target = event.target
  if (!(target instanceof HTMLInputElement)) {
    return
  }

  update('isRequired', target.checked)
  emit('save')
}

function handleDragStart(event: DragEvent) {
  if (!draggable) {
    event.preventDefault()
    return
  }

  if (event.dataTransfer) {
    event.dataTransfer.setData('text/plain', edit.id)
    event.dataTransfer.setDragImage(event.currentTarget as HTMLElement, 24, 12)
    event.dataTransfer.effectAllowed = 'move'
  }
  emit('dragStart', event)
}

watch(
  () => edit.options,
  (options) => {
    optionsDraft.value = options.join('\n')
  },
  { immediate: true, deep: true }
)

const typeMeta = computed(() => getQuestionTypeMeta(edit.type))
const parsedOptions = computed(() => [...new Set(edit.options.filter((item) => item.trim().length > 0))])
const showRequired = computed(() => edit.type !== 'heading')
const showOptions = computed(() => ['radio', 'select', 'checkbox'].includes(edit.type))
const showAllowedTypes = computed(() => edit.type === 'upload')
const showNumberMin = computed(() => ['text', 'number', 'checkbox'].includes(edit.type))
const showNumberMax = computed(() => ['text', 'number', 'checkbox'].includes(edit.type))
const nameLabel = computed(() => (edit.type === 'heading' ? '見出し' : '設問名'))
const numberMinLabel = computed(() => {
  if (edit.type === 'text') {
    return '最小文字数'
  }
  if (edit.type === 'number') {
    return '最低数'
  }
  if (edit.type === 'checkbox') {
    return '最低選択数'
  }
  return null
})
const numberMaxLabel = computed(() => {
  if (edit.type === 'text') {
    return '最大文字数'
  }
  if (edit.type === 'number') {
    return '最大数'
  }
  if (edit.type === 'checkbox') {
    return '最大選択数'
  }
  return null
})

const inputClass =
  'w-full rounded border border-border bg-form-control px-3 py-2 text-sm text-body outline-none transition focus:border-primary focus:focus-ring-primary'
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
      role="button"
      :tabindex="isOpen ? -1 : 0"
      :aria-expanded="isOpen"
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
        <template v-if="edit.type === 'heading'">
          <h2 class="text-2xl font-bold text-body">{{ edit.name || '(無題のセクション見出し)' }}</h2>
          <p v-if="edit.description" class="mt-2 whitespace-pre-wrap text-sm leading-7 text-muted">
            {{ edit.description }}
          </p>
        </template>

        <template v-else>
          <div class="mb-2 flex items-center gap-2">
            <span class="font-medium text-body">{{ edit.name || '(無題の設問)' }}</span>
            <span v-if="edit.isRequired" class="rounded bg-danger px-1.5 py-0.5 text-xs font-bold text-white">
              必須
            </span>
          </div>
          <p v-if="edit.description" class="mb-2 whitespace-pre-wrap text-sm leading-7 text-muted">
            {{ edit.description }}
          </p>
        </template>

        <input
          v-if="edit.type === 'text'"
          class="w-full rounded border border-border bg-form-control px-3 py-2 text-sm text-muted"
          type="text"
          placeholder="一行入力"
          readonly
          tabindex="-1"
        />
        <input
          v-else-if="edit.type === 'number'"
          class="w-full rounded border border-border bg-form-control px-3 py-2 text-sm text-muted"
          type="number"
          placeholder="整数入力"
          readonly
          tabindex="-1"
        />
        <textarea
          v-else-if="edit.type === 'textarea'"
          class="min-h-28 w-full rounded border border-border bg-form-control px-3 py-2 text-sm text-muted"
          placeholder="複数行入力"
          readonly
          rows="3"
          tabindex="-1"
        />
        <template v-else-if="edit.type === 'radio'">
          <div v-if="parsedOptions.length > 0" class="grid gap-2">
            <label v-for="option in parsedOptions" :key="option" class="flex items-center gap-3 text-sm text-body">
              <input type="radio" tabindex="-1" />
              <span>{{ option }}</span>
            </label>
          </div>
          <div v-else class="empty-option">
            <p class="font-semibold text-body">選択肢がありません。</p>
            <p class="mt-1 text-sm text-muted">選択肢を1つ以上入力してください。</p>
          </div>
        </template>
        <template v-else-if="edit.type === 'select'">
          <select
            class="w-full rounded border border-border bg-form-control px-3 py-2 text-sm text-muted"
            tabindex="-1"
          >
            <option v-if="parsedOptions.length === 0">（選択肢なし）</option>
            <option v-for="option in parsedOptions" :key="option" :value="option">{{ option }}</option>
          </select>
        </template>
        <template v-else-if="edit.type === 'checkbox'">
          <div v-if="parsedOptions.length > 0" class="grid gap-2">
            <label v-for="option in parsedOptions" :key="option" class="flex items-center gap-3 text-sm text-body">
              <input type="checkbox" tabindex="-1" />
              <span>{{ option }}</span>
            </label>
          </div>
          <div v-else class="empty-option">
            <p class="font-semibold text-body">選択肢がありません。</p>
            <p class="mt-1 text-sm text-muted">選択肢を1つ以上入力してください。</p>
          </div>
        </template>
        <div
          v-else-if="edit.type === 'upload'"
          class="rounded border border-dashed border-border bg-form-control px-4 py-5 text-sm text-muted"
        >
          ファイルを選択
          <span v-if="edit.allowedTypes" class="ml-2 text-xs">（{{ edit.allowedTypes }}）</span>
        </div>
      </div>
    </div>

    <div
      v-show="isOpen"
      class="border-t border-border px-6 py-4"
      style="background: var(--color-surface-light); box-shadow: inset 0 0.2rem 0.8rem -0.6rem var(--color-box-shadow)"
    >
      <p class="mb-4 border-b border-border pb-2 text-sm font-bold text-body">{{ typeMeta.label }}</p>

      <div class="space-y-3">
        <div v-if="showRequired" class="grid items-start gap-x-4 sm:grid-cols-[8rem_1fr]">
          <span class="pt-1 text-sm text-body sm:text-right">回答必須か</span>
          <label class="flex items-center gap-2 text-sm text-body">
            <input type="checkbox" :checked="edit.isRequired" @change="handleRequiredChange" />
            <span>この設問への回答は必須</span>
          </label>
        </div>

        <div class="grid items-start gap-x-4 sm:grid-cols-[8rem_1fr]">
          <span class="pt-2 text-sm text-body sm:text-right">{{ nameLabel }}</span>
          <input
            :class="inputClass"
            :value="edit.name"
            type="text"
            @input="update('name', inputValue($event))"
            @blur="emit('save')"
          />
        </div>

        <div class="grid items-start gap-x-4 sm:grid-cols-[8rem_1fr]">
          <span class="pt-2 text-sm text-body sm:text-right">説明</span>
          <textarea
            :class="inputClass + ' min-h-24'"
            :value="edit.description"
            @input="update('description', textareaValue($event))"
            @blur="emit('save')"
          />
        </div>

        <div v-if="showOptions" class="grid items-start gap-x-4 sm:grid-cols-[8rem_1fr]">
          <span class="pt-2 text-sm text-body sm:text-right">選択肢</span>
          <div>
            <textarea
              :class="inputClass + ' min-h-24'"
              :value="optionsDraft"
              placeholder="1行に1つ選択肢を入力"
              @input="updateOptions(textareaValue($event))"
              @blur="handleOptionsBlur"
            />
            <p class="mt-1 text-xs text-muted">改行区切りで選択肢を入力。</p>
          </div>
        </div>

        <div v-if="showNumberMin && numberMinLabel" class="grid items-start gap-x-4 sm:grid-cols-[8rem_1fr]">
          <span class="pt-2 text-sm text-body sm:text-right">{{ numberMinLabel }}</span>
          <input
            :class="inputClass"
            :value="edit.numberMin ?? ''"
            min="0"
            type="number"
            @input="updateNumber('numberMin', $event)"
            @blur="emit('save')"
          />
        </div>

        <div v-if="showNumberMax && numberMaxLabel" class="grid items-start gap-x-4 sm:grid-cols-[8rem_1fr]">
          <span class="pt-2 text-sm text-body sm:text-right">{{ numberMaxLabel }}</span>
          <input
            :class="inputClass"
            :value="edit.numberMax ?? ''"
            min="0"
            type="number"
            @input="updateNumber('numberMax', $event)"
            @blur="emit('save')"
          />
        </div>

        <div v-if="showAllowedTypes" class="grid items-start gap-x-4 sm:grid-cols-[8rem_1fr]">
          <span class="pt-2 text-sm text-body sm:text-right">
            許可される拡張子<br /><code class="text-xs">|</code>区切りで指定
          </span>
          <div>
            <input
              :class="inputClass"
              :value="edit.allowedTypes"
              placeholder="例: png|jpg|jpeg|gif"
              type="text"
              @input="update('allowedTypes', inputValue($event))"
              @blur="emit('save')"
            />
            <p class="mt-1 text-xs text-muted">画像アップロードを許可したい場合: <code>png|jpg|jpeg|gif</code></p>
          </div>
        </div>

        <div class="grid items-center gap-x-4 border-t border-border pt-3 sm:grid-cols-[8rem_1fr]">
          <span></span>
          <div class="flex items-center justify-between gap-4">
            <div class="flex flex-wrap gap-2">
              <slot name="move-actions" />
            </div>
            <button class="text-sm text-danger hover:underline" type="button" @click="handleDeleteClick">
              この項目を削除
            </button>
          </div>
        </div>
      </div>
    </div>
  </article>
</template>

<style scoped>
.empty-option {
  padding-top: 0.25rem;
}
</style>
