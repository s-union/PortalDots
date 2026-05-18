<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef } from 'vue'
import PageMarkdownContent from '@/features/pages/components/PageMarkdownContent.vue'
import FaIcon from '@/components/ui/FaIcon.vue'
import { cn } from '@/lib/ui/cn'
import { formControlVariants } from '@/lib/ui/variants'

const model = defineModel<string>({ required: true })

const {
  disabled = false,
  guideHref = '/staff/markdown-guide',
  minHeightClass = 'min-h-[20em]',
  name,
  placeholder = ''
} = defineProps<{
  disabled?: boolean
  guideHref?: string
  minHeightClass?: string
  name: string
  placeholder?: string
}>()

const previewVisible = ref(false)
const textareaRef = useTemplateRef<HTMLTextAreaElement>('textarea')

const charCount = computed(() => model.value.length)

function focusTextarea() {
  textareaRef.value?.focus()
}

async function updateSelection(start: number, end: number) {
  await nextTick()
  textareaRef.value?.focus()
  textareaRef.value?.setSelectionRange(start, end)
}

function selectedRange() {
  const textarea = textareaRef.value
  if (!textarea) {
    return { start: model.value.length, end: model.value.length, selectedText: '' }
  }

  const start = textarea.selectionStart ?? 0
  const end = textarea.selectionEnd ?? start
  return {
    start,
    end,
    selectedText: model.value.slice(start, end)
  }
}

function replaceSelection(replacement: string, selectionStart: number, selectionEnd: number) {
  const { start, end } = selectedRange()
  model.value = `${model.value.slice(0, start)}${replacement}${model.value.slice(end)}`
  void updateSelection(selectionStart, selectionEnd)
}

function wrapSelection(prefix: string, suffix: string, fallback: string) {
  const { start, end, selectedText } = selectedRange()
  const content = selectedText || fallback
  const replacement = `${prefix}${content}${suffix}`
  const cursorStart = start + prefix.length
  const cursorEnd = cursorStart + content.length
  replaceSelection(replacement, cursorStart, cursorEnd)
}

function prefixLines(prefix: string) {
  const { start, end, selectedText } = selectedRange()
  const content = selectedText || '項目'
  const replacement = content
    .split('\n')
    .map((line) => `${prefix}${line}`)
    .join('\n')
  replaceSelection(replacement, start, start + replacement.length)
}

function insertTable() {
  const { start } = selectedRange()
  const replacement = '| 列1 | 列2 |\n| --- | --- |\n| 内容1 | 内容2 |'
  model.value = `${model.value.slice(0, start)}${replacement}${model.value.slice(start)}`
  void updateSelection(start, start + replacement.length)
}

function togglePreview() {
  previewVisible.value = !previewVisible.value
}

interface ToolbarAction {
  key: string
  label: string
  iconClass: string
  action: () => void
}

const toolbarActions: ToolbarAction[] = [
  { key: 'title', label: '見出し', iconClass: 'fas fa-heading', action: () => prefixLines('# ') },
  { key: 'bold', label: '太字', iconClass: 'fas fa-bold', action: () => wrapSelection('**', '**', '太字') },
  { key: 'italic', label: '斜体', iconClass: 'fas fa-italic', action: () => wrapSelection('*', '*', '強調') },
  {
    key: 'strike',
    label: '取消',
    iconClass: 'fas fa-strikethrough',
    action: () => wrapSelection('~~', '~~', '取り消し')
  },
  { key: 'quote', label: '引用', iconClass: 'fas fa-quote-right', action: () => prefixLines('> ') },
  { key: 'ul', label: '箇条書き', iconClass: 'fas fa-list-ul', action: () => prefixLines('- ') },
  { key: 'ol', label: '番号', iconClass: 'fas fa-list-ol', action: () => prefixLines('1. ') },
  {
    key: 'link',
    label: 'リンク',
    iconClass: 'fas fa-link',
    action: () => wrapSelection('[', '](https://example.com)', 'リンク文字列')
  },
  { key: 'table', label: '表', iconClass: 'fas fa-table', action: insertTable }
]
</script>

<template>
  <div class="overflow-hidden rounded-lg border border-border bg-surface shadow-lv1">
    <!-- Toolbar -->
    <div class="flex flex-wrap items-center gap-1 border-b border-border bg-surface-2 px-2 py-2">
      <button
        v-for="action in toolbarActions"
        :key="action.key"
        :disabled="disabled"
        type="button"
        class="inline-flex items-center justify-center rounded px-2 py-1.5 text-[0.85rem] text-muted transition hover:bg-surface hover:text-body disabled:opacity-40"
        :title="action.label"
        @click="(action.action(), focusTextarea())"
      >
        <FaIcon :icon-class="action.iconClass" />
      </button>

      <span class="mx-1 h-4 w-px bg-border" />

      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded px-2 py-1.5 text-[0.8rem] text-muted transition hover:bg-surface hover:text-body"
        :class="previewVisible && 'bg-primary-light text-primary hover:bg-primary-light hover:text-primary'"
        @click="togglePreview"
      >
        <FaIcon name="eye" />
        プレビュー
      </button>

      <a
        class="ml-auto inline-flex items-center gap-1 text-xs text-muted transition hover:text-primary"
        :href="guideHref"
        rel="noopener noreferrer"
        target="_blank"
      >
        <FaIcon name="question-circle" />
        Markdown ガイド
      </a>
    </div>

    <!-- Editor -->
    <div class="relative">
      <textarea
        ref="textarea"
        v-model="model"
        :aria-label="name"
        :class="
          cn(
            formControlVariants(),
            'min-h-[20em] w-full resize-y border-0 bg-transparent px-4 py-3 focus:ring-0',
            minHeightClass
          )
        "
        :disabled="disabled"
        :name="name"
        :placeholder="placeholder"
      />

      <!-- Preview -->
      <div v-if="previewVisible" class="absolute inset-0 overflow-y-auto border-t border-border bg-surface px-4 py-4">
        <div class="mb-2 flex items-center justify-between">
          <span class="text-xs font-semibold text-muted">プレビュー</span>
          <button type="button" class="text-xs text-muted transition hover:text-body" @click="togglePreview">
            <FaIcon name="times" class-name="mr-1" />
            閉じる
          </button>
        </div>
        <PageMarkdownContent :source="model" />
      </div>
    </div>

    <!-- Footer -->
    <div class="flex items-center justify-between border-t border-border bg-surface-2 px-3 py-1.5 text-xs text-muted">
      <span>{{ charCount.toLocaleString() }} 文字</span>
      <span>Markdown 対応</span>
    </div>
  </div>
</template>
